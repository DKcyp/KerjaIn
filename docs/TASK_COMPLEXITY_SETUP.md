# Task Complexity System Setup Guide

## 🚀 Quick Setup Instructions

### Step 1: Apply Database Changes
Since Prisma migrations might have issues, you can manually create the table using one of these methods:

**Option A: Using Database Admin Tool**
1. Open your PostgreSQL admin tool (pgAdmin, DBeaver, etc.)
2. Connect to your `logbook` database
3. Run the SQL script from `create-task-complexity-table.sql`

**Option B: Using Command Line (if psql is available)**
```bash
psql -h localhost -U postgres -d logbook -f create-task-complexity-table.sql
```

**Option C: Using Prisma (if working)**
```bash
npx prisma db push
npx prisma generate
```

### Step 2: Verify Table Creation
Check if the table was created successfully by running this SQL query:
```sql
SELECT * FROM task_complexity;
```

You should see 3 default records (EASY, MEDIUM, HARD).

### Step 3: Access the Interface
1. Make sure your development server is running: `npm run dev`
2. Open your browser and navigate to the application
3. Login with appropriate permissions
4. Go to **Master → Task Complexity**

## 🧪 Testing the System

### Frontend Testing
1. **Navigate to Task Complexity page**: `/master/task-complexity`
2. **Verify default data**: Should show 3 complexity levels
3. **Test CRUD operations**:
   - ✅ Add new complexity level
   - ✅ Edit existing level
   - ✅ Delete level (with confirmation)
   - ✅ Search functionality
   - ✅ Sorting by columns

### API Testing
You can test the API endpoints using your browser's developer tools or a tool like Postman:

**GET All Complexities:**
```
GET http://localhost:3001/api/task-complexity
```

**Create/Update Complexity:**
```
POST http://localhost:3001/api/task-complexity
Content-Type: application/json

{
  "complexity": "EASY",
  "hours": 2.5,
  "points": 6,
  "description": "Updated easy tasks"
}
```

## 📋 Default Configuration

The system comes pre-configured with these complexity levels:

| Complexity | Hours | Points | Description |
|------------|-------|--------|-------------|
| **EASY** | 2.0 | 5 | Simple tasks that can be completed quickly |
| **MEDIUM** | 8.0 | 10 | Moderate complexity tasks requiring standard development time |
| **HARD** | 24.0 | 20 | Complex tasks requiring extensive development time and expertise |

## 🔧 Troubleshooting

### Common Issues

**1. Table doesn't exist error**
- Solution: Run the SQL script manually in your database

**2. Permission denied on Task Complexity page**
- Solution: Ensure your user has `system.read` permission in RBAC

**3. API returns 401 Unauthorized**
- Solution: Make sure you're logged in and have proper session

**4. TypeScript errors in IDE**
- Solution: Run `npx prisma generate` to update types

### Database Connection Issues
If you can't connect to the database:
1. Check your `.env.development` file for correct DATABASE_URL
2. Ensure PostgreSQL service is running
3. Verify database credentials

## 🎯 Next Steps

Once the system is working:

1. **Customize Complexity Levels**: Adjust hours and points based on your team's needs
2. **Integration**: Consider integrating with task creation workflows
3. **Reporting**: Use the data for project estimation and reporting
4. **Team Training**: Train your team on the new complexity system

## 📞 Support

If you encounter any issues:
1. Check the browser console for JavaScript errors
2. Check the server logs for API errors
3. Verify database connectivity
4. Ensure all required permissions are assigned

The Task Complexity System is now ready to help you better manage and estimate your project tasks! 🎉
