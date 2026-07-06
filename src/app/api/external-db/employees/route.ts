import { NextResponse } from 'next/server';
import { externalPool } from '@/lib/externalDb';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!externalPool) {
    return NextResponse.json({ error: 'External DB not configured' }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    let query = 'SELECT * FROM global.global_auth_user';
    const params: any[] = [];

    if (search) {
      query += ` WHERE usr_name ILIKE $1 OR usr_loginname ILIKE $1 OR nama_pgw ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY usr_id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await externalPool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM global.global_auth_user';
    const countParams: any[] = [];
    if (search) {
      countQuery += ` WHERE usr_name ILIKE $1 OR usr_loginname ILIKE $1 OR nama_pgw ILIKE $1`;
      countParams.push(`%${search}%`);
    }
    const countResult = await externalPool.query(countQuery, countParams);

    return NextResponse.json({
      items: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[External DB] Failed to fetch employees:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data from external database' },
      { status: 500 }
    );
  }
}
