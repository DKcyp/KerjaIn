# External Projects Sync API - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Environment Configuration

Add to your `.env` file:
```env
CRM_API_KEY=logbook-sync-api-key-2024
```

### 2. Test the API

Run the test script:
```bash
node test-projects-sync-api.js
```

### 3. Basic Usage

```bash
curl -H "X-API-Key: logbook-sync-api-key-2024" \
     http://localhost:3000/api/external/projects/sync
```

## 📋 What You Get

The API returns **ALL projects** with complete data:

- ✅ **Project Details**: ID, code, name, timestamps
- ✅ **Team Members**: Simplified structure with position, username, and name
- ✅ **Module Hierarchy**: Complete module tree structure
- ✅ **Statistics**: Team count and module count

## 🔧 Integration Examples

### JavaScript (Fetch)
```javascript
const response = await fetch('/api/external/projects/sync', {
  headers: { 'X-API-Key': 'logbook-sync-api-key-2024' }
});
const { projects } = await response.json();
```

### Node.js (Axios)
```javascript
const axios = require('axios');
const { data } = await axios.get('/api/external/projects/sync', {
  headers: { 'X-API-Key': 'logbook-sync-api-key-2024' }
});
```

### Python (Requests)
```python
import requests
response = requests.get('/api/external/projects/sync', 
  headers={'X-API-Key': 'logbook-sync-api-key-2024'})
projects = response.json()['projects']
```

## 📊 Response Structure

```json
{
  "success": true,
  "totalProjects": 5,
  "projects": [
    {
      "id": 1,
      "kodeProyek": "PRJ-001",
      "namaProyek": "E-Commerce System",
      "team": [...],      // Simplified team members
      "modules": [...],   // Hierarchical module structure
      "stats": {...}      // Project statistics
    }
  ]
}
```

## 🛡️ Security

- **API Key Required**: All requests need `X-API-Key` header
- **Read-Only**: This endpoint only retrieves data
- **No Authentication**: External systems don't need user login

## ⚡ Performance

- **Optimized Queries**: Efficient database queries with joins
- **Complete Data**: Single request gets everything
- **Hierarchical Modules**: Pre-built module tree structure
- **Rich Statistics**: Pre-calculated task counts

## 🔄 Sync Patterns

### Scheduled Sync (Every 15 minutes)
```javascript
setInterval(syncProjects, 15 * 60 * 1000);
```

### On-Demand Sync
```javascript
button.onclick = () => syncProjects();
```

### Webhook Triggered
```javascript
app.post('/webhook/project-updated', syncProjects);
```

## 📖 Full Documentation

For complete API reference, see: [`EXTERNAL_PROJECTS_SYNC_API.md`](./EXTERNAL_PROJECTS_SYNC_API.md)

## 🧪 Testing

Test all functionality:
```bash
node test-projects-sync-api.js
```

Tests include:
- ✅ API key validation
- ✅ Data structure validation  
- ✅ Performance testing
- ✅ Documentation endpoint

## 🆘 Troubleshooting

### 401 Unauthorized
- Check `EXTERNAL_API_KEY` in environment
- Verify `X-API-Key` header in request

### 500 Server Error
- Check database connection
- Review server logs for details

### Slow Response
- Normal for large datasets
- Consider pagination if needed
- Check database performance

## 📞 Support

For questions or issues:
1. Check the full documentation
2. Run the test script for diagnostics
3. Review server logs
4. Contact the development team
