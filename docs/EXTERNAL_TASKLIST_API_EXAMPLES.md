# External Tasklist API - Integration Examples

This document provides practical examples for integrating with the External Tasklist API in various programming languages and scenarios.

## Table of Contents

- [JavaScript/Node.js Examples](#javascriptnodejs-examples)
- [Python Examples](#python-examples)
- [PHP Examples](#php-examples)
- [C# Examples](#c-examples)
- [Common Integration Patterns](#common-integration-patterns)
- [Error Handling Strategies](#error-handling-strategies)

## JavaScript/Node.js Examples

### Basic Task Creation

```javascript
const API_URL = 'http://localhost:3000';
const API_KEY = process.env.EXTERNAL_API_KEY;

async function createTask(taskData) {
  try {
    const response = await fetch(`${API_URL}/api/external/tasklist`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${result.error}`);
    }

    return result.data.task;
  } catch (error) {
    console.error('Failed to create task:', error.message);
    throw error;
  }
}

// Usage
const newTask = await createTask({
  projectCode: 'PRJ-001',
  moduleCode: '01.01',
  assigneeUsername: 'developer1',
  scheduleAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  description: 'Implement user authentication',
  taskComplexity: 'MEDIUM'
});

console.log('Created task:', newTask.code);
```

### Task Creation with File Uploads

```javascript
const fs = require('fs');
const FormData = require('form-data');

async function createTaskWithFiles(taskData, filePaths) {
  try {
    const formData = new FormData();
    
    // Add task data fields
    formData.append('projectCode', taskData.projectCode);
    formData.append('moduleCode', taskData.moduleCode);
    formData.append('assigneeUsername', taskData.assigneeUsername);
    formData.append('scheduleAt', taskData.scheduleAt);
    
    if (taskData.description) {
      formData.append('description', taskData.description);
    }
    if (taskData.taskComplexity) {
      formData.append('taskComplexity', taskData.taskComplexity);
    }
    if (taskData.tasklistType) {
      formData.append('tasklistType', taskData.tasklistType);
    }
    
    // Add files
    for (const filePath of filePaths) {
      const fileStream = fs.createReadStream(filePath);
      const fileName = filePath.split('/').pop();
      formData.append('files', fileStream, fileName);
    }
    
    const response = await fetch(`${API_URL}/api/external/tasklist`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${result.error}`);
    }

    return result.data.task;
  } catch (error) {
    console.error('Failed to create task with files:', error.message);
    throw error;
  }
}

// Usage
const taskWithFiles = await createTaskWithFiles(
  {
    projectCode: 'PRJ-001',
    moduleCode: '01.01',
    assigneeUsername: 'developer1',
    scheduleAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    description: 'Implement feature with attachments',
    taskComplexity: 'HARD'
  },
  [
    './screenshots/screenshot1.png',
    './documents/requirements.pdf',
    './designs/mockup.jpg'
  ]
);

console.log('Created task with', taskWithFiles.uploadedFiles.length, 'files');
```

### Task Update with Retry Logic

```javascript
async function updateTaskWithRetry(taskCode, updates, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_URL}/api/external/tasklist`, {
        method: 'PUT',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskCode,
          ...updates
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error: ${result.error}`);
      }

      return result.data.task;
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Usage
const updatedTask = await updateTaskWithRetry('01.01 - 1', {
  status: 'SEDANG_DIPROSES_USER',
  description: 'Updated description'
});
```

### Batch Task Creation

```javascript
async function createTasksBatch(tasks) {
  const results = [];
  const concurrency = 3; // Process 3 tasks at a time
  
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (task, index) => {
      try {
        const result = await createTask(task);
        return { 
          index: i + index, 
          success: true, 
          task: result,
          originalData: task 
        };
      } catch (error) {
        return { 
          index: i + index, 
          success: false, 
          error: error.message,
          originalData: task 
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + concurrency < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Usage
const tasksToCreate = [
  {
    projectCode: 'PRJ-001',
    moduleCode: '01.01',
    assigneeUsername: 'dev1',
    scheduleAt: '2024-10-15T10:00:00.000Z',
    description: 'Task 1'
  },
  {
    projectCode: 'PRJ-001',
    moduleCode: '01.02',
    assigneeUsername: 'dev2',
    scheduleAt: '2024-10-15T11:00:00.000Z',
    description: 'Task 2'
  }
];

const results = await createTasksBatch(tasksToCreate);
console.log(`Created ${results.filter(r => r.success).length} tasks successfully`);
```

## Python Examples

### Basic Task Management Class

```python
import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class TasklistAPI:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        })
    
    def create_task(self, task_data: Dict) -> Dict:
        """Create a new task"""
        url = f"{self.base_url}/api/external/tasklist"
        
        response = self.session.post(url, json=task_data)
        
        if not response.ok:
            error_data = response.json()
            raise Exception(f"API Error: {error_data.get('error', 'Unknown error')}")
        
        return response.json()['data']['task']
    
    def create_task_with_files(self, task_data: Dict, file_paths: List[str]) -> Dict:
        """Create a new task with file attachments"""
        url = f"{self.base_url}/api/external/tasklist"
        
        # Prepare multipart form data
        files = []
        for file_path in file_paths:
            files.append(('files', open(file_path, 'rb')))
        
        # Remove Content-Type header for multipart
        headers = {'X-API-Key': self.api_key}
        
        try:
            response = requests.post(url, data=task_data, files=files, headers=headers)
            
            if not response.ok:
                error_data = response.json()
                raise Exception(f"API Error: {error_data.get('error', 'Unknown error')}")
            
            return response.json()['data']['task']
        finally:
            # Close all file handles
            for _, file_handle in files:
                file_handle.close()
    
    def update_task(self, task_code: str, updates: Dict) -> Dict:
        """Update an existing task"""
        url = f"{self.base_url}/api/external/tasklist"
        
        data = {'taskCode': task_code, **updates}
        response = self.session.put(url, json=data)
        
        if not response.ok:
            error_data = response.json()
            raise Exception(f"API Error: {error_data.get('error', 'Unknown error')}")
        
        return response.json()['data']['task']
    
    def validate_api_key(self) -> bool:
        """Test if API key is valid"""
        url = f"{self.base_url}/api/external/tasklist"
        
        try:
            response = self.session.get(url)
            return response.ok and response.json().get('success', False)
        except:
            return False

# Usage
api = TasklistAPI('http://localhost:3000', 'your-api-key-here')

# Validate connection
if not api.validate_api_key():
    raise Exception("Invalid API key or server not accessible")

# Create task
task = api.create_task({
    'projectCode': 'PRJ-001',
    'moduleCode': '01.01',
    'assigneeUsername': 'developer1',
    'scheduleAt': (datetime.now() + timedelta(days=1)).isoformat() + 'Z',
    'description': 'Python created task',
    'taskComplexity': 'MEDIUM'
})

print(f"Created task: {task['code']}")

# Update task
updated_task = api.update_task(task['code'], {
    'status': 'SEDANG_DIPROSES_USER',
    'description': 'Updated from Python'
})

print(f"Updated task status: {updated_task['status']}")
```

### Bulk Operations with Progress Tracking

```python
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

class BulkTaskManager:
    def __init__(self, api: TasklistAPI):
        self.api = api
    
    def create_tasks_bulk(self, tasks: List[Dict], max_workers: int = 3) -> List[Dict]:
        """Create multiple tasks with progress tracking"""
        results = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_task = {
                executor.submit(self._create_task_safe, task): task 
                for task in tasks
            }
            
            # Process completed tasks
            for i, future in enumerate(as_completed(future_to_task), 1):
                original_task = future_to_task[future]
                
                try:
                    result = future.result()
                    results.append({
                        'success': True,
                        'task': result,
                        'original': original_task
                    })
                    print(f"✅ Progress: {i}/{len(tasks)} - Created task {result['code']}")
                except Exception as e:
                    results.append({
                        'success': False,
                        'error': str(e),
                        'original': original_task
                    })
                    print(f"❌ Progress: {i}/{len(tasks)} - Failed: {str(e)}")
        
        return results
    
    def _create_task_safe(self, task_data: Dict) -> Dict:
        """Create task with retry logic"""
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                return self.api.create_task(task_data)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                time.sleep(1 * (attempt + 1))  # Exponential backoff

# Usage
bulk_manager = BulkTaskManager(api)

tasks_to_create = [
    {
        'projectCode': 'PRJ-001',
        'moduleCode': '01.01',
        'assigneeUsername': 'dev1',
        'scheduleAt': (datetime.now() + timedelta(days=1)).isoformat() + 'Z',
        'description': f'Bulk task {i}',
        'taskComplexity': 'MEDIUM'
    }
    for i in range(1, 6)  # Create 5 tasks
]

results = bulk_manager.create_tasks_bulk(tasks_to_create)
successful = [r for r in results if r['success']]
failed = [r for r in results if not r['success']]

print(f"\n📊 Summary: {len(successful)} successful, {len(failed)} failed")
```

## PHP Examples

### Simple Task Management

```php
<?php

class TasklistAPI {
    private $baseUrl;
    private $apiKey;
    
    public function __construct($baseUrl, $apiKey) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }
    
    public function createTask($taskData) {
        $url = $this->baseUrl . '/api/external/tasklist';
        
        $response = $this->makeRequest('POST', $url, $taskData);
        
        if (!$response['success']) {
            throw new Exception('API Error: ' . $response['error']);
        }
        
        return $response['data']['task'];
    }
    
    public function updateTask($taskCode, $updates) {
        $url = $this->baseUrl . '/api/external/tasklist';
        
        $data = array_merge(['taskCode' => $taskCode], $updates);
        $response = $this->makeRequest('PUT', $url, $data);
        
        if (!$response['success']) {
            throw new Exception('API Error: ' . $response['error']);
        }
        
        return $response['data']['task'];
    }
    
    private function makeRequest($method, $url, $data = null) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'X-API-Key: ' . $this->apiKey,
                'Content-Type: application/json'
            ]
        ]);
        
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $decoded = json_decode($response, true);
        
        if ($httpCode >= 400) {
            return [
                'success' => false,
                'error' => $decoded['error'] ?? 'Unknown error'
            ];
        }
        
        return $decoded;
    }
}

// Usage
$api = new TasklistAPI('http://localhost:3000', 'your-api-key-here');

try {
    // Create task
    $task = $api->createTask([
        'projectCode' => 'PRJ-001',
        'moduleCode' => '01.01',
        'assigneeUsername' => 'developer1',
        'scheduleAt' => date('c', strtotime('+1 day')),
        'description' => 'PHP created task',
        'taskComplexity' => 'MEDIUM'
    ]);
    
    echo "Created task: " . $task['code'] . "\n";
    
    // Update task
    $updatedTask = $api->updateTask($task['code'], [
        'status' => 'SEDANG_DIPROSES_USER',
        'description' => 'Updated from PHP'
    ]);
    
    echo "Updated task status: " . $updatedTask['status'] . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

## C# Examples

### Task Management Service

```csharp
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class TasklistApiService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    
    public TasklistApiService(string baseUrl, string apiKey)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", apiKey);
    }
    
    public async Task<TaskResponse> CreateTaskAsync(CreateTaskRequest request)
    {
        var url = $"{_baseUrl}/api/external/tasklist";
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync(url, content);
        var responseContent = await response.Content.ReadAsStringAsync();
        
        if (!response.IsSuccessStatusCode)
        {
            var error = JsonSerializer.Deserialize<ErrorResponse>(responseContent);
            throw new Exception($"API Error: {error.Error}");
        }
        
        var result = JsonSerializer.Deserialize<ApiResponse<TaskResponse>>(responseContent);
        return result.Data.Task;
    }
    
    public async Task<TaskResponse> UpdateTaskAsync(string taskCode, UpdateTaskRequest request)
    {
        var url = $"{_baseUrl}/api/external/tasklist";
        
        var updateData = new Dictionary<string, object>
        {
            ["taskCode"] = taskCode
        };
        
        if (!string.IsNullOrEmpty(request.Description))
            updateData["description"] = request.Description;
        if (!string.IsNullOrEmpty(request.Status))
            updateData["status"] = request.Status;
        if (!string.IsNullOrEmpty(request.TaskComplexity))
            updateData["taskComplexity"] = request.TaskComplexity;
        if (request.ScheduleAt.HasValue)
            updateData["scheduleAt"] = request.ScheduleAt.Value.ToString("O");
        
        var json = JsonSerializer.Serialize(updateData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PutAsync(url, content);
        var responseContent = await response.Content.ReadAsStringAsync();
        
        if (!response.IsSuccessStatusCode)
        {
            var error = JsonSerializer.Deserialize<ErrorResponse>(responseContent);
            throw new Exception($"API Error: {error.Error}");
        }
        
        var result = JsonSerializer.Deserialize<ApiResponse<TaskResponse>>(responseContent);
        return result.Data.Task;
    }
}

// Data models
public class CreateTaskRequest
{
    public string ProjectCode { get; set; }
    public string ModuleCode { get; set; }
    public string AssigneeUsername { get; set; }
    public DateTime ScheduleAt { get; set; }
    public string Description { get; set; }
    public string TasklistType { get; set; } = "DEVELOPMENT";
    public string TaskComplexity { get; set; } = "MEDIUM";
    public string Status { get; set; } = "MENUNGGU_PROSES_USER";
}

public class UpdateTaskRequest
{
    public string Description { get; set; }
    public string Status { get; set; }
    public string TaskComplexity { get; set; }
    public DateTime? ScheduleAt { get; set; }
}

public class TaskResponse
{
    public int Id { get; set; }
    public string Code { get; set; }
    public string Description { get; set; }
    public string Status { get; set; }
    public int StatusCode { get; set; }
    public DateTime ScheduleAt { get; set; }
    public string TasklistType { get; set; }
    public string TaskComplexity { get; set; }
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public T Data { get; set; }
}

public class ErrorResponse
{
    public bool Success { get; set; }
    public string Error { get; set; }
}

// Usage example
class Program
{
    static async Task Main(string[] args)
    {
        var api = new TasklistApiService("http://localhost:3000", "your-api-key-here");
        
        try
        {
            // Create task
            var createRequest = new CreateTaskRequest
            {
                ProjectCode = "PRJ-001",
                ModuleCode = "01.01",
                AssigneeUsername = "developer1",
                ScheduleAt = DateTime.Now.AddDays(1),
                Description = "C# created task",
                TaskComplexity = "MEDIUM"
            };
            
            var task = await api.CreateTaskAsync(createRequest);
            Console.WriteLine($"Created task: {task.Code}");
            
            // Update task
            var updateRequest = new UpdateTaskRequest
            {
                Status = "SEDANG_DIPROSES_USER",
                Description = "Updated from C#"
            };
            
            var updatedTask = await api.UpdateTaskAsync(task.Code, updateRequest);
            Console.WriteLine($"Updated task status: {updatedTask.Status}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}
```

## Common Integration Patterns

### 1. Webhook Integration

When external events trigger task creation:

```javascript
// Express.js webhook handler
app.post('/webhook/task-created', async (req, res) => {
  try {
    const { projectId, moduleId, assigneeId, dueDate, description } = req.body;
    
    // Map external IDs to internal codes
    const projectCode = await getProjectCode(projectId);
    const moduleCode = await getModuleCode(moduleId);
    const username = await getUsername(assigneeId);
    
    const task = await createTask({
      projectCode,
      moduleCode,
      assigneeUsername: username,
      scheduleAt: dueDate,
      description,
      taskComplexity: 'MEDIUM'
    });
    
    res.json({ success: true, taskCode: task.code });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 2. Scheduled Sync

Periodic synchronization with external systems:

```javascript
const cron = require('node-cron');

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Starting scheduled task sync...');
  
  try {
    const externalTasks = await fetchExternalTasks();
    const results = await syncTasks(externalTasks);
    
    console.log(`Sync completed: ${results.created} created, ${results.updated} updated`);
  } catch (error) {
    console.error('Sync failed:', error);
  }
});

async function syncTasks(externalTasks) {
  let created = 0, updated = 0;
  
  for (const extTask of externalTasks) {
    try {
      if (extTask.isNew) {
        await createTask(mapExternalToInternal(extTask));
        created++;
      } else {
        await updateTask(extTask.code, mapExternalUpdates(extTask));
        updated++;
      }
    } catch (error) {
      console.error(`Failed to sync task ${extTask.id}:`, error);
    }
  }
  
  return { created, updated };
}
```

### 3. Queue-Based Processing

Using message queues for reliable task processing:

```javascript
const Queue = require('bull');
const taskQueue = new Queue('task processing');

// Producer
async function queueTaskCreation(taskData) {
  await taskQueue.add('create-task', taskData, {
    attempts: 3,
    backoff: 'exponential',
    delay: 1000
  });
}

// Consumer
taskQueue.process('create-task', async (job) => {
  const { data } = job;
  
  try {
    const task = await createTask(data);
    console.log(`Task created: ${task.code}`);
    return task;
  } catch (error) {
    console.error(`Failed to create task:`, error);
    throw error; // Will trigger retry
  }
});

// Error handling
taskQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});
```

## Error Handling Strategies

### 1. Exponential Backoff

```javascript
async function withExponentialBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
const task = await withExponentialBackoff(() => 
  createTask(taskData)
);
```

### 2. Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const circuitBreaker = new CircuitBreaker();

const task = await circuitBreaker.execute(() => 
  createTask(taskData)
);
```

### 3. Graceful Degradation

```javascript
async function createTaskWithFallback(taskData) {
  try {
    // Try primary API
    return await createTask(taskData);
  } catch (error) {
    console.warn('Primary API failed, trying fallback:', error.message);
    
    try {
      // Try alternative approach
      return await createTaskViaDatabase(taskData);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError.message);
      
      // Store for later retry
      await storeFailedTask(taskData, error.message);
      throw new Error('Task creation failed, stored for retry');
    }
  }
}
```

These examples provide a solid foundation for integrating with the External Tasklist API in various scenarios and programming languages. Choose the patterns that best fit your application's architecture and requirements.
