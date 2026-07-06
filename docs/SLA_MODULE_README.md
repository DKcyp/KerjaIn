# Master SLA Module Documentation

## Overview

The Master SLA (Service Level Agreement) module allows administrators to configure duration thresholds for different task complexity levels. This module provides a centralized way to manage time expectations for task assignments, work completion, and project manager reviews.

## Features

### 🎯 Core Functionality
- **Three SLA Types**: Easy, Medium, and Hard complexity levels
- **Three Duration Types**: 
  - Assignee Start Task (time to begin work)
  - Assignee Work Duration (time to complete work)
  - PM Review Duration (time for project manager review)
- **CRUD Operations**: Create, Read, Update, and Delete SLA configurations
- **Validation**: Ensures all durations are positive integers
- **Unique Constraints**: Only one configuration per SLA type

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface with dark mode support
- **Visual Indicators**: Color-coded SLA types (Green/Yellow/Red)
- **Duration Formatting**: Automatic conversion to hours/minutes display
- **Modal Forms**: Intuitive create/edit dialogs
- **Empty States**: Helpful messaging when no configurations exist

## Database Schema

```sql
CREATE TABLE "master_sla" (
    "id" SERIAL NOT NULL,
    "slaType" "SlaType" NOT NULL,
    "assigneeStartTask" INTEGER NOT NULL,
    "assigneeWorkDuration" INTEGER NOT NULL,
    "pmReviewDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "master_sla_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "SlaType" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE UNIQUE INDEX "master_sla_slaType_key" ON "master_sla"("slaType");
```

## API Endpoints

### GET /api/master-sla
Retrieve all SLA configurations
- **Response**: Array of SLA configuration objects
- **Authentication**: Required

### POST /api/master-sla
Create or update an SLA configuration
- **Body**: SLA configuration object
- **Response**: Created/updated SLA configuration
- **Authentication**: Required

### GET /api/master-sla/[id]
Retrieve specific SLA configuration
- **Parameters**: id (SLA configuration ID)
- **Response**: SLA configuration object
- **Authentication**: Required

### PUT /api/master-sla/[id]
Update specific SLA configuration
- **Parameters**: id (SLA configuration ID)
- **Body**: Updated SLA data (excluding slaType)
- **Response**: Updated SLA configuration
- **Authentication**: Required

### DELETE /api/master-sla/[id]
Delete specific SLA configuration
- **Parameters**: id (SLA configuration ID)
- **Response**: Success message
- **Authentication**: Required

## Default SLA Values

The system comes with pre-configured default values:

| SLA Type | Start Task | Work Duration | PM Review |
|----------|------------|---------------|-----------|
| **Easy** | 30 min | 2 hours | 1 hour |
| **Medium** | 1 hour | 8 hours | 2 hours |
| **Hard** | 2 hours | 24 hours | 4 hours |

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── master-sla/
│   │       ├── route.ts              # Main SLA API endpoints
│   │       └── [id]/
│   │           └── route.ts          # Individual SLA operations
│   └── (admin)/
│       └── master/
│           └── sla/
│               └── page.tsx          # SLA management interface
├── layout/
│   └── AppSidebar.tsx               # Updated with SLA menu item
└── prisma/
    ├── schema.prisma                # Database schema with SLA model
    └── migrations/
        └── 20251007121006_add_master_sla/
            └── migration.sql        # SLA table migration

scripts/
└── seed-sla.js                     # Seed script for default SLA values

docs/
└── SLA_MODULE_README.md            # This documentation

test-sla-api.js                     # API testing script
```

## Installation & Setup

### 1. Database Migration
```bash
# Apply the SLA migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 2. Seed Default Data
```bash
# Run the SLA seed script
node scripts/seed-sla.js
```

### 3. Verify Installation
1. Start the development server: `npm run dev`
2. Navigate to `/master/sla` in your browser
3. Verify the SLA configurations are displayed
4. Test creating, editing, and deleting configurations

## Usage

### Accessing the SLA Module
1. Navigate to the application
2. Open the sidebar menu
3. Click on "Master" to expand the submenu
4. Select "SLA" to access the SLA management page

### Managing SLA Configurations
1. **View Configurations**: All SLA types and their durations are displayed in a table
2. **Add Configuration**: Click "Add SLA Configuration" button
3. **Edit Configuration**: Click the "Edit" button next to any configuration
4. **Delete Configuration**: Click the "Delete" button and confirm

### Form Validation
- All duration fields must be positive integers
- SLA type cannot be changed after creation (use delete/recreate instead)
- All fields are required

## Integration Points

The SLA module is designed to integrate with:
- **Task Management**: Use SLA durations for task deadline calculations
- **Notification System**: Alert users when SLA thresholds are exceeded
- **Reporting**: Generate SLA compliance reports
- **Dashboard**: Display SLA metrics and performance indicators

## Security

- All API endpoints require authentication
- Session-based authentication using `getServerSession()`
- Input validation on both client and server sides
- SQL injection protection through Prisma ORM

## Error Handling

- Comprehensive error messages for validation failures
- Toast notifications for user feedback
- Graceful handling of network errors
- Database constraint violation handling

## Testing

Use the provided test script to verify API functionality:

```bash
# Make sure the server is running
npm run dev

# Run the test script
node test-sla-api.js
```

## Future Enhancements

Potential improvements for the SLA module:
- **SLA Templates**: Predefined configurations for different project types
- **Dynamic SLA**: Adjust durations based on project complexity or team capacity
- **SLA Monitoring**: Real-time tracking of SLA compliance
- **Escalation Rules**: Automatic notifications when SLAs are breached
- **Historical Analysis**: Track SLA performance over time
- **Custom SLA Types**: Allow creation of custom complexity levels

## Support

For issues or questions regarding the SLA module:
1. Check the console for error messages
2. Verify database connectivity and migrations
3. Ensure proper authentication setup
4. Review the API endpoint responses for detailed error information

---

*This module is part of the Logbook project management system.*
