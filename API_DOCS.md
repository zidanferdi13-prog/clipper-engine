# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All authenticated endpoints require Bearer token in header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register
Create new user account.

**POST** `/auth/register`

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "plan": "free",
      "credits": 10
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Login
Login to existing account.

**POST** `/auth/login`

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "plan": "free",
      "credits": 10
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## Job Endpoints

### Create Job
Create new clip generation job.

**POST** `/jobs/create` 🔒

**Body:**
```json
{
  "sourceUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "settings": {
    "clips": 5,
    "subtitleStyle": "tiktok",
    "language": "id",
    "aspectRatio": "9:16"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "job": {
      "id": "...",
      "sourceUrl": "https://youtube.com/watch?v=...",
      "status": "pending",
      "progress": 0,
      "settings": {
        "clips": 5,
        "subtitleStyle": "tiktok",
        "aspectRatio": "9:16"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "remainingCredits": 9
  }
}
```

---

### Get My Jobs
List all jobs for current user.

**GET** `/jobs/my-jobs` 🔒

**Query Params:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)
- `status` (optional) - Filter by status

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "_id": "...",
        "sourceUrl": "https://youtube.com/watch?v=...",
        "status": "completed",
        "progress": 100,
        "settings": { ... },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalPages": 5,
    "currentPage": 1,
    "total": 50
  }
}
```

---

### Get Job by ID
Get details of specific job.

**GET** `/jobs/:id` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "job": {
      "_id": "...",
      "userId": "...",
      "sourceUrl": "https://youtube.com/watch?v=...",
      "status": "completed",
      "progress": 100,
      "settings": {
        "clips": 5,
        "subtitleStyle": "tiktok"
      },
      "metadata": {
        "duration": 600,
        "videoUrl": "/storage/raw/...",
        "thumbnailUrl": "/storage/thumbnails/..."
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T00:10:00.000Z"
    }
  }
}
```

---

### Delete Job
Delete a job.

**DELETE** `/jobs/:id` 🔒

**Response:**
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

---

## Clip Endpoints

### Get Clip by ID
Get details of specific clip.

**GET** `/clips/:id` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "clip": {
      "_id": "...",
      "jobId": "...",
      "title": "Rahasia Closing",
      "description": "Segment tentang teknik closing",
      "start": 32.5,
      "end": 58.2,
      "duration": 25.7,
      "score": 92,
      "fileUrl": "/storage/clips/...",
      "thumbnailUrl": "/storage/thumbnails/...",
      "status": "completed",
      "aiAnalysis": {
        "hookStrength": 95,
        "emotionalTone": "inspiring",
        "keywords": ["closing", "sales", "tips"],
        "category": "business"
      }
    }
  }
}
```

---

### Get Clips by Job ID
Get all clips for a job.

**GET** `/clips/by-job/:jobId` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "clips": [
      {
        "_id": "...",
        "title": "Clip 1",
        "score": 95,
        ...
      }
    ],
    "total": 5
  }
}
```

---

## Usage Endpoints

### Get My Usage
Get current user's usage statistics.

**GET** `/usage/me` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "plan": "free",
      "creditsRemaining": 7
    },
    "usage": {
      "creditsUsed": 3,
      "minutesProcessed": 45
    }
  }
}
```

---

### Get Usage Stats
Get detailed usage statistics over time.

**GET** `/usage/stats` 🔒

**Query Params:**
- `days` (optional) - Number of days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "_id": "2024-01-01",
        "creditsUsed": 2,
        "minutesProcessed": 20,
        "count": 2
      }
    ],
    "period": "30 days"
  }
}
```

---

## Billing Endpoints

### Create Checkout
Create payment checkout session.

**POST** `/billing/checkout` 🔒

**Body:**
```json
{
  "plan": "pro"
}
```
or
```json
{
  "credits": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Checkout session created",
  "data": {
    "checkoutUrl": "https://payment-gateway.com/checkout/...",
    "type": "plan",
    "plan": "pro",
    "price": 29,
    "credits": 100
  }
}
```

---

### Get Billing History
Get payment history.

**GET** `/billing/history` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "_id": "...",
        "action": "credit_purchased",
        "creditsUsed": 50,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## Job Statuses

| Status | Description |
|--------|-------------|
| `pending` | Job created, waiting to start |
| `downloading` | Downloading video from source |
| `transcribing` | Extracting and transcribing audio |
| `analyzing` | AI analyzing content for best clips |
| `rendering` | Rendering video clips |
| `completed` | All clips ready |
| `failed` | Job failed |

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient credits/permissions)
- `404` - Not Found
- `500` - Server Error

---

## Rate Limiting

- General API: 100 requests / 15 minutes
- Auth endpoints: 5 requests / 15 minutes
- Job creation: 10 requests / 1 hour

---

🔒 = Requires authentication
