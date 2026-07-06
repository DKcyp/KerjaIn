import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSessionFromCookieHeader } from "@/lib/auth";

const prismaClient = prisma; // Alias to avoid confusion if needed

// GET - List all projects for blueprint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const namaProyek = searchParams.get("namaProyek");
    const client = searchParams.get("client");

    // Ambil data session user yang sedang login
    const cookieHeader = request.headers.get("cookie");
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: "Sesi tidak ditemukan" }, { status: 401 });
    }

    // Query SQL Raw ala CI - SUPER_ADMIN/PM/ADMIN bisa lihat semua, PROGRAMMER hanya yang dikerjakan
    let sql = "";
    if (session.role === 'SUPER_ADMIN' || session.role === 'PM' || session.role === 'ADMIN') {
      sql = `
        SELECT p.id, p."namaProyek", p.client, p."kodeProyek", p."createdAt", p."updatedAt",
          (
            SELECT COUNT(*) FROM bacara b
            WHERE b."projectId" = p.id
              AND b.type = 'BLUEPRINT'
              AND NOT (b.status = 'DRAFT' AND b.sumber = 'LOGBOOK')
          )::int AS "blueprintCount",
          (
            SELECT MAX(b."createdAt") FROM bacara b
            WHERE b."projectId" = p.id
              AND b.type = 'BLUEPRINT'
              AND NOT (b.status = 'DRAFT' AND b.sumber = 'LOGBOOK')
          ) AS "latestBlueprintDate"
        FROM proyek p
        WHERE 1=1
      `;
    } else {
      sql = `
        SELECT DISTINCT p.id, p."namaProyek", p.client, p."kodeProyek", p."createdAt", p."updatedAt",
          (
            SELECT COUNT(*) FROM bacara b
            WHERE b."projectId" = p.id
              AND b.type = 'BLUEPRINT'
              AND NOT (b.status = 'DRAFT' AND b.sumber = 'LOGBOOK')
          )::int AS "blueprintCount",
          (
            SELECT MAX(b."createdAt") FROM bacara b
            WHERE b."projectId" = p.id
              AND b.type = 'BLUEPRINT'
              AND NOT (b.status = 'DRAFT' AND b.sumber = 'LOGBOOK')
          ) AS "latestBlueprintDate"
        FROM proyek p
        INNER JOIN proyek_team pt ON p.id = pt."projectId"
        WHERE pt."pegawaiId" = ${session.id}
      `;
    }

    if (projectId) {
      sql += ` AND p.id = ${parseInt(projectId)}`;
    }

    if (namaProyek) {
      sql += ` AND p."namaProyek" ILIKE '%${namaProyek}%'`;
    }

    if (client) {
      sql += ` AND p.client ILIKE '%${client}%'`;
    }

    sql += ` ORDER BY "latestBlueprintDate" DESC NULLS LAST, p.id DESC`;

    // Eksekusi query raw
    const projects = await prisma.$queryRawUnsafe(sql);

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data proyek",
      },
      { status: 500 }
    );
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { namaProyek, client, kodeProyek } = body;

    // Validate required fields
    if (!namaProyek || !kodeProyek) {
      return NextResponse.json(
        {
          success: false,
          error: "Nama proyek dan kode proyek wajib diisi",
        },
        { status: 400 }
      );
    }

    // Check if kodeProyek already exists using RAW SQL
    const checkSql = `SELECT id FROM proyek WHERE "kodeProyek" = '${kodeProyek}' LIMIT 1`;
    const existing: any[] = await prisma.$queryRawUnsafe(checkSql);

    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "Kode proyek sudah digunakan" }, { status: 400 });
    }

    // Get max noUrut using RAW SQL
    const maxSql = `SELECT MAX("noUrut") as max_urut FROM proyek`;
    const maxRes: any[] = await prisma.$queryRawUnsafe(maxSql);
    const newNoUrut = (maxRes[0]?.max_urut || 0) + 1;

    // Create project using RAW SQL
    const insertSql = `
      INSERT INTO proyek ("namaProyek", "kodeProyek", client, "noUrut", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, "namaProyek", "kodeProyek", client
    `;
    
    const newProject: any[] = await prisma.$queryRawUnsafe(insertSql, namaProyek, kodeProyek, client || null, newNoUrut);

    return NextResponse.json({
      success: true,
      data: newProject[0],
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create project",
      },
      { status: 500 }
    );
  }
}

// PUT - Update project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, namaProyek, client, kodeProyek } = body;

    // Validate required fields
    if (!projectId || !namaProyek || !kodeProyek) {
      return NextResponse.json(
        {
          success: false,
          error: "Project ID, nama proyek, dan kode proyek wajib diisi",
        },
        { status: 400 }
      );
    }

    // Check if project exists using RAW SQL
    const checkExistSql = `SELECT id FROM proyek WHERE id = $1 LIMIT 1`;
    const existRes: any[] = await prisma.$queryRawUnsafe(checkExistSql, projectId);

    if (existRes.length === 0) {
      return NextResponse.json({ success: false, error: "Project tidak ditemukan" }, { status: 404 });
    }

    // Check if kodeProyek is used by another project using RAW SQL
    const duplicateSql = `SELECT id FROM proyek WHERE "kodeProyek" = $1 AND id != $2 LIMIT 1`;
    const dupRes: any[] = await prisma.$queryRawUnsafe(duplicateSql, kodeProyek, projectId);

    if (dupRes.length > 0) {
      return NextResponse.json({ success: false, error: "Kode proyek sudah digunakan oleh project lain" }, { status: 400 });
    }

    // Update project using RAW SQL
    const updateSql = `
      UPDATE proyek 
      SET "namaProyek" = $1, "kodeProyek" = $2, client = $3, "updatedAt" = NOW()
      WHERE id = $4
      RETURNING id, "namaProyek", "kodeProyek", client
    `;
    
    const updatedProject: any[] = await prisma.$queryRawUnsafe(updateSql, namaProyek, kodeProyek, client || null, projectId);

    return NextResponse.json({
      success: true,
      data: updatedProject[0],
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update project",
      },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete project (set isActive to false)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "Project ID is required",
        },
        { status: 400 }
      );
    }

    // Check if project exists using RAW SQL
    const checkSql = `SELECT id FROM proyek WHERE id = $1 LIMIT 1`;
    const existing: any[] = await prisma.$queryRawUnsafe(checkSql, parseInt(projectId));

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Project tidak ditemukan" }, { status: 404 });
    }

    // Soft delete using RAW SQL
    const deleteSql = `UPDATE proyek SET "updatedAt" = NOW() WHERE id = $1`;
    await prisma.$executeRawUnsafe(deleteSql, parseInt(projectId));

    return NextResponse.json({
      success: true,
      message: "Project berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete project",
      },
      { status: 500 }
    );
  }
}
