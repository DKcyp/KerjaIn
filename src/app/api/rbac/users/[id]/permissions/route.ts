import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/rbac/users/[id]/permissions - Get user's effective permissions
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

    const { searchParams } = new URL(request.url);
    const includeSource = searchParams.get('includeSource') === 'true';

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

    // Get permissions from roles
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: {
          userRoles: {
            some: { userId }
          },
          isActive: true
        }
      },
      include: {
        permission: true,
        role: true
      }
    });

    // Get direct user permissions (overrides)
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true
      }
    });

    // Calculate effective permissions
    const effectivePermissions = new Map();

    // Add role-based permissions
    rolePermissions.forEach(rp => {
      if (rp.permission.isActive) {
        effectivePermissions.set(rp.permission.name, {
          permission: rp.permission,
          granted: true,
          source: includeSource ? 'role' : undefined,
          sourceRole: includeSource ? rp.role : undefined
        });
      }
    });

    // Apply user-specific overrides
    userPermissions.forEach(up => {
      if (up.permission.isActive) {
        effectivePermissions.set(up.permission.name, {
          permission: up.permission,
          granted: up.granted,
          source: includeSource ? 'user' : undefined,
          sourceRole: undefined
        });
      }
    });

    const permissions = Array.from(effectivePermissions.values())
      .filter(p => p.granted) // Only return granted permissions
      .sort((a, b) => a.permission.name.localeCompare(b.permission.name));

    return NextResponse.json({ 
      user, 
      permissions,
      summary: {
        total: permissions.length,
        fromRoles: rolePermissions.length,
        directOverrides: userPermissions.length
      }
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rbac/users/[id]/permissions - Set user-specific permissions
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
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ 
        error: 'permissions must be an array of {permissionId, granted}' 
      }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.pegawai.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate permissions format
    for (const perm of permissions) {
      if (!perm.permissionId || typeof perm.granted !== 'boolean') {
        return NextResponse.json({ 
          error: 'Each permission must have permissionId and granted (boolean)' 
        }, { status: 400 });
      }
    }

    // Verify all permissions exist
    const permissionIds = permissions.map(p => p.permissionId);
    const validPermissions = await prisma.masterPermission.findMany({
      where: {
        id: { in: permissionIds },
        isActive: true
      }
    });

    if (validPermissions.length !== permissionIds.length) {
      return NextResponse.json({ 
        error: 'One or more permissions not found or inactive' 
      }, { status: 400 });
    }

    // Update user permissions in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Remove existing user permissions
      await tx.userPermission.deleteMany({
        where: { userId }
      });

      // Add new user permissions
      if (permissions.length > 0) {
        const userPermissions = permissions.map((perm: any) => ({
          userId,
          permissionId: perm.permissionId,
          granted: perm.granted
        }));

        await tx.userPermission.createMany({
          data: userPermissions
        });
      }

      // Return updated user permissions
      return await tx.userPermission.findMany({
        where: { userId },
        include: {
          permission: true
        }
      });
    });

    return NextResponse.json({ permissions: result });
  } catch (error) {
    console.error('Error setting user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/rbac/users/[id]/permissions - Remove all user-specific permissions
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

    // Remove all user-specific permissions
    await prisma.userPermission.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ message: 'All user-specific permissions removed' });
  } catch (error) {
    console.error('Error removing user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
