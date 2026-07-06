# SLA WhatsApp Notification Setup

This document explains how to set up automated WhatsApp notifications for SLA monitoring in the task management system.

## 🎯 Overview

The system automatically monitors task SLA compliance and sends WhatsApp notifications when:
- Tasks are overdue (past the `assigneeStartTask` deadline)
- Tasks are approaching deadline (30 minutes warning)
- Tasks are assigned to users

## 🔧 WhatsApp Service Configuration

**✅ No Additional Setup Required!**

The system uses the existing WhatsApp service already configured in your codebase:
- **API Endpoint**: `https://wa.expressa.id/send`
- **Integration**: Already working with existing task summary notifications
- **Phone Number Format**: Uses the same normalization as existing features

## 📱 WhatsApp Service Details

### Current Implementation
The system uses `wa.expressa.id` which is already integrated in your codebase for:
- Daily task summaries to SUPER_ADMINs
- Employee notifications
- SLA monitoring alerts (new feature)

### Phone Number Requirements
Employee phone numbers in the `pegawai` table should be in the `noHp` field with format:
- `081234567890` (Indonesian format)
- `6281234567890` (International format)  
- `+6281234567890` (With plus sign)

The system automatically converts all formats to the correct WhatsApp format.

## 🚀 Deployment Setup

### Manual Testing
Test the SLA monitoring manually:
```bash
# Call the API endpoint
curl -X POST http://localhost:3000/api/sla/monitor \
  -H "Authorization: Bearer your_session_token"
```

### Automated Monitoring Options

#### Option 1: Vercel Cron Jobs (Recommended)
Create `vercel.json` in project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/sla-monitor",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

#### Option 2: GitHub Actions
Create `.github/workflows/sla-monitor.yml`:
```yaml
name: SLA Monitor
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
jobs:
  sla-monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Call SLA Monitor
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/sla-monitor" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### Option 3: External Cron Service
Use services like:
- [cron-job.org](https://cron-job.org)
- [easycron.com](https://easycron.com)
- Your server's crontab

Set up to call: `GET https://yourapp.com/api/cron/sla-monitor`

## 📋 Database Requirements

The system automatically creates these tables:
- `sla_notification_log` - Tracks sent notifications to prevent spam

## 🔍 Monitoring & Logs

### Check SLA Status
```bash
GET /api/sla/monitor
```

### View Recent Notifications
The API returns recent notification activity and system status.

### Console Logs
Monitor your application logs for:
- `🔍 Starting SLA compliance check...`
- `✅ SLA notification sent to [user] for task [code]`
- `❌ Failed to send SLA notification: [error]`

## 📊 Notification Logic

### Task Status Monitoring
- **MENUNGGU_PROSES_USER**: Checks `assigneeStartTaskDeadline`
- **SEDANG_DIPROSES_USER**: Checks `assigneeWorkDeadline`
- **MENUNGGU_REVIEW_PM**: Checks `pmReviewDeadline`

### Notification Types
1. **Warning** (30 min before deadline):
   - ⚠️ Yellow alert
   - "Task deadline approaching"
   - Sent once per task

2. **Overdue** (past deadline):
   - 🚨 Red alert  
   - "Task overdue - SLA alert"
   - Sent every 30 minutes until resolved

### Anti-Spam Protection
- Warnings: Max 1 per hour per task
- Overdue: Max 1 per 30 minutes per task
- Tracked in `sla_notification_log` table

## 🛠️ Troubleshooting

### WhatsApp Messages Not Sending
1. Check `WHATSAPP_TOKEN` is correct
2. Verify API provider is working
3. Check phone number format (must include country code)
4. Review console logs for API errors

### Cron Jobs Not Running
1. Verify cron service is configured correctly
2. Check `CRON_SECRET` if using authorization
3. Monitor application logs for cron execution
4. Test manual API calls first

### Database Errors
1. Ensure Prisma migrations are applied
2. Check database connection
3. Verify table permissions

## 📞 Phone Number Format

Employee phone numbers in the `pegawai` table should be in format:
- `081234567890` (Indonesian format)
- `6281234567890` (International format)
- `+6281234567890` (With plus sign)

The system automatically converts to WhatsApp-compatible format.

## 🔐 Security Considerations

1. **API Token Security**: Keep WhatsApp API tokens secure
2. **Cron Authorization**: Use `CRON_SECRET` for public endpoints
3. **Rate Limiting**: Monitor API usage to avoid limits
4. **Data Privacy**: Ensure compliance with data protection laws

## 📈 Monitoring Dashboard

Consider adding these metrics to your monitoring:
- Notifications sent per day
- SLA compliance rates
- Failed notification attempts
- Average response times

## 🎛️ Configuration Options

You can customize the notification behavior by modifying:
- Warning threshold (default: 30 minutes)
- Overdue notification frequency (default: 30 minutes)
- Message templates in `whatsappService.ts`
- Monitoring frequency (default: 15 minutes)
