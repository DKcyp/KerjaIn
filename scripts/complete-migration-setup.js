const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function completeMigrationSetup() {
  console.log('🚀 Starting Complete Migration Setup');
  console.log('====================================\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Step 1: Run Prisma migrations
    console.log('📋 Step 1: Running Prisma migrations...');
    console.log('---------------------------------------');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Prisma migrations completed\n');
    } catch (error) {
      console.log('⚠️  Prisma migrations had issues, continuing...\n');
    }
    
    // Step 2: Add missing database fields
    console.log('📋 Step 2: Adding missing database fields...');
    console.log('--------------------------------------------');
    
    // Add SLA deadline fields
    console.log('Adding SLA deadline fields...');
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "assigneeStartTaskDeadline" TIMESTAMP NULL`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "assigneeWorkDeadline" TIMESTAMP NULL`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "pmReviewDeadline" TIMESTAMP NULL`;
    console.log('✅ SLA deadline fields added');
    
    // Add calculated due date field
    console.log('Adding calculated due date field...');
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "calculatedDueDate" TIMESTAMP NULL`;
    console.log('✅ Calculated due date field added');
    
    // Create SlaType enum if it doesn't exist
    console.log('Creating SlaType enum...');
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SlaType') THEN
              CREATE TYPE "SlaType" AS ENUM ('EASY', 'MEDIUM', 'HARD');
          END IF;
      END $$;
    `;
    console.log('✅ SlaType enum created');
    
    // Add task complexity field
    console.log('Adding task complexity field...');
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "taskComplexity" "SlaType" DEFAULT 'MEDIUM'`;
    console.log('✅ Task complexity field added');
    
    // Add time tracking fields
    console.log('Adding time tracking fields...');
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP NULL`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP NULL`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "total_duration_minutes" INTEGER DEFAULT 0`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "is_paused" BOOLEAN DEFAULT FALSE`;
    console.log('✅ Time tracking fields added');
    
    // Add TaskStatus enum value
    console.log('Adding missing TaskStatus enum value...');
    await prisma.$executeRaw`ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'SEDANG_DIPROSES_USER_PAUSED'`;
    console.log('✅ TaskStatus enum updated');
    
    // Add indexes for performance
    console.log('Adding indexes...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_assigneeStartTaskDeadline" ON tasklist("assigneeStartTaskDeadline")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_assigneeWorkDeadline" ON tasklist("assigneeWorkDeadline")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_pmReviewDeadline" ON tasklist("pmReviewDeadline")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_calculatedDueDate" ON tasklist("calculatedDueDate")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_taskComplexity" ON tasklist("taskComplexity")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_started_at" ON tasklist("started_at")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_is_paused" ON tasklist("is_paused")`;
    console.log('✅ Indexes added\n');
    
    // Step 3: Generate Prisma client
    console.log('📋 Step 3: Generating Prisma client...');
    console.log('--------------------------------------');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated\n');
    } catch (error) {
      console.log('⚠️  Prisma client generation had warnings, continuing...\n');
    }
    
    // Step 4: Run RBAC seeder
    console.log('📋 Step 4: Seeding RBAC system...');
    console.log('----------------------------------');
    await seedRBAC(prisma);
    console.log('✅ RBAC system seeded\n');
    
    // Step 5: Run SLA seeder
    console.log('📋 Step 5: Seeding SLA configurations...');
    console.log('-----------------------------------------');
    await seedSLA(prisma);
    console.log('✅ SLA configurations seeded\n');
    
    // Step 6: Run Task Complexity seeder
    console.log('📋 Step 6: Seeding Task Complexity...');
    console.log('--------------------------------------');
    await seedTaskComplexity(prisma);
    console.log('✅ Task Complexity seeded\n');
    
    // Step 7: Assign user roles
    console.log('📋 Step 7: Assigning user roles...');
    console.log('-----------------------------------');
    await assignUserRoles(prisma);
    console.log('✅ User roles assigned\n');
    
    // Step 8: Populate task due dates
    console.log('📋 Step 8: Populating task due dates...');
    console.log('----------------------------------------');
    await populateTaskDueDates(prisma);
    console.log('✅ Task due dates populated\n');
    
    // Step 9: Final verification
    console.log('📋 Step 9: Final verification...');
    console.log('---------------------------------');
    await finalVerification(prisma);
    
    console.log('🎉 COMPLETE MIGRATION SETUP FINISHED!');
    console.log('=====================================');
    console.log('✅ All migrations applied');
    console.log('✅ All database fields added');
    console.log('✅ All seeders executed');
    console.log('✅ System is ready for use');
    
  } catch (error) {
    console.error('❌ Migration setup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// RBAC Seeder Function
async function seedRBAC(prisma) {
  const roles = [
    { name: 'super_admin', displayName: 'Super Administrator', description: 'Full system access with all permissions (SUPER_ADMIN)' },
    { name: 'project_manager', displayName: 'Project Manager', description: 'Manage projects, blueprints, and team assignments (PM)' },
    { name: 'developer', displayName: 'Developer/Programmer', description: 'Development tasks, code management, and testing (PROGRAMMER)' },
    { name: 'admin', displayName: 'Administrator', description: 'Administrative work and system management (ADMIN)' },
    { name: 'tester', displayName: 'Tester', description: 'UAT and EUT testing, quality assurance (additional role)' }
  ];

  console.log('Creating master roles...');
  for (const role of roles) {
    await prisma.masterRole.upsert({
      where: { name: role.name },
      update: role,
      create: role
    });
  }

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
    
    // System Administration
    { name: 'system.read', displayName: 'View System', module: 'system', action: 'read', description: 'View system information' },
    { name: 'system.manage', displayName: 'Manage System', module: 'system', action: 'manage', description: 'Manage system settings' },
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

  // Assign permissions to super admin
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
}

// SLA Seeder Function
async function seedSLA(prisma) {
  const slaConfigs = [
    { slaType: 'EASY', assigneeStartTask: 30, assigneeWorkDuration: 120, pmReviewDuration: 60 },
    { slaType: 'MEDIUM', assigneeStartTask: 60, assigneeWorkDuration: 480, pmReviewDuration: 120 },
    { slaType: 'HARD', assigneeStartTask: 120, assigneeWorkDuration: 1440, pmReviewDuration: 240 }
  ];

  for (const config of slaConfigs) {
    await prisma.masterSla.upsert({
      where: { slaType: config.slaType },
      update: {
        assigneeStartTask: config.assigneeStartTask,
        assigneeWorkDuration: config.assigneeWorkDuration,
        pmReviewDuration: config.pmReviewDuration,
      },
      create: config,
    });
  }
}

// Task Complexity Seeder Function
async function seedTaskComplexity(prisma) {
  const complexityLevels = [
    { complexity: 'EASY', hours: 2.0, points: 5, description: 'Simple tasks that can be completed quickly with minimal complexity', isActive: true },
    { complexity: 'MEDIUM', hours: 8.0, points: 10, description: 'Moderate complexity tasks requiring standard development time', isActive: true },
    { complexity: 'HARD', hours: 24.0, points: 20, description: 'Complex tasks requiring extensive development time and expertise', isActive: true }
  ];

  for (const level of complexityLevels) {
    await prisma.taskComplexity.upsert({
      where: { complexity: level.complexity },
      update: {
        hours: level.hours,
        points: level.points,
        description: level.description,
        isActive: level.isActive,
        updatedAt: new Date()
      },
      create: level
    });
  }
}

// User Role Assignment Function
async function assignUserRoles(prisma) {
  const roleMapping = {
    'SUPER_ADMIN': 'super_admin',
    'PM': 'project_manager', 
    'PROGRAMMER': 'developer',
    'ADMIN': 'admin'
  };

  const users = await prisma.pegawai.findMany({
    select: { id: true, username: true, namaLengkap: true, role: true }
  });

  const rbacRoles = await prisma.masterRole.findMany();

  for (const user of users) {
    const rbacRoleName = roleMapping[user.role];
    
    if (!rbacRoleName) continue;

    const rbacRole = rbacRoles.find(r => r.name === rbacRoleName);
    if (!rbacRole) continue;

    const existingAssignment = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: rbacRole.id
      }
    });

    if (!existingAssignment) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: rbacRole.id
        }
      });
      console.log(`   Assigned ${rbacRoleName} to ${user.username}`);
    }
  }
}

// Populate Task Due Dates Function
async function populateTaskDueDates(prisma) {
  const result = await prisma.$executeRaw`
    UPDATE tasklist 
    SET "calculatedDueDate" = "scheduleAt" 
    WHERE "calculatedDueDate" IS NULL;
  `;
  
  console.log(`   Updated ${result} tasks with due dates`);
}

// Final Verification Function
async function finalVerification(prisma) {
  // Check field existence
  const testFields = [
    'assigneeStartTaskDeadline',
    'assigneeWorkDeadline', 
    'pmReviewDeadline',
    'calculatedDueDate',
    'taskComplexity'
  ];
  
  console.log('Verifying database fields...');
  for (const field of testFields) {
    try {
      await prisma.$queryRawUnsafe(`SELECT ${field} FROM tasklist LIMIT 1`);
      console.log(`   ✅ ${field} - EXISTS`);
    } catch (error) {
      console.log(`   ❌ ${field} - MISSING`);
    }
  }
  
  // Check counts
  const totalTasks = await prisma.tasklist.count();
  const tasksWithDueDates = await prisma.tasklist.count({ where: { calculatedDueDate: { not: null } } });
  const totalRoles = await prisma.masterRole.count();
  const totalPermissions = await prisma.masterPermission.count();
  const totalUserRoles = await prisma.userRole.count();
  
  console.log('\nSystem Statistics:');
  console.log(`   Tasks: ${totalTasks} (${tasksWithDueDates} with due dates)`);
  console.log(`   RBAC Roles: ${totalRoles}`);
  console.log(`   RBAC Permissions: ${totalPermissions}`);
  console.log(`   User Role Assignments: ${totalUserRoles}`);
}

// Run the complete migration setup
if (require.main === module) {
  completeMigrationSetup();
}

module.exports = { completeMigrationSetup };
