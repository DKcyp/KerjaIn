import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
function validateRichzlogApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  return [process.env.EXTERNAL_API_KEY, process.env.RICHZLOG_PM_API_KEY].filter(Boolean).includes(apiKey);
}

/**
 * GET /api/external/users/lookup
 *
 * Dipakai JWT Spot untuk cari user Logbook berdasarkan username atau ssoUserId.
 * Hasilnya (id) disimpan sebagai richzlog_user_id di database JWT Spot.
 *
 * Query params (salah satu wajib):
 *   username   → username di Logbook
 *   ssoUserId  → ssoUserId (Portal UUID)
 *
 * Auth: X-API-Key
 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (!validateRichzlogApiKey(apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = req.nextUrl.searchParams.get('username');
  const ssoUserId = req.nextUrl.searchParams.get('ssoUserId');

  if (!username && !ssoUserId) {
    return NextResponse.json(
      { error: 'Provide username or ssoUserId' },
      { status: 400 }
    );
  }

  const where: any = username ? { username } : { ssoUserId };

  const user = await prisma.pegawai.findFirst({
    where,
    select: {
      id: true,
      username: true,
      namaLengkap: true,
      role: true,
      ssoUserId: true,
    }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,              // ← ini yang disimpan sebagai richzlog_user_id di JWT Spot
      username: user.username,
      namaLengkap: user.namaLengkap,
      role: user.role,
      ssoUserId: user.ssoUserId,
    }
  });
}
