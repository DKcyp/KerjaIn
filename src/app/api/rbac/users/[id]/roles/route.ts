import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/rbac/users/[id]/roles - Get user's roles
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
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.pegawai.findUnique({
      where: { id: userId },
      select: {
        id: true,
        namaLengkap: true,
        username: true,
        role: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      },
      orderBy: {
        role: {
          name: 'asc'
        }
      }
    });

    return NextResponse.json({ user, roles: userRoles });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rbac/users/[id]/roles - Assign roles to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { roleIds } = body;

    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ 
        error: 'roleIds must be an array' 
      }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.pegawai.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify all roles exist
    const roles = await prisma.masterRole.findMany({
      where: {
        id: { in: roleIds },
        isActive: true
      }
    });

    if (roles.length !== roleIds.length) {
      return NextResponse.json({ 
        error: 'One or more roles not found or inactive' 
      }, { status: 400 });
    }

    // Update user roles in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Remove existing roles
      await tx.userRole.deleteMany({
        where: { userId }
      });

      // Add new roles
      if (roleIds.length > 0) {
        const userRoles = roleIds.map((roleId: number) => ({
          userId,
          roleId
        }));

        await tx.userRole.createMany({
          data: userRoles
        });
      }

      // Return updated user roles
      return await tx.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });
    });

    return NextResponse.json({ roles: result });
  } catch (error) {
    console.error('Error assigning user roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/rbac/users/[id]/roles - Remove all roles from user
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
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.pegawai.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove all user roles
    await prisma.userRole.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ message: 'All roles removed from user' });
  } catch (error) {
    console.error('Error removing user roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
