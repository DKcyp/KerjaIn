# Task Complexity System

## Overview

The Task Complexity System allows administrators to define and manage different complexity levels for tasks, with each level having associated hours and points values. This system provides better project estimation and resource planning capabilities.

## Database Schema

### TaskComplexity Table

```sql
CREATE TABLE "task_complexity" (
    "id" SERIAL NOT NULL,
    "complexity" "SlaType" NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_complexity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_complexity_complexity_key" ON "task_complexity"("complexity");
```

### Fields Description

- **id**: Primary key, auto-increment
- **complexity**: Enum value (EASY, MEDIUM, HARD) - unique constraint
- **hours**: Estimated hours to complete tasks of this complexity (Float)
- **points**: Point value assigned to tasks of this complexity (Integer)
- **description**: Optional description explaining the complexity level
- **isActive**: Boolean flag to enable/disable complexity levels
- **createdAt/updatedAt**: Timestamp fields for audit trail

## API Endpoints

### GET /api/task-complexity
Retrieve all task complexity configurations.

**Response:**
```json
[
  {
    "id": 1,
    "complexity": "EASY",
    "hours": 2.0,
    "points": 5,
    "description": "Simple tasks that can be completed quickly",
    "isActive": true,
    "createdAt": "2024-10-09T07:12:00.000Z",
    "updatedAt": "2024-10-09T07:12:00.000Z"
  }
]
```

### POST /api/task-complexity
Create or update (upsert) a task complexity configuration.

**Request Body:**
```json
{
  "complexity": "MEDIUM",
  "hours": 8.0,
  "points": 10,
  "description": "Moderate complexity tasks"
}
```

### GET /api/task-complexity/[id]
Get a specific task complexity configuration by ID.

### PUT /api/task-complexity/[id]
Update a specific task complexity configuration.

### DELETE /api/task-complexity/[id]
Delete a task complexity configuration.

## Frontend Interface

### Access Path
Navigate to: **Master → Task Complexity** (`/master/task-complexity`)

### Features

1. **Management Interface**:
   - View all complexity levels in a sortable table
   - Search functionality across complexity levels and descriptions
   - Pagination for large datasets

2. **CRUD Operations**:
   - Add new complexity levels
   - Edit existing configurations
   - Delete complexity levels (with confirmation)
   - Toggle active/inactive status

3. **Visual Design**:
   - Color-coded complexity badges (Green/Yellow/Red)
   - Smart hour formatting (minutes → hours → days)
   - Point display with "pts" suffix
   - Dark mode compatibility

4. **Permission Integration**:
   - Uses RBAC system with `system.read`, `system.create`, `system.update`, `system.delete` permissions
   - Permission-gated buttons and actions

## Default Configuration

The system comes with three default complexity levels:

| Complexity | Hours | Points | Description |
|------------|-------|--------|-------------|
| EASY | 2.0 | 5 | Simple tasks that can be completed quickly with minimal complexity |
| MEDIUM | 8.0 | 10 | Moderate complexity tasks requiring standard development time |
| HARD | 24.0 | 20 | Complex tasks requiring extensive development time and expertise |

## Setup Instructions

### 1. Database Migration
Run the migration to create the task_complexity table:
```bash
npx prisma db push
```

### 2. Generate Prisma Client
Update the Prisma client to include the new model:
```bash
npx prisma generate
```

### 3. Seed Default Data
Populate the table with default complexity levels:
```bash
node scripts/seed-task-complexity.js
```

### 4. Navigation Setup
The Task Complexity menu item is automatically added to the Master submenu in the sidebar.

## Integration Points

### With Existing Systems

1. **SLA System**: The complexity levels use the same `SlaType` enum as the existing SLA system
2. **Tasklist System**: Tasks can reference complexity levels for better estimation
3. **RBAC System**: Full integration with role-based access control
4. **UI Components**: Uses the same design system as other master pages

### Future Enhancements

- Integration with task creation to automatically assign complexity
- Reporting dashboard showing complexity distribution
- Time tracking integration to validate hour estimates
- Project estimation tools using complexity points

## Technical Details

### File Structure
```
src/
├── app/
│   ├── api/
│   │   └── task-complexity/
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   └── (admin)/
│       └── master/
│           └── task-complexity/
│               └── page.tsx
├── layout/
│   └── AppSidebar.tsx (updated)
└── prisma/
    ├── schema.prisma (updated)
    └── migrations/
        └── 20251009071200_add_task_complexity_table/
            └── migration.sql
```

### Dependencies
- Uses existing UI components (`Table`, `Modal`, `PermissionGate`)
- Integrates with existing hooks (`useModal`, `useToast`, `usePermission`)
- Follows established patterns from SLA management system

## Troubleshooting

### Common Issues

1. **Migration Errors**: Ensure database is accessible and Prisma schema is valid
2. **Permission Errors**: Verify user has appropriate system permissions
3. **TypeScript Errors**: Run `npx prisma generate` after schema changes

### Validation Rules

- Complexity levels must be unique (EASY, MEDIUM, HARD)
- Hours must be positive numbers (> 0)
- Points must be positive integers (> 0)
- Description is optional but recommended

## Security Considerations

- All API endpoints require authentication
- RBAC permissions control access to CRUD operations
- Input validation prevents invalid data entry
- Audit trail maintained with created/updated timestamps

This system provides a solid foundation for task complexity management while maintaining consistency with the existing application architecture and design patterns.
