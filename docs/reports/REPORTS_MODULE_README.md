# 📊 Reports Module

> A comprehensive, professional reporting system for project management with beautiful data visualizations and export capabilities.

## 🎯 Overview

The Reports Module provides four distinct report types designed for Project Managers, Team Leads, and Management to track progress, identify bottlenecks, and generate performance reports.

## ✨ Features

### 🎨 Visual Design
- **Clean & Professional**: Data-forward design with clear visual hierarchy
- **Color-Coded Status**: Intuitive color system for quick status recognition
- **Responsive Layout**: Works seamlessly on desktop and tablet
- **Dark Mode**: Full dark mode support throughout

### 📈 Report Types

#### 1. Laporan Proyek (Project Reports)
Track project distribution across lifecycle stages with visual charts and detailed tables.

**Includes**:
- Horizontal bar chart showing projects per stage
- Detailed project table with progress indicators
- Client and PM information
- Color-coded status badges

#### 2. Laporan Task (Task Reports)
Monitor task completion and identify overdue items at a glance.

**Includes**:
- Task completion metrics (completed vs overdue)
- Visual donut chart for status distribution
- Detailed task table with assignee information
- Highlighted overdue tasks

#### 3. Laporan UAT/EUT (Testing Reports)
Quality assurance reporting with bug tracking and test case metrics.

**Includes**:
- Test case statistics (total, pass, fail)
- Bug outstanding count
- Detailed bug table with severity levels
- Pass/fail percentage calculations

#### 4. Laporan Tiket Support (Support Reports)
Customer support performance and SLA compliance monitoring.

**Includes**:
- Total tickets and resolution metrics
- SLA achievement percentage
- Detailed ticket table with resolution times
- SLA status indicators (Met/Missed)

### 🔍 Filtering & Export

**Global Filters**:
- **Date Range Picker**: Filter data by custom date range
- **Project Selector**: Focus on specific projects or view all

**Export Options**:
- **Excel Export**: Download current tab data as `.xlsx`
- **PDF Export**: Coming soon

## 🚀 Quick Start

### Access
Navigate to `/reports` in your application.

### Basic Usage
1. Select a report tab (Proyek, Task, UAT/EUT, or Support)
2. Apply filters (optional):
   - Click date input to select date range
   - Select project from dropdown
3. View charts and tables
4. Export data using the Export button

## 📁 File Structure

```
src/
├── app/(admin)/reports/
│   ├── page.tsx                           # Main reports page
│   └── layout.tsx                         # Layout wrapper
├── app/api/reports/
│   ├── projects/route.ts                  # Project reports API
│   └── tasks/route.ts                     # Task reports API
├── components/
│   ├── charts/
│   │   ├── bar/HorizontalBarChart.tsx    # Bar chart component
│   │   └── DonutChart.tsx                # Donut chart component
│   └── ui/
│       └── StatCard.tsx                  # Metric card component
```

## 🎨 Color System

### Status Colors
| Color | Usage | Example |
|-------|-------|---------|
| 🟢 Green | Success, Completed, Pass, SLA Met | Completed tasks, Passed tests |
| 🔴 Red | Overdue, Fail, Critical, SLA Missed | Overdue tasks, Failed tests |
| 🔵 Blue | In Progress, Information | Active tasks, Total counts |
| 🟠 Orange | Warning, Outstanding, Major | Outstanding bugs, Major issues |
| 🟣 Purple | Special Metrics | SLA percentage |
| 🟡 Yellow | Minor Issues | Minor bugs |
### Project Stages
- 🟠 **Blueprint**: Planning phase
- 🟣 **Development**: Active development
- 🔵 **UAT/EUT**: Testing phase
- 🟢 **Go-Live**: Production
- 🔵 **Support**: Maintenance & support phase

## 🔧 Technical Details

### Built With
- **Next.js 15**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **ApexCharts**: Data visualization
- **Flatpickr**: Date picker
- **ExcelJS**: Excel export
- **Prisma**: Database ORM

### Components

#### HorizontalBarChart
Reusable horizontal bar chart for displaying categorical data.

```typescript
<HorizontalBarChart
  categories={["Blueprint", "Development", "UAT"]}
  data={[2, 5, 3]}
  title="Projects"
  color="#3b82f6"
  height={300}
/>
```

#### DonutChart
Circular chart for showing proportional data.

```typescript
<DonutChart
  series={[15, 3]}
  labels={["Completed", "Overdue"]}
  colors={["#10b981", "#ef4444"]}
  height={300}
/>
```

#### StatCard
Metric display card with icon support.

```typescript
<StatCard
  title="Total Tasks"
  value={25}
  color="blue"
  icon={<CheckIcon />}
  subtitle="This month"
/>
```

### API Endpoints

#### GET /api/reports/projects
Fetch project reports with stage distribution.

**Query Parameters**:
- `from`: Start date (YYYY-MM-DD)
- `to`: End date (YYYY-MM-DD)
- `projectId`: Specific project ID or "all"

**Response**:
```json
{
  "items": [...],
  "stageDistribution": {
    "Blueprint": 2,
    "Development": 3,
    "UAT": 1
  },
  "total": 6
}
```

#### GET /api/reports/tasks
Fetch task reports with completion statistics.

**Query Parameters**:
- `from`: Start date (YYYY-MM-DD)
- `to`: End date (YYYY-MM-DD)
- `projectId`: Specific project ID or "all"

**Response**:
```json
{
  "items": [...],
  "stats": {
    "selesai": 15,
    "overdue": 3,
    "onProgress": 8
  },
  "total": 26
}
```

## 📊 Data Flow

```
User Action → Component State → API Request → Database Query → Response → UI Update
```

1. User selects filters (date range, project)
2. Component updates state
3. API endpoint is called with parameters
4. Prisma queries database with filters
5. Data is processed and returned
6. Charts and tables are updated

## 🎓 Usage Examples

### Daily Standup
```typescript
// Check overdue tasks
1. Navigate to "Laporan Task" tab
2. View red "Task Overdue" card
3. Review overdue tasks in table (highlighted in red)
```

### Weekly Review
```typescript
// Generate weekly report
1. Set date range to last 7 days
2. Visit each tab to review metrics
3. Export each tab to Excel
4. Compile reports for management
```

### Client Meeting
```typescript
// Show project progress
1. Filter by client's project
2. Show "Laporan Proyek" for overall progress
3. Show "Laporan UAT/EUT" for quality metrics
4. Export reports for client records
```

## 🔐 Security & Permissions

### Role-Based Access
- **SUPER_ADMIN**: View all projects and data
- **PM**: View only projects they manage
- **PROGRAMMER**: View only assigned tasks
- **ADMIN**: View assigned tasks

### Data Privacy
- Session-based authentication
- Cookie-based session management
- Role-based data filtering at API level

## 🚧 Current Limitations

1. **PDF Export**: Not yet implemented (shows alert)
2. **Real-time Updates**: Manual refresh required
3. **Advanced Filters**: Limited to date and project
4. **Pagination**: Not implemented (loads all data)
5. **Custom Reports**: No user-defined report templates

## 🔮 Future Enhancements

### Planned Features
- [ ] PDF export with custom templates
- [ ] Advanced filtering (status, assignee, priority)
- [ ] Custom report builder
- [ ] Scheduled email reports
- [ ] Real-time data updates (WebSocket)
- [ ] Comparison views (period over period)
- [ ] Drill-down capabilities
- [ ] Report templates (save filter combinations)
- [ ] Dashboard widgets integration
- [ ] Mobile app support

### Additional Chart Types
- [ ] Line charts (trends over time)
- [ ] Area charts (cumulative data)
- [ ] Radar charts (multi-dimensional comparison)
- [ ] Heatmaps (time-based patterns)
- [ ] Gantt charts (project timelines)

## 📚 Documentation

- **Implementation Summary**: `REPORTS_IMPLEMENTATION_SUMMARY.md`
- **Quick Start Guide**: `REPORTS_QUICK_START.md`
- **API Documentation**: See individual route files

## 🐛 Troubleshooting

### Common Issues

**Charts not displaying?**
- Clear browser cache
- Check console for errors
- Verify ApexCharts is loaded

**Export not working?**
- Check browser download settings
- Disable popup blockers
- Verify data exists in current tab

**No data showing?**
- Verify date range is correct
- Check project filter
- Ensure you have permissions

## 🤝 Contributing

### Adding New Report Types
1. Create new tab in `page.tsx`
2. Add API endpoint in `src/app/api/reports/`
3. Create necessary components
4. Update documentation

### Modifying Existing Reports
1. Update component in `page.tsx`
2. Modify API endpoint if needed
3. Test all filter combinations
4. Update documentation

## 📞 Support

- **Documentation**: See `REPORTS_QUICK_START.md`
- **Issues**: Create ticket in support system
- **Questions**: Contact development team

## 📄 License

Internal use only - Part of the Logbook project management system.

---

## 🎉 Summary

The Reports Module provides a **comprehensive, professional, and user-friendly** reporting interface with:

✅ **4 Distinct Report Types** covering all aspects of project management  
✅ **Beautiful Data Visualizations** with charts and graphs  
✅ **Flexible Filtering** by date range and project  
✅ **Export Capabilities** to Excel (PDF coming soon)  
✅ **Clean, Modern UI** with dark mode support  
✅ **Responsive Design** for desktop and tablet  
✅ **Role-Based Access** for data security  
✅ **Extensible Architecture** for future enhancements  

**Ready for production use with dummy data** - easily connect to real data by updating API endpoints.

---

**Version**: 1.0.0  
**Last Updated**: October 2024  
**Maintained By**: Development Team
