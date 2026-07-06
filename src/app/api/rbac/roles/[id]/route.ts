import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/rbac/roles/[id] - Get role by ID
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
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const role = await prisma.masterRole.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
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
            userRoles: true
          }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/rbac/roles/[id] - Update role
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
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, displayName, description, permissionIds, isActive } = body;

    // Check if role exists
    const existingRole = await prisma.masterRole.findUnique({
      where: { id: roleId }
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== existingRole.name) {
      const nameConflict = await prisma.masterRole.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return NextResponse.json({ 
          error: 'Role with this name already exists' 
        }, { status: 409 });
      }
    }

    // Update role in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update role basic info
      const updatedRole = await tx.masterRole.update({
        where: { id: roleId },
        data: {
          ...(name && { name }),
          ...(displayName && { displayName }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive })
        }
      });

      // Update permissions if provided
      if (permissionIds && Array.isArray(permissionIds)) {
        // Remove existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId }
        });

        // Add new permissions
        if (permissionIds.length > 0) {
          const rolePermissions = permissionIds.map((permissionId: number) => ({
            roleId,
            permissionId
          }));

          await tx.rolePermission.createMany({
            data: rolePermissions
          });
        }
      }

      // Return updated role with permissions
      return await tx.masterRole.findUnique({
        where: { id: roleId },
        include: {
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
        }
      });
    });

    return NextResponse.json({ role: result });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/rbac/roles/[id] - Delete role
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
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    // Check if role exists
    const existingRole = await prisma.masterRole.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if role is in use
    if (existingRole._count.userRoles > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role that is assigned to users. Remove user assignments first.' 
      }, { status: 409 });
    }

    // Delete role (cascade will handle permissions)
    await prisma.masterRole.delete({
      where: { id: roleId }
    });

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
