import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/rbac/permissions/[id] - Get permission by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const permissionId = parseInt(id);
    if (isNaN(permissionId)) {
      return NextResponse.json({ error: 'Invalid permission ID' }, { status: 400 });
    }

    const permission = await prisma.masterPermission.findUnique({
      where: { id: permissionId },
      include: {
        rolePermissions: {
          include: {
            role: true
          }
        },
        userPermissions: {
          include: {
            user: {
              select: {
                id: true,
                namaLengkap: true,
                username: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true
          }
        }
      }
    });

    if (!permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    return NextResponse.json({ permission });
  } catch (error) {
    console.error('Error fetching permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/rbac/permissions/[id] - Update permission
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const permissionId = parseInt(id);
    if (isNaN(permissionId)) {
      return NextResponse.json({ error: 'Invalid permission ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, displayName, description, module, action, isActive } = body;

    // Check if permission exists
    const existingPermission = await prisma.masterPermission.findUnique({
      where: { id: permissionId }
    });

    if (!existingPermission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== existingPermission.name) {
      const nameConflict = await prisma.masterPermission.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return NextResponse.json({ 
          error: 'Permission with this name already exists' 
        }, { status: 409 });
      }
    }

    const updatedPermission = await prisma.masterPermission.update({
      where: { id: permissionId },
      data: {
        ...(name && { name }),
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(module && { module }),
        ...(action && { action }),
        ...(isActive !== undefined && { isActive })
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

    return NextResponse.json({ permission: updatedPermission });
  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/rbac/permissions/[id] - Delete permission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const permissionId = parseInt(id);
    if (isNaN(permissionId)) {
      return NextResponse.json({ error: 'Invalid permission ID' }, { status: 400 });
    }

    // Check if permission exists
    const existingPermission = await prisma.masterPermission.findUnique({
      where: { id: permissionId },
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true
          }
        }
      }
    });

    if (!existingPermission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    // Check if permission is in use
    const totalUsage = existingPermission._count.rolePermissions + existingPermission._count.userPermissions;
    if (totalUsage > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete permission that is assigned to roles or users. Remove assignments first.' 
      }, { status: 409 });
    }

    // Delete permission
    await prisma.masterPermission.delete({
      where: { id: permissionId }
    });

    return NextResponse.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
