import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { sendWhatsAppMessage, formatCRMTaskMessage } from '@/lib/whatsappService';
import { generateTasklistKode } from '@/lib/generateKode';

export const runtime = 'nodejs';

// Request/Response interfaces
interface CreateTasklistCRMPayload {
  id_project: string;      // ID project dari myCRM (untuk lookup di proyek.crmId)
  id_crm: string;          // ID task dari myCRM (disimpan di tasklist.idCrm)
  id_dep?: string;         // ID DEP (optional, disimpan di tasklist.idDep)
  id_modul_logbook?: number | string; // (optional) ID modul Logbook (proyek_module.id) hasil mapping kategori CRM. Bila valid, tasklist masuk ke modul ini; bila tidak, fallback ke modul 'tasklist_crm'.
  tanggal: string;         // Format: YYYY-MM-DD atau ISO string
  keterangan?: string;     // Deskripsi task (optional)
  version?: string;        // Versi BA/Blueprint (optional, auto-detect dari Blueprint jika tidak diisi)
}

interface TasklistCRMResponse {
  item: {
    id: number;
    projectId: number;
    moduleId: number;
    pegawaiId: number;
    scheduleAt: Date;
    keterangan: string | null;
    kode: string;
    statusCode: number;
    status: string;
    idCrm?: string;
    idDep?: string;
  };
}

// Ensure log table exists without requiring Prisma migrations (safe, non-destructive)
async function ensureLogTable() {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS public.tasklist_log (
        id SERIAL PRIMARY KEY,
        "taskId" INT NOT NULL,
        waktu TIMESTAMP NOT NULL DEFAULT NOW(),
        "userId" INT NOT NULL,
        keterangan TEXT NULL,
        status TEXT NULL,
        action TEXT NOT NULL
      );`
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_task_waktu ON public.tasklist_log ("taskId", waktu DESC);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_user ON public.tasklist_log ("userId");`);
  } catch {
    // ignore non-fatal
  }
}
// Ensure id_crm and id_dep columns exist on tasklist (runtime-safe)
async function ensureTasklistIdCrmColumn() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS id_crm TEXT NULL;`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS id_dep TEXT NULL;`
    );
    // Optional indexes if needed in the future
    // await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_id_crm ON public.tasklist (id_crm);`);
    // await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_id_dep ON public.tasklist (id_dep);`);
  } catch (e) {
    // non-fatal; creation will proceed without id_crm/id_dep if ALTER fails
    console.error('ensureTasklistIdCrmColumn failed (non-fatal)', e);
  }
}

const codeToStatus = (code: number | null | undefined): any => {
  switch (code) {
    case 1: return 'MENUNGGU_PROSES_USER';
    case 2: return 'SEDANG_DIPROSES_USER';
    case 3: return 'MENUNGGU_REVIEW_PM';
    case 4: return 'SELESAI';
    default: return 'MENUNGGU_PROSES_USER';
  }
};

// POST /api/tasklistcrm
// Body (application/json): { id_project: string, id_crm: string, tanggal: string(YYYY-MM-DD or ISO), keterangan?: string }
export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    let payload: CreateTasklistCRMPayload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const idProject = payload?.id_project;
    const idCrm = payload?.id_crm;
    const idDep = payload?.id_dep;
    const idModulLogbookRaw = payload?.id_modul_logbook;
    const tanggalRaw = payload?.tanggal;
    const keteranganRaw = payload?.keterangan;
    const versionRaw = payload?.version ? String(payload.version).trim() : null;

    if (!idProject || !idCrm || !tanggalRaw) {
      return NextResponse.json({ error: 'id_project, id_crm, dan tanggal wajib diisi' }, { status: 400 });
    }

    // Validate id_project is not empty
    const projectCrmId = String(idProject).trim();
    if (!projectCrmId) {
      return NextResponse.json({ error: 'id_project tidak boleh kosong' }, { status: 400 });
    }

    // Validate id_crm is not empty
    const taskIdCrm = String(idCrm).trim();
    if (!taskIdCrm) {
      return NextResponse.json({ error: 'id_crm tidak boleh kosong' }, { status: 400 });
    }

    // Optional id_dep
    const taskIdDep = idDep ? String(idDep).trim() : null;

    // Parse date (date-only string or ISO)
    let scheduleAt: Date;
    const s = String(tanggalRaw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      // Build local date at 00:00 to avoid TZ shifts
      const [y, m, d] = s.split('-').map((v: string) => Number(v));
      scheduleAt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    } else {
      const dt = new Date(s);
      if (isNaN(dt.getTime())) return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 });
      scheduleAt = dt;
    }

    const keterangan: string | null = keteranganRaw ? String(keteranganRaw) : null;

    // Ensure id_crm column exists first
    await ensureTasklistIdCrmColumn();

    // Check if task with this id_crm already exists (prevent duplicates)
    // Use FOR UPDATE to lock the row and prevent race condition
    const existingTask = await prisma.$queryRaw`
      SELECT * FROM public.tasklist WHERE id_crm = ${taskIdCrm} LIMIT 1
    `;

    if (existingTask && Array.isArray(existingTask) && existingTask.length > 0) {
      console.log(`[CRM Task] Task with id_crm "${taskIdCrm}" already exists, skipping insert`);
      return NextResponse.json({
        item: existingTask[0],
        message: 'Task already exists with this id_crm',
        skipped: true
      });
    }

    // Resolve project by id_project (lookup in proyek.crmId)
    const proyek = await prisma.proyek.findFirst({
      where: { crmId: projectCrmId },
    });

    if (!proyek) {
      return NextResponse.json({
        error: 'Project tidak ditemukan',
        details: `Project dengan id_project "${projectCrmId}" tidak ditemukan di database`
      }, { status: 404 });
    }

    // Resolve version: gunakan yang dikirim, atau auto-detect dari Blueprint terbaru, fallback ke '1.0.0'
    let resolvedVersion = '1.0.0';
    let resolvedBaId: number | null = null;  // Track which bacara this version came from
    
    if (versionRaw) {
      resolvedVersion = versionRaw;
    } else {
      // Cari semua Bacara type BLUEPRINT untuk project ini
      const blueprints = await prisma.bacara.findMany({
        where: { projectId: proyek.id, type: 'BLUEPRINT' },
        select: { id: true, version: true },
      });

      if (blueprints.length > 0) {
        // Sort semver secara descending, ambil yang terbesar
        const sorted = blueprints
          .map((b) => ({ id: b.id, version: b.version || '1.0.0' }))
          .sort((a, b) => {
            const pa = a.version.split('.').map(Number);
            const pb = b.version.split('.').map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
              const diff = (pb[i] || 0) - (pa[i] || 0);
              if (diff !== 0) return diff;
            }
            return 0;
          });
        resolvedVersion = sorted[0].version;
        resolvedBaId = sorted[0].id;  // Track the bacara ID
        console.log(`[CRM Task] Auto-detected version "${resolvedVersion}" from Blueprint (baId: ${resolvedBaId}) for project ${proyek.kodeProyek}`);
      } else {
        console.log(`[CRM Task] No Blueprint found for project ${proyek.kodeProyek}, using default version "${resolvedVersion}"`);
      }
    }

    // Resolve target module:
    // 1) Jika myCRM kirim id_modul_logbook (hasil mapping kategori) dan modul tsb VALID
    //    (ada di DB & milik project yang sama) -> pakai modul tersebut.
    // 2) Selain itu (tidak dikirim / tidak ditemukan / bukan milik project) -> fallback
    //    ke perilaku lama: cari/buat modul root bernama 'tasklist_crm'.
    let modul: Awaited<ReturnType<typeof prisma.proyekModule.findFirst>> = null;

    // Parse id_modul_logbook (boleh number atau string numerik)
    let idModulLogbook: number | null = null;
    if (idModulLogbookRaw !== undefined && idModulLogbookRaw !== null && String(idModulLogbookRaw).trim() !== '') {
      const n = Number(idModulLogbookRaw);
      if (Number.isFinite(n) && n > 0) idModulLogbook = Math.trunc(n);
    }

    if (idModulLogbook !== null) {
      const found = await prisma.proyekModule.findUnique({ where: { id: idModulLogbook } });
      if (found && found.projectId === proyek.id) {
        modul = found;
        
        // Update ba_id if not set and we have resolved bacara
        if (!modul.baId && resolvedBaId) {
          modul = await prisma.proyekModule.update({
            where: { id: modul.id },
            data: { 
              baId: resolvedBaId,
              baVersion: resolvedVersion 
            }
          });
          console.log(`[CRM Task] Updated module id=${modul.id} with baId=${resolvedBaId} and version=${resolvedVersion}`);
        }
        
        console.log(`[CRM Task] Using mapped module id=${found.id} nama="${found.nama}" for project ${proyek.kodeProyek}`);
      } else {
        // Tidak valid -> fallback ke tasklist_crm (sesuai aturan PM: kalau tidak ada mapping, pakai default)
        console.warn(`[CRM Task] id_modul_logbook=${idModulLogbook} tidak valid untuk project ${proyek.kodeProyek}; fallback ke modul 'tasklist_crm'`);
      }
    }

    // Fallback: cari/buat modul root 'tasklist_crm' untuk project ini
    if (!modul) {
      modul = await prisma.proyekModule.findFirst({
        where: {
          projectId: proyek.id,
          nama: { equals: 'tasklist_crm', mode: 'insensitive' as const },
          parentId: null  // Root module
        },
      });

      // If module exists but doesn't have ba_id, update it
      if (modul && !modul.baId && resolvedBaId) {
        modul = await prisma.proyekModule.update({
          where: { id: modul.id },
          data: { 
            baId: resolvedBaId,
            baVersion: resolvedVersion 
          }
        });
        console.log(`[CRM Task] Updated existing tasklist_crm module with baId=${resolvedBaId} and version=${resolvedVersion}`);
      }

      // If module doesn't exist, create it
      if (!modul) {
        try {
          // Get next order number for root modules
          const maxOrder = await prisma.proyekModule.aggregate({
            where: { projectId: proyek.id, parentId: null },
            _max: { order: true }
          });
          const nextOrder = (maxOrder._max.order || 0) + 1;
          const kode = String(nextOrder).padStart(2, '0');

          modul = await prisma.proyekModule.create({
            data: {
              projectId: proyek.id,
              parentId: null,
              nama: 'tasklist_crm',
          kode,
              order: nextOrder,
              depth: 0,
              isLeaf: true,
              baId: resolvedBaId || undefined,  // Link to bacara if available
              baVersion: resolvedVersion,  // Set version from resolved blueprint
            }
          });

          console.log(`[CRM Task] Created module 'tasklist_crm' with kode ${kode} (baId: ${resolvedBaId}) for project ${proyek.kodeProyek}`);
        } catch (e) {
          console.error('[CRM Task] Failed to create module:', e);
          return NextResponse.json({
            error: 'Gagal membuat modul',
            details: `Gagal membuat modul tasklist_crm untuk project ${proyek.kodeProyek} - ${proyek.namaProyek}`
          }, { status: 500 });
        }
      }
    }

    // Resolve PM (first team member with jabatan contains 'pm')
    const pmTeam = await prisma.proyekTeam.findFirst({
      where: { projectId: proyek.id, jabatan: { contains: 'pm', mode: 'insensitive' } },
      orderBy: { id: 'asc' },
    });
    if (!pmTeam) {
      return NextResponse.json({
        error: 'PM tidak ditemukan',
        details: `PM tidak ditemukan untuk project ${proyek.kodeProyek} - ${proyek.namaProyek}`
      }, { status: 404 });
    }

    // Type guard: pada titik ini `modul` pasti tidak null (sudah di-resolve / di-create di blok di atas).
    if (!modul) {
      return NextResponse.json({
        error: 'Modul tidak ter-resolve',
        details: `Tidak dapat menentukan modul untuk project ${proyek.kodeProyek}`
      }, { status: 500 });
    }

    const projectId = proyek.id;
    const moduleId = modul.id;
    const pegawaiId = pmTeam.pegawaiId;

    // Generate kode with date-based format
    const taskCode = await generateTasklistKode(prisma);
    const created = await prisma.$transaction(async (tx) => {
      // Lock module row to prevent concurrent task code generation
      await tx.$queryRaw`SELECT id FROM public.proyek_module WHERE id = ${moduleId} FOR UPDATE`;

      // Create task with id_crm in single operation
      const newTask = await (tx.tasklist as any).create({
        data: {
          projectId,
          moduleId,
          pegawaiId,
          createdBy: pegawaiId,
          scheduleAt,
          keterangan,
          imagePath: null,
          kode: taskCode,
          statusCode: 1,
          status: codeToStatus(1),
          baVersion: resolvedVersion,
          version: resolvedVersion,
        }
      });

      // Set id_crm and id_dep immediately
      await tx.$executeRaw`UPDATE public.tasklist SET id_crm = ${taskIdCrm} WHERE id = ${newTask.id}`;

      if (taskIdDep) {
        await tx.$executeRaw`UPDATE public.tasklist SET id_dep = ${taskIdDep} WHERE id = ${newTask.id}`;
      }

      // Return the created task
      return newTask;
    });

    // Fetch final task with id_crm and id_dep
    const finalTask = await prisma.tasklist.findUnique({
      where: { id: (created as any).id }
    });

    if (finalTask) {
      (created as any).idCrm = finalTask.idCrm;
      (created as any).idDep = finalTask.idDep;
    }

    // Log creation
    try {
      await ensureLogTable();
      const nowTs = new Date();
      await prisma.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action)
        VALUES (${(created as any).id}, (${nowTs}::timestamptz AT TIME ZONE 'Asia/Jakarta')::timestamp, ${session?.id || 0}, ${'Tasklist CRM dibuat'}, ${created.status as any}, 'CREATE')`;
    } catch (e) {
      console.error('TasklistLog insert (create CRM) failed', e);
    }

    // Send WA notification to PM: inform this task came from CRM and ask to adjust module/user
    try {
      // Fetch PM details (phone, name)
      const pm = await prisma.pegawai.findUnique({ where: { id: pegawaiId }, select: { namaLengkap: true, noHp: true } });

      if (pm?.noHp) {
        // Build message using centralized formatter
        const when = new Date(scheduleAt);
        const dd = String(when.getDate()).padStart(2, '0');
        const mm = String(when.getMonth() + 1).padStart(2, '0');
        const yyyy = when.getFullYear();
        const tanggal = `${dd}-${mm}-${yyyy}`;

        const message = formatCRMTaskMessage({
          kode: taskCode,
          proyekNama: proyek.namaProyek,
          proyekKode: proyek.kodeProyek,
          modulePath: modul.kode || modul.nama,
          pmNama: pm.namaLengkap || 'PM',
          tanggal,
          keterangan: keterangan || undefined
        });

        await sendWhatsAppMessage({
          to: pm.noHp,
          message,
          taskId: (created as any).id,
          notificationType: 'task_created'
        });

        console.log(`[CRM Task] WhatsApp notification sent to PM: ${pm.namaLengkap} for task: ${taskCode}`);
      }
    } catch (e) {
      console.error('[CRM Task] WA notify failed', e);
    }

    return NextResponse.json({ item: created });
  } catch (e) {
    console.error('POST /api/tasklistcrm error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
