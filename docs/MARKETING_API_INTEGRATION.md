# Marketing API Integration

This document describes the integration between the LogBook system and the marketing system for blueprint approval notifications.

## Overview

The LogBook system automatically sends notifications to the marketing system for two key project milestones:

1. **Blueprint Approval**: When a blueprint is approved, notifies marketing team about project approval
2. **Go Live Completion**: When a project's Go Live status changes to COMPLETED, notifies marketing team about project deployment

This enables the marketing team to be immediately informed about project progress and take appropriate actions.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Marketing API Configuration
MARKETING_API_URL="http://192.168.1.9:3007/api/external"
MARKETING_API_KEY="your-marketing-api-key-here"

# Marketing API Endpoints
MARKETING_BLUEPRINT_ENDPOINT="/contracts/update-status"
MARKETING_GOLIVE_ENDPOINT="/contracts/update-status-development"
```

**Required Variables:**
- `MARKETING_API_URL`: The base URL of the marketing system API
- `MARKETING_API_KEY`: API key for authentication with the marketing system
- `MARKETING_BLUEPRINT_ENDPOINT`: Endpoint for blueprint approval notifications
- `MARKETING_GOLIVE_ENDPOINT`: Endpoint for Go Live completion notifications

## API Integration

### Endpoints Called

**Blueprint Approval:**
```
POST {MARKETING_API_URL}{MARKETING_BLUEPRINT_ENDPOINT}
```

**Go Live Completion:**
```
POST {MARKETING_API_URL}{MARKETING_GOLIVE_ENDPOINT}
```

### Request Headers

```
Content-Type: application/json
X-API-Key: {MARKETING_API_KEY}
User-Agent: LogBook-System/1.0
```

### Request Payload

```json
{
  "projectId": "PRJ-001",
  "projectName": "E-Commerce System",
  "customerName": "ABC Company",
  "blueprintId": 123,
  "approvedAt": "2024-10-07T14:30:00.000Z",
  "approvedBy": 456,
  "projectCode": "PRJ-001",
  "companyName": "ABC Company Ltd"
}
```

**Payload Fields:**
- `projectId`: Project identifier (kodeProyek or numeric ID)
- `projectName`: Name of the project (namaProyek)
- `customerName`: Customer/client name
- `blueprintId`: Unique blueprint ID
- `approvedAt`: ISO timestamp of approval
- `approvedBy`: User ID who approved the blueprint
- `projectCode`: Project code (optional)
- `companyName`: Company name (optional)

## Implementation Details

### Files Modified

1. **Environment Configuration**
   - `.env.development` - Added marketing API configuration

2. **Marketing Service**
   - `src/lib/marketingService.ts` - New service for marketing API calls

3. **Blueprint Approval API**
   - `src/app/api/blueprint/[id]/approve/route.ts` - Integrated marketing notification

### Error Handling

The marketing API integration is designed to be **non-blocking**:

- If marketing API is not configured, a warning is logged but blueprint approval continues
- If marketing API call fails, an error is logged but blueprint approval is not affected
- Marketing API calls have a 30-second timeout to prevent hanging requests
- All marketing errors are caught and logged without affecting the main workflow

### Logging

The system provides comprehensive logging for marketing API interactions:

```
✅ Success: "Marketing notification sent successfully for blueprint: 123"
⚠️  Warning: "Marketing API configuration missing. Skipping marketing notification."
❌ Error: "Marketing notification failed for blueprint: 123 - API error: 500 Internal Server Error"
```

## Testing

### Manual Testing

You can test the marketing integration by:

1. **Configure Environment Variables**
   ```bash
   # Set in your .env file
   MARKETING_API_URL="https://your-marketing-api.com/api"
   MARKETING_API_KEY="your-api-key"
   ```

2. **Approve a Blueprint**
   ```bash
   curl -X PUT "http://localhost:3000/api/blueprint/123/approve" \
     -H "Content-Type: application/json" \
     -d '{"userId": 1, "notes": "Test approval"}'
   ```

3. **Check Logs**
   Monitor the console output for marketing API logs.

### Mock Marketing API

For testing purposes, you can create a simple mock marketing API:

```javascript
// mock-marketing-api.js
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/blueprint-approved', (req, res) => {
  console.log('Received blueprint approval:', req.body);
  
  // Validate API key
  if (req.headers['x-api-key'] !== 'test-api-key') {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  res.json({ 
    success: true, 
    message: 'Blueprint approval received',
    data: { id: Date.now() }
  });
});

app.listen(4001, () => {
  console.log('Mock marketing API running on port 4001');
});
```

Then set:
```env
MARKETING_API_URL="http://localhost:4001/api"
MARKETING_API_KEY="test-api-key"
```

## Security Considerations

1. **API Key Protection**: Store the marketing API key securely in environment variables
2. **HTTPS Only**: Use HTTPS URLs for production marketing API endpoints
3. **Request Timeout**: API calls have a 30-second timeout to prevent resource exhaustion
4. **Error Isolation**: Marketing API failures don't affect core blueprint functionality

## Troubleshooting

### Common Issues

1. **Marketing API Not Called**
   - Check if `MARKETING_API_URL` and `MARKETING_API_KEY` are set
   - Verify environment variables are loaded correctly

2. **API Call Timeout**
   - Check network connectivity to marketing system
   - Verify marketing API endpoint is responsive
   - Consider increasing timeout if needed

3. **Authentication Errors**
   - Verify `MARKETING_API_KEY` is correct
   - Check if marketing system expects different header format

4. **Payload Errors**
   - Ensure marketing system accepts the payload format
   - Check if additional fields are required

### Debug Mode

Enable debug logging by checking the console output when approving blueprints. All marketing API interactions are logged with detailed information.

## Future Enhancements

Potential improvements for the marketing integration:

1. **Retry Logic**: Implement automatic retries for failed API calls
2. **Queue System**: Use a message queue for reliable delivery
3. **Webhook Verification**: Add webhook signature verification
4. **Batch Notifications**: Support batch notifications for multiple approvals
5. **Status Tracking**: Track marketing notification status in database
