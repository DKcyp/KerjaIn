# RBAC (Role-Based Access Control) System

This document describes the comprehensive RBAC system implemented in the logbook application.

## Overview

The RBAC system provides fine-grained access control through:
- **Master Roles**: Predefined system roles
- **Master Permissions**: Granular permissions for specific actions
- **Role-Permission Mapping**: Assign permissions to roles
- **User-Role Assignment**: Assign roles to users
- **User-Permission Overrides**: Direct user-specific permission grants/denials

## Database Schema

### Core Tables

#### `master_role`
- `id`: Primary key
- `name`: Unique role identifier (e.g., "super_admin", "project_manager")
- `displayName`: Human-readable name
- `description`: Role description
- `isActive`: Enable/disable role

#### `master_permission`
- `id`: Primary key
- `name`: Unique permission identifier (e.g., "project.create", "user.delete")
- `displayName`: Human-readable name
- `description`: Permission description
- `module`: Permission module/category (e.g., "project", "user")
- `action`: Permission action (e.g., "create", "read", "update", "delete")
- `isActive`: Enable/disable permission

#### `role_permission`
- Links roles to permissions (many-to-many)
- `roleId`: Foreign key to master_role
- `permissionId`: Foreign key to master_permission

#### `user_role`
- Links users to roles (many-to-many)
- `userId`: Foreign key to pegawai
- `roleId`: Foreign key to master_role

#### `user_permission`
- Direct user permission overrides
- `userId`: Foreign key to pegawai
- `permissionId`: Foreign key to master_permission
- `granted`: Boolean (true = grant, false = deny)

## Default Roles and Permissions

### Roles
1. **Super Administrator** (`super_admin`)
   - Full system access
   - All permissions granted

2. **Project Manager** (`project_manager`)
   - Project management
   - Blueprint approval
   - Team assignment
   - UAT/EUT approval

3. **Developer** (`developer`)
   - Development tasks
   - Code management
   - Testing creation

4. **Tester** (`tester`)
   - UAT/EUT testing
   - Quality assurance

5. **Administrator** (`admin`)
   - User management
   - System administration

### Permission Modules

#### User Management (`user`)
- `user.create` - Create new users
- `user.read` - View user information
- `user.update` - Update user information
- `user.delete` - Delete users

#### Project Management (`project`)
- `project.create` - Create new projects
- `project.read` - View project information
- `project.update` - Update project information
- `project.delete` - Delete projects
- `project.assign_team` - Assign team members

#### Blueprint Management (`blueprint`)
- `blueprint.create` - Create blueprints
- `blueprint.read` - View blueprints
- `blueprint.update` - Update blueprints
- `blueprint.approve` - Approve/reject blueprints
- `blueprint.delete` - Delete blueprints

#### Task Management (`task`)
- `task.create` - Create tasks
- `task.read` - View tasks
- `task.update` - Update tasks
- `task.delete` - Delete tasks
- `task.assign` - Assign tasks

#### UAT Management (`uat`)
- `uat.create` - Create UAT tests
- `uat.read` - View UAT tests
- `uat.update` - Update UAT tests
- `uat.approve` - Approve UAT tests
- `uat.delete` - Delete UAT tests

#### EUT Management (`eut`)
- `eut.create` - Create EUT tests
- `eut.read` - View EUT tests
- `eut.update` - Update EUT tests
- `eut.approve` - Approve EUT tests
- `eut.delete` - Delete EUT tests

#### Go Live Management (`golive`)
- `golive.create` - Create go live records
- `golive.read` - View go live information
- `golive.update` - Update go live information
- `golive.execute` - Execute deployments
- `golive.rollback` - Rollback deployments

#### Reports (`report`)
- `report.view` - View reports
- `report.export` - Export reports

#### System Administration (`system`)
- `system.settings` - Manage system settings
- `system.logs` - View system logs

#### RBAC Management (`rbac`)
- `rbac.manage` - Manage roles and permissions

## API Endpoints

### Role Management
- `GET /api/rbac/roles` - List all roles
- `POST /api/rbac/roles` - Create new role
- `GET /api/rbac/roles/[id]` - Get role details
- `PUT /api/rbac/roles/[id]` - Update role
- `DELETE /api/rbac/roles/[id]` - Delete role

### Permission Management
- `GET /api/rbac/permissions` - List all permissions
- `POST /api/rbac/permissions` - Create new permission
- `GET /api/rbac/permissions/[id]` - Get permission details
- `PUT /api/rbac/permissions/[id]` - Update permission
- `DELETE /api/rbac/permissions/[id]` - Delete permission

### User Role Assignment
- `GET /api/rbac/users/[id]/roles` - Get user's roles
- `POST /api/rbac/users/[id]/roles` - Assign roles to user
- `DELETE /api/rbac/users/[id]/roles` - Remove all roles from user

### User Permission Management
- `GET /api/rbac/users/[id]/permissions` - Get user's effective permissions
- `POST /api/rbac/users/[id]/permissions` - Set user-specific permissions
- `DELETE /api/rbac/users/[id]/permissions` - Remove user-specific permissions

### Authentication
- `GET /api/auth/permissions` - Get current user's permissions

## Backend Utilities

### Permission Checking Functions
```typescript
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/auth';

// Check single permission
const canCreate = await hasPermission(userId, 'project.create');

// Check any of multiple permissions
const canManage = await hasAnyPermission(userId, ['project.create', 'project.update']);

// Check all permissions
const canFullAccess = await hasAllPermissions(userId, ['project.read', 'project.update']);
```

### Session Management
```typescript
import { getServerSession } from '@/lib/auth';

const session = await getServerSession();
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// User permissions are included in session.user.permissions
```

## Frontend Integration

### React Hooks
```typescript
import { usePermission, useAnyPermission, useAllPermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const canCreate = usePermission('project.create');
  const canManage = useAnyPermission(['project.create', 'project.update']);
  const hasFullAccess = useAllPermissions(['project.read', 'project.update']);

  return (
    <div>
      {canCreate && <button>Create Project</button>}
      {canManage && <button>Manage Projects</button>}
    </div>
  );
}
```

### Permission Gate Component
```typescript
import { PermissionGate } from '@/components/rbac/PermissionGate';

function MyComponent() {
  return (
    <PermissionGate 
      permission="project.create"
      fallback={<div>Access Denied</div>}
    >
      <button>Create Project</button>
    </PermissionGate>
  );
}
```

### Module-Specific Permissions
```typescript
import { useModulePermissions } from '@/hooks/usePermissions';

function ProjectComponent() {
  const { canCreate, canRead, canUpdate, canDelete } = useModulePermissions('project');

  return (
    <div>
      {canCreate && <button>Create</button>}
      {canUpdate && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

## Setup Instructions

### 1. Database Migration
The RBAC tables are created via Prisma migration:
```bash
npx prisma migrate dev
```

### 2. Seed Initial Data
Run the RBAC seed script to populate initial roles and permissions:
```bash
npx ts-node prisma/seed-rbac.ts
```

### 3. Assign User Roles
Use the API or admin interface to assign roles to users:
```typescript
// Assign project manager role to user
POST /api/rbac/users/1/roles
{
  "roleIds": [2] // project_manager role ID
}
```

### 4. Frontend Integration
Import and use the permission hooks and components in your React components.

## Security Considerations

1. **Principle of Least Privilege**: Users should only have the minimum permissions necessary
2. **Permission Inheritance**: Users inherit permissions from their roles
3. **Override Capability**: Direct user permissions can override role permissions
4. **Audit Trail**: All permission changes should be logged
5. **Session Security**: Permissions are cached in user sessions for performance

## Performance Optimization

1. **Permission Caching**: User permissions are cached in the session
2. **Database Indexing**: Proper indexes on foreign keys and lookup fields
3. **Batch Operations**: Use transactions for multiple permission assignments
4. **Lazy Loading**: Load permissions only when needed

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Regenerate Prisma client after schema changes
   ```bash
   npx prisma generate
   ```

2. **Permission Not Working**: Check if user has the role and role has the permission
   ```bash
   GET /api/rbac/users/[id]/permissions?includeSource=true
   ```

3. **Migration Issues**: Ensure database is up to date
   ```bash
   npx prisma migrate status
   npx prisma migrate deploy
   ```

## Future Enhancements

1. **Resource-Level Permissions**: Permissions on specific resources (e.g., specific projects)
2. **Time-Based Permissions**: Temporary permission grants
3. **Conditional Permissions**: Context-aware permissions
4. **Permission Templates**: Predefined permission sets for common roles
5. **Audit Logging**: Comprehensive permission usage tracking
