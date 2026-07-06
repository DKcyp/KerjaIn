import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/rbac/permissions - List all permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');
    const action = searchParams.get('action');
    const groupByModule = searchParams.get('groupByModule') === 'true';

    const whereClause: any = {
      isActive: true
    };

    if (module) {
      whereClause.module = module;
    }

    if (action) {
      whereClause.action = action;
    }

    const permissions = await prisma.masterPermission.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true
          }
        }
      },
      orderBy: [
        { module: 'asc' },
        { action: 'asc' },
        { name: 'asc' }
      ]
    });

    if (groupByModule) {
      // Group permissions by module
      const grouped = permissions.reduce((acc, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = [];
        }
        acc[permission.module].push(permission);
        return acc;
      }, {} as Record<string, typeof permissions>);

      return NextResponse.json({ permissions: grouped });
    }

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rbac/permissions - Create new permission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, displayName, description, module, action } = body;

    if (!name || !displayName || !module || !action) {
      return NextResponse.json({ 
        error: 'Name, display name, module, and action are required' 
      }, { status: 400 });
    }

    // Check if permission name already exists
    const existingPermission = await prisma.masterPermission.findUnique({
      where: { name }
    });

    if (existingPermission) {
      return NextResponse.json({ 
        error: 'Permission with this name already exists' 
      }, { status: 409 });
    }

    const permission = await prisma.masterPermission.create({
      data: {
        name,
        displayName,
        description,
        module,
        action
      },
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true
          }
        }
      }
    });

    return NextResponse.json({ permission }, { status: 201 });
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
