---
title: API_GUIDE
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# KAYAD API Guide

**Version:** 2.0.0
**Base URL:** `https://api.kayad.space` (production) or `http://localhost:5000` (development)

---

## Overview

This guide provides comprehensive documentation for the KAYAD API endpoints. The API follows RESTful conventions and uses JSON for request/response bodies.

---

## Authentication

Most endpoints require authentication using JWT (JSON Web Tokens).

### Getting a Token

**POST** `/api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Using the Token

Include the token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

Access tokens expire after 1 hour. Use the refresh endpoint to get a new token:

**POST** `/api/auth/refresh`

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Global:** 500 requests per 15-minute window
- **Auth endpoints:** 20 requests per 15-minute window
- **Socket connections:** Rate limited per connection

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1620000000
```

---

## Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "details": { ... }
}
```

---

## Endpoints

### Authentication

#### Login
**POST** `/api/auth/login`
- Description: Authenticate user and receive JWT token
- Body: `{ email, password }`
- Auth: None

#### Register
**POST** `/api/auth/register`
- Description: Create new user account
- Body: `{ name, email, password, role? }`
- Auth: None

#### Refresh Token
**POST** `/api/auth/refresh`
- Description: Refresh access token
- Auth: Required (cookie-based)

#### Logout
**POST** `/api/auth/logout`
- Description: Invalidate current session
- Auth: Required

#### Get Current User
**GET** `/api/auth/me`
- Description: Get current user profile
- Auth: Required

---

### Cars

#### Get All Cars
**GET** `/api/cars`
- Description: Get paginated list of cars
- Query Params: `page`, `limit`, `search`, `make`, `model`, `minPrice`, `maxPrice`
- Auth: Optional

#### Get Car by ID
**GET** `/api/cars/:id`
- Description: Get detailed car information
- Auth: Optional

#### Create Car
**POST** `/api/cars`
- Description: Create new car listing (dealer/seller only)
- Body: Car object
- Auth: Required (seller role)

#### Update Car
**PUT** `/api/cars/:id`
- Description: Update car listing (owner only)
- Body: Car object
- Auth: Required (owner or admin)

#### Delete Car
**DELETE** `/api/cars/:id`
- Description: Delete car listing (owner only)
- Auth: Required (owner or admin)

---

### Auctions

#### Get Live Auctions
**GET** `/api/auctions/live`
- Description: Get currently live auctions
- Auth: Optional

#### Get Auction by ID
**GET** `/api/auctions/:id`
- Description: Get auction details
- Auth: Optional

#### Place Bid
**POST** `/api/bids`
- Description: Place a bid on an auction
- Body: `{ carId, amount }`
- Auth: Required

#### Get Bids for Car
**GET** `/api/bids/car/:carId`
- Description: Get all bids for a specific car
- Auth: Required (owner or admin)

---

### Payments

#### Initiate M-Pesa Payment
**POST** `/api/payments/mpesa/stkpush`
- Description: Initiate M-Pesa STK Push payment
- Body: `{ phone, amount, carId? }`
- Auth: Required

#### M-Pesa Callback
**POST** `/api/payments/callback`
- Description: M-Pesa payment callback (IP whitelisted)
- Auth: None (IP restricted)

#### Get Payment History
**GET** `/api/payments/history`
- Description: Get user payment history
- Auth: Required

---

### Escrow

#### Create Escrow
**POST** `/api/escrow`
- Description: Create escrow for a transaction
- Body: `{ carId, amount }`
- Auth: Required

#### Get Escrow by ID
**GET** `/api/escrow/:id`
- Description: Get escrow details
- Auth: Required (participant or admin)

#### Release Funds
**POST** `/api/escrow/:id/release`
- Description: Release escrow funds to seller
- Auth: Required (buyer or admin)

#### Refund Escrow
**POST** `/api/escrow/:id/refund`
- Description: Refund escrow to buyer
- Auth: Required (admin only)

---

### Users

#### Get User Profile
**GET** `/api/users/:id`
- Description: Get user profile
- Auth: Optional (public profile)

#### Update User Profile
**PUT** `/api/users/:id`
- Description: Update user profile
- Body: User object
- Auth: Required (owner or admin)

#### Change Password
**POST** `/api/users/change-password`
- Description: Change user password
- Body: `{ currentPassword, newPassword }`
- Auth: Required

---

### Admin

#### Get All Users
**GET** `/api/admin/users`
- Description: Get all users (paginated)
- Auth: Required (admin only)

#### Update User Role
**PUT** `/api/admin/users/:id/role`
- Description: Update user role
- Body: `{ role }`
- Auth: Required (admin only)

#### Ban User
**POST** `/api/admin/users/:id/ban`
- Description: Ban a user
- Auth: Required (admin only)

#### Get System Stats
**GET** `/api/admin/stats`
- Description: Get system statistics
- Auth: Required (admin only)

---

### WebSocket Events

Connect to WebSocket at: `wss://api.kayad.space` (production) or `ws://localhost:5000` (development)

#### Client → Server Events

**joinAuction**
```json
{
  "event": "joinAuction",
  "data": { "carId": "car_id" }
}
```

**leaveAuction**
```json
{
  "event": "leaveAuction",
  "data": { "carId": "car_id" }
}
```

**placeBid**
```json
{
  "event": "placeBid",
  "data": { "carId": "car_id", "amount": 50000 }
}
```

#### Server → Client Events

**newBid**
```json
{
  "event": "newBid",
  "data": {
    "carId": "car_id",
    "bid": { "amount": 50000, "user": "John Doe" },
    "currentBid": 50000
  }
}
```

**auctionEnded**
```json
{
  "event": "auctionEnded",
  "data": {
    "carId": "car_id",
    "winner": "user_id",
    "finalPrice": 50000
  }
}
```

**notification**
```json
{
  "event": "notification",
  "data": {
    "type": "info",
    "message": "You have a new message",
    "timestamp": "2026-05-23T09:00:00Z"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Maintenance mode |

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Items per page

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Filtering & Sorting

Most list endpoints support filtering and sorting:

**Filtering:**
```
GET /api/cars?make=Toyota&model=Camry&minPrice=500000&maxPrice=2000000
```

**Sorting:**
```
GET /api/cars?sort=price&order=asc
```

**Search:**
```
GET /api/cars?search=Toyota
```

---

## File Uploads

File uploads use multipart/form-data:

**POST** `/api/cars/:id/images`

**Request:**
```
Content-Type: multipart/form-data

images: [file1, file2, file3]
```

**Allowed formats:** jpg, jpeg, png, webp
**Max file size:** 5MB per file
**Max files:** 10 per request

---

## Webhooks

### M-Pesa Payment Callback

**Endpoint:** `/api/payments/callback`
**Method:** POST
**IP Whitelist:** Safaricom IPs only
**Authentication:** None (IP restricted)

---

## SDK & Libraries

### JavaScript/TypeScript

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.kayad.space',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get cars
const cars = await api.get('/api/cars');

// Place bid
const bid = await api.post('/api/bids', {
  carId: 'car_id',
  amount: 50000
});
```

### cURL

```bash
# Login
curl -X POST https://api.kayad.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get cars
curl https://api.kayad.space/api/cars \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Testing

### Test Environment

Base URL: `http://localhost:5000`

Use test credentials from `backend/.env.test.example`

### Postman Collection

A Postman collection is available in the repository for testing all endpoints.

---

## Support

For API support, contact: owner@kayad.space

For bug reports, use GitHub Issues: https://github.com/Themugo/KAYAD/issues

---

## Changelog

### v2.0.0 (2026-05-23)
- Added performance monitoring
- Enhanced PWA configuration
- Added compression middleware
- Improved error handling
- Added utility helper functions

### v1.0.0
- Initial API release
