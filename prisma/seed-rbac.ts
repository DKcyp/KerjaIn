import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRBAC() {
  console.log('🌱 Seeding RBAC system...');

  // Create Master Roles
  const roles = [
    {
      name: 'super_admin',
      displayName: 'Super Administrator',
      description: 'Full system access with all permissions'
    },
    {
      name: 'project_manager',
      displayName: 'Project Manager',
      description: 'Manage projects, blueprints, and team assignments'
    },
    {
      name: 'developer',
      displayName: 'Developer',
      description: 'Development tasks, code management, and testing'
    },
    {
      name: 'tester',
      displayName: 'Tester',
      description: 'UAT and EUT testing, quality assurance'
    },
    {
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administration and user management'
    }
  ];

  console.log('Creating master roles...');
  for (const role of roles) {
    await prisma.masterRole.upsert({
      where: { name: role.name },
      update: role,
      create: role
    });
  }

  // Create Master Permissions
  const permissions = [
    // User Management
    { name: 'user.create', displayName: 'Create User', module: 'user', action: 'create', description: 'Create new users' },
    { name: 'user.read', displayName: 'View Users', module: 'user', action: 'read', description: 'View user information' },
    { name: 'user.update', displayName: 'Update User', module: 'user', action: 'update', description: 'Update user information' },
    { name: 'user.delete', displayName: 'Delete User', module: 'user', action: 'delete', description: 'Delete users' },
    
    // Project Management
    { name: 'project.create', displayName: 'Create Project', module: 'project', action: 'create', description: 'Create new projects' },
    { name: 'project.read', displayName: 'View Projects', module: 'project', action: 'read', description: 'View project information' },
    { name: 'project.update', displayName: 'Update Project', module: 'project', action: 'update', description: 'Update project information' },
    { name: 'project.delete', displayName: 'Delete Project', module: 'project', action: 'delete', description: 'Delete projects' },
    { name: 'project.assign_team', displayName: 'Assign Team', module: 'project', action: 'assign', description: 'Assign team members to projects' },
    
    // Blueprint Management
    { name: 'blueprint.create', displayName: 'Create Blueprint', module: 'blueprint', action: 'create', description: 'Create project blueprints' },
    { name: 'blueprint.read', displayName: 'View Blueprints', module: 'blueprint', action: 'read', description: 'View blueprint information' },
    { name: 'blueprint.update', displayName: 'Update Blueprint', module: 'blueprint', action: 'update', description: 'Update blueprint information' },
    { name: 'blueprint.approve', displayName: 'Approve Blueprint', module: 'blueprint', action: 'approve', description: 'Approve or reject blueprints' },
    { name: 'blueprint.delete', displayName: 'Delete Blueprint', module: 'blueprint', action: 'delete', description: 'Delete blueprints' },
    
    // Task Management
    { name: 'task.create', displayName: 'Create Task', module: 'task', action: 'create', description: 'Create new tasks' },
    { name: 'task.read', displayName: 'View Tasks', module: 'task', action: 'read', description: 'View task information' },
    { name: 'task.update', displayName: 'Update Task', module: 'task', action: 'update', description: 'Update task information' },
    { name: 'task.delete', displayName: 'Delete Task', module: 'task', action: 'delete', description: 'Delete tasks' },
    { name: 'task.assign', displayName: 'Assign Task', module: 'task', action: 'assign', description: 'Assign tasks to users' },
    
    // UAT Management
    { name: 'uat.create', displayName: 'Create UAT', module: 'uat', action: 'create', description: 'Create UAT tests' },
    { name: 'uat.read', displayName: 'View UAT', module: 'uat', action: 'read', description: 'View UAT test information' },
    { name: 'uat.update', displayName: 'Update UAT', module: 'uat', action: 'update', description: 'Update UAT test information' },
    { name: 'uat.approve', displayName: 'Approve UAT', module: 'uat', action: 'approve', description: 'Approve or reject UAT tests' },
    { name: 'uat.delete', displayName: 'Delete UAT', module: 'uat', action: 'delete', description: 'Delete UAT tests' },
    
    // EUT Management
    { name: 'eut.create', displayName: 'Create EUT', module: 'eut', action: 'create', description: 'Create EUT tests' },
    { name: 'eut.read', displayName: 'View EUT', module: 'eut', action: 'read', description: 'View EUT test information' },
    { name: 'eut.update', displayName: 'Update EUT', module: 'eut', action: 'update', description: 'Update EUT test information' },
    { name: 'eut.approve', displayName: 'Approve EUT', module: 'eut', action: 'approve', description: 'Approve EUT tests' },
    { name: 'eut.delete', displayName: 'Delete EUT', module: 'eut', action: 'delete', description: 'Delete EUT tests' },
    
    // Go Live Management
    { name: 'golive.create', displayName: 'Create Go Live', module: 'golive', action: 'create', description: 'Create go live records' },
    { name: 'golive.read', displayName: 'View Go Live', module: 'golive', action: 'read', description: 'View go live information' },
    { name: 'golive.update', displayName: 'Update Go Live', module: 'golive', action: 'update', description: 'Update go live information' },
    { name: 'golive.execute', displayName: 'Execute Go Live', module: 'golive', action: 'execute', description: 'Execute go live deployment' },
    { name: 'golive.rollback', displayName: 'Rollback Go Live', module: 'golive', action: 'rollback', description: 'Rollback go live deployment' },
    
    // Reports
    { name: 'report.view', displayName: 'View Reports', module: 'report', action: 'read', description: 'View system reports' },
    { name: 'report.export', displayName: 'Export Reports', module: 'report', action: 'export', description: 'Export reports to files' },
    
    // System Administration
    { name: 'system.settings', displayName: 'System Settings', module: 'system', action: 'manage', description: 'Manage system settings' },
    { name: 'system.logs', displayName: 'View System Logs', module: 'system', action: 'read', description: 'View system logs' },
    { name: 'rbac.manage', displayName: 'Manage RBAC', module: 'rbac', action: 'manage', description: 'Manage roles and permissions' }
  ];

  console.log('Creating master permissions...');
  for (const permission of permissions) {
    await prisma.masterPermission.upsert({
      where: { name: permission.name },
      update: permission,
      create: permission
    });
  }

  // Assign permissions to roles
  console.log('Assigning permissions to roles...');
  
  // Super Admin gets all permissions
  const superAdminRole = await prisma.masterRole.findUnique({ where: { name: 'super_admin' } });
  const allPermissions = await prisma.masterPermission.findMany();
  
  if (superAdminRole) {
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id
        }
      });
    }
  }

  // Project Manager permissions
  const pmRole = await prisma.masterRole.findUnique({ where: { name: 'project_manager' } });
  const pmPermissions = [
    'project.create', 'project.read', 'project.update', 'project.assign_team',
    'blueprint.create', 'blueprint.read', 'blueprint.update', 'blueprint.approve',
    'task.create', 'task.read', 'task.update', 'task.assign',
    'uat.read', 'uat.approve', 'eut.read', 'eut.approve',
    'golive.create', 'golive.read', 'golive.update', 'golive.execute',
    'report.view', 'report.export'
  ];

  if (pmRole) {
    for (const permName of pmPermissions) {
      const permission = await prisma.masterPermission.findUnique({ where: { name: permName } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: pmRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: pmRole.id,
            permissionId: permission.id
          }
        });
      }
    }
  }

  // Developer permissions
  const devRole = await prisma.masterRole.findUnique({ where: { name: 'developer' } });
  const devPermissions = [
    'project.read', 'blueprint.read', 'task.read', 'task.update',
    'uat.create', 'uat.read', 'uat.update', 'eut.create', 'eut.read', 'eut.update',
    'report.view'
  ];

  if (devRole) {
    for (const permName of devPermissions) {
      const permission = await prisma.masterPermission.findUnique({ where: { name: permName } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: devRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: devRole.id,
            permissionId: permission.id
          }
        });
      }
    }
  }

  // Tester permissions
  const testerRole = await prisma.masterRole.findUnique({ where: { name: 'tester' } });
  const testerPermissions = [
    'project.read', 'blueprint.read', 'task.read',
    'uat.read', 'uat.update', 'uat.approve', 'eut.read', 'eut.update', 'eut.approve',
    'report.view'
  ];

  if (testerRole) {
    for (const permName of testerPermissions) {
      const permission = await prisma.masterPermission.findUnique({ where: { name: permName } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: testerRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: testerRole.id,
            permissionId: permission.id
          }
        });
      }
    }
  }

  // Admin permissions
  const adminRole = await prisma.masterRole.findUnique({ where: { name: 'admin' } });
  const adminPermissions = [
    'user.create', 'user.read', 'user.update', 'user.delete',
    'project.read', 'blueprint.read', 'task.read',
    'uat.read', 'eut.read', 'golive.read',
    'report.view', 'report.export', 'system.settings', 'system.logs'
  ];

  if (adminRole) {
    for (const permName of adminPermissions) {
      const permission = await prisma.masterPermission.findUnique({ where: { name: permName } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
      }
    }
  }

  // Grant RBAC access to user ID 4
  console.log('Granting RBAC access to user ID 4...');
  const rbacPermission = await prisma.masterPermission.findUnique({ 
    where: { name: 'rbac.manage' } 
  });
  
  if (rbacPermission) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: 4,
          permissionId: rbacPermission.id
        }
      },
      update: {
        granted: true
      },
      create: {
        userId: 4,
        permissionId: rbacPermission.id,
        granted: true
      }
    });
    console.log('✅ User ID 4 granted RBAC access');
  } else {
    console.log('⚠️ RBAC permission not found');
  }

  console.log('✅ RBAC system seeded successfully!');
}

async function main() {
  try {
    await seedRBAC();
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedRBAC };
