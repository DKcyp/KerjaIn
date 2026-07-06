/**
 * API Endpoint: Global On/Off Get Jadwal Setting
 * GET /api/settings/getjadwal - Get current setting
 * PUT /api/settings/getjadwal - Update setting
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET - Get current Get Jadwal setting
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = parseSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the latest setting
    const setting = await prisma.globalOnofGetJadwal.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    // If no setting exists, create default one
    if (!setting) {
      const newSetting = await prisma.globalOnofGetJadwal.create({
        data: {
          isEnabled: true,
          description: 'Initial setup - fitur get jadwal dari JWT aktif',
          updatedBy: session.id
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          id: newSetting.id,
          isEnabled: newSetting.isEnabled,
          description: newSetting.description,
          updatedBy: newSetting.updatedBy,
          updatedAt: newSetting.updatedAt.toISOString()
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: setting.id,
        isEnabled: setting.isEnabled,
        description: setting.description,
        updatedBy: setting.updatedBy,
        updatedAt: setting.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [Get Jadwal Setting] Error fetching setting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update Get Jadwal setting
 */
export async function PUT(req: NextRequest) {
  try {
    // Verify authentication
    const session = parseSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN and ADMIN can update this setting
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only SUPER_ADMIN and ADMIN can update this setting' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { isEnabled, description } = body;

    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'isEnabled must be a boolean' },
        { status: 400 }
      );
    }

    // Get existing setting
    const existingSetting = await prisma.globalOnofGetJadwal.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    let updatedSetting;

    if (existingSetting) {
      // Update existing setting
      updatedSetting = await prisma.globalOnofGetJadwal.update({
        where: { id: existingSetting.id },
        data: {
          isEnabled,
          description: description || `Updated by ${session.namaLengkap}`,
          updatedBy: session.id
        }
      });
    } else {
      // Create new setting
      updatedSetting = await prisma.globalOnofGetJadwal.create({
        data: {
          isEnabled,
          description: description || `Created by ${session.namaLengkap}`,
          updatedBy: session.id
        }
      });
    }

    console.log(`✅ [Get Jadwal Setting] Updated by ${session.namaLengkap}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

    return NextResponse.json({
      success: true,
      message: `Get Jadwal feature ${isEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        id: updatedSetting.id,
        isEnabled: updatedSetting.isEnabled,
        description: updatedSetting.description,
        updatedBy: updatedSetting.updatedBy,
        updatedAt: updatedSetting.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [Get Jadwal Setting] Error updating setting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
