import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const FILE_PREFIX = '__file__:';

/**
 * Remove null bytes (\x00) from strings — PostgreSQL UTF-8 rejects them.
 * Also trims leading/trailing whitespace.
 */
export function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/\x00/g, '').trim();
}

export function sanitizeStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  // eslint-disable-next-line no-control-regex
  return typeof value === 'string' ? value.replace(/\x00/g, '').trim() || null : null;
}

export async function parseAndUploadRows(
  formData: FormData,
  projectId: number
): Promise<any[]> {
  const rowsJson = formData.get('rows') as string;
  if (!rowsJson) {
    throw new Error('Field "rows" (JSON string) wajib ada di FormData');
  }

  const rows = JSON.parse(rowsJson);
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'blueprint');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  for (const row of rows) {
    if (row.taskName) row.taskName = sanitizeString(row.taskName);
    if (row.keterangan) row.keterangan = sanitizeStringOrNull(row.keterangan);

    if (row.gambar && typeof row.gambar === 'string' && row.gambar.startsWith(FILE_PREFIX)) {
      const fileKey = row.gambar.slice(FILE_PREFIX.length);
      const file = formData.get(fileKey) as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = file.name.split('.').pop();
        const uniqueFileName = `blueprint_${projectId}_${timestamp}_${randomStr}.${ext}`;
        await writeFile(join(uploadDir, uniqueFileName), buffer);
        row.gambar = `/api/uploads/blueprint/${uniqueFileName}`;
      } else {
        row.gambar = null;
      }
    }
  }

  return rows;
}

export interface BaFormDataResult {
  nama: string;
  version: string;
  deskripsi: string | null;
  type: string;
  sumber: string;
  modules: any[];
}

export async function extractBaFormData(
  request: Request,
  projectId: number
): Promise<BaFormDataResult> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const rows = await parseAndUploadRows(formData, projectId);

    return {
      nama: sanitizeString(formData.get('nama')),
      version: sanitizeString(formData.get('version')),
      deskripsi: sanitizeStringOrNull(formData.get('deskripsi')),
      type: sanitizeString(formData.get('type')) || 'BERITA_ACARA',
      sumber: sanitizeString(formData.get('sumber')) || 'CRM',
      modules: rows,
    };
  }

  const body = await request.json();

  const rawRows: any[] = body.rows || [];
  for (const row of rawRows) {
    if (row.taskName) row.taskName = sanitizeString(row.taskName);
    if (row.keterangan) row.keterangan = sanitizeStringOrNull(row.keterangan);
  }

  return {
    nama: sanitizeString(body.nama),
    version: sanitizeString(body.version),
    deskripsi: sanitizeStringOrNull(body.deskripsi),
    type: sanitizeString(body.type) || 'BERITA_ACARA',
    sumber: sanitizeString(body.sumber) || 'CRM',
    modules: rawRows,
  };
}
