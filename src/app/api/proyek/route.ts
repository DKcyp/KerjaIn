import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, hasPermission } from '@/lib/auth';

// Request/Response interfaces
interface CreateProjectPayload {
  kodeProyek: string;
  namaProyek: string;
  crmId?: string | null;
  idDep?: string | null;
  depNama?: string | null;
  projectNamaCrm?: string | null;
  type?: 'BLUEPRINT' | 'DEVELOPMENT' | 'SUPPORT' | 'CLOSED';
  client?: string | null;
  teamId?: number | null;
  idDeployment?: string | null;
}

interface ProjectResponse {
  id: number;
  kodeProyek: string;
  namaProyek: string;
  crmId?: string | null;
  idDep?: string | null;
  type: string;
  noUrut: number;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/proyek - list projects (PM sees only projects they PM)
export async function GET(req: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check removed - users can only see projects they're assigned to anyway

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Base filter for active projects
    const baseFilter = activeOnly ? { isActive: true } : {};

    // Filter based on role - PM/PROGRAMMER see only their projects
    if (session.user.role === 'PM' || session.user.role === 'PROGRAMMER') {
      const uid = Number(session.user.id);
      const team = await prisma.proyekTeam.findMany({
        where: { pegawaiId: uid },
        select: { projectId: true },
      });
      const ids = Array.from(new Set(team.map((t) => t.projectId))).filter((n) => Number.isFinite(n));
      if (ids.length === 0) return NextResponse.json({ items: [] });
      const rows = await prisma.proyek.findMany({ where: { id: { in: ids }, ...baseFilter }, orderBy: { noUrut: 'asc' } });
      return NextResponse.json({ items: rows });
    }
    // Other roles: return all projects
    const rows = await prisma.proyek.findMany({ where: { ...baseFilter }, orderBy: { noUrut: 'asc' } });
    return NextResponse.json({ items: rows });
  } catch (e) {
    console.error('GET /api/proyek error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/proyek - create project with next noUrut
export async function POST(req: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPermission(session.user.id, 'project.create'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    let payload: CreateProjectPayload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const kodeProyek = String(payload?.kodeProyek || '').trim();
    const namaProyek = String(payload?.namaProyek || '').trim();
    const crmId = payload?.crmId ? String(payload.crmId).trim() : null;
    const idDep = payload?.idDep ? String(payload.idDep).trim() : null;
    const depNama = payload?.depNama ? String(payload.depNama).trim() : null;
    const projectNamaCrm = payload?.projectNamaCrm ? String(payload.projectNamaCrm).trim() : null;
    const type = payload?.type || 'DEVELOPMENT';
    const client = payload?.client ? String(payload.client).trim() : null;
    const teamId = payload?.teamId ? Number(payload.teamId) : undefined;
    const idDeployment = payload?.idDeployment ? String(payload.idDeployment).trim() : undefined;

    if (!kodeProyek || !namaProyek) {
      return NextResponse.json({ error: 'kodeProyek and namaProyek are required' }, { status: 400 });
    }

    // Validate type
    const validTypes: Array<'BLUEPRINT' | 'DEVELOPMENT' | 'SUPPORT' | 'CLOSED'> = ['BLUEPRINT', 'DEVELOPMENT', 'SUPPORT', 'CLOSED'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid project type' }, { status: 400 });
    }

    // Check if crmId already exists (manual validation before insert)
    if (crmId) {
      const existingProject = await prisma.proyek.findFirst({
        where: { crmId },
        select: { id: true, kodeProyek: true, namaProyek: true }
      });

      if (existingProject) {
        return NextResponse.json({
          error: 'crmId already exists',
          details: `Project with crmId "${crmId}" already exists: ${existingProject.kodeProyek} - ${existingProject.namaProyek}`
        }, { status: 409 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const max = await tx.proyek.aggregate({ _max: { noUrut: true } });
      const nextNoUrut = (max._max.noUrut || 0) + 1;

      const createData: any = {
        kodeProyek,
        namaProyek,
        crmId,
        idDep,
        depNama,
        projectNamaCrm,
        type,
        noUrut: nextNoUrut,
        client,
        idDeployment,
        depId: session?.user?.departemenId ?? null
      };

      if (teamId) {
        createData.team = { connect: { id: teamId } };
      }

      const created = await tx.proyek.create({ data: createData });

      // if creator is PM, auto-assign to proyekTeam as PM
      if (session.user?.role === 'PM') {
        const pmId = Number(session.user.id);
        if (Number.isFinite(pmId)) {
          await tx.proyekTeam.create({
            data: {
              projectId: created.id,
              pegawaiId: pmId,
              jabatan: 'PM',
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json({ item: result });
  } catch (e: any) {
    console.error('POST /api/proyek error', e);
    if (e?.code === 'P2002') {
      // Check which field caused the unique constraint violation
      const target = e?.meta?.target;
      if (target?.includes('crmId')) {
        return NextResponse.json({ error: 'crmId already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'kodeProyek or noUrut must be unique' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
