import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/rbac/roles - List all roles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includePermissions = searchParams.get('includePermissions') === 'true';

    const roles = await prisma.masterRole.findMany({
      where: {
        isActive: true
      },
      include: includePermissions ? {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            userRoles: true
          }
        }
      } : {
        _count: {
          select: {
            userRoles: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rbac/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, displayName, description, permissionIds } = body;

    if (!name || !displayName) {
      return NextResponse.json({ 
        error: 'Name and display name are required' 
      }, { status: 400 });
    }

    // Check if role name already exists
    const existingRole = await prisma.masterRole.findUnique({
      where: { name }
    });

    if (existingRole) {
      return NextResponse.json({ 
        error: 'Role with this name already exists' 
      }, { status: 409 });
    }

    // Create role in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the role
      const role = await tx.masterRole.create({
        data: {
          name,
          displayName,
          description
        }
      });

      // Assign permissions if provided
      if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
        const rolePermissions = permissionIds.map((permissionId: number) => ({
          roleId: role.id,
          permissionId
        }));

        await tx.rolePermission.createMany({
          data: rolePermissions
        });
      }

      // Return role with permissions
      return await tx.masterRole.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      });
    });

    return NextResponse.json({ role: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
