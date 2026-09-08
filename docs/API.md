# KAYAD API Documentation

## Overview

The KAYAD API provides endpoints for managing car listings, auctions, bids, escrow transactions, and user accounts. This is a RESTful API that uses JSON for request and response bodies.

## Base URL

| Environment | Base URL |
|------------|----------|
| Production | `https://api.kayad.space/api/v1` |
| Staging | `https://staging-api.kayad.space/api/v1` |
| Development | `http://localhost:5000/api/v1` |

## Authentication

### Getting a Token

1. **Register** - Create a new account
2. **Login** - Receive a JWT token
3. **Use Token** - Include in all subsequent requests

### Token Usage

Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your_token_here>
```

### Token Refresh

Tokens expire after 1 hour. Use the refresh endpoint to get a new token:

```http
POST /api/v1/auth/refresh
```

## Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Standard | 100 requests | per minute |
| Auth (login/register) | 5 requests | per 15 minutes |
| Read-only (GET) | 200 requests | per minute |

## Response Format

All responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description"
}
```

## Quick Start

### 1. Register a User

```bash
curl -X POST https://api.kayad.space/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "user"
  }'
```

### 2. Login

```bash
curl -X POST https://api.kayad.space/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": { ... }
}
```

### 3. List Cars

```bash
curl -X GET https://api.kayad.space/api/v1/cars \
  -H "Authorization: Bearer <token>"
```

### 4. Create a Car Listing (Dealer)

```bash
curl -X POST https://api.kayad.space/api/v1/cars \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Toyota Land Cruiser 2021",
    "brand": "Toyota",
    "model": "Land Cruiser",
    "year": 2021,
    "price": 8500000,
    "mileage": 45000,
    "fuel": "Diesel",
    "transmission": "Automatic"
  }'
```

### 5. Place a Bid

```bash
curl -X POST https://api.kayad.space/api/v1/bids \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "carId": "507f1f77bcf86cd799439011",
    "amount": 500000,
    "phone": "254712345678"
  }'
```

## Core Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get token |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Logout |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |
| GET | `/auth/me` | Get current user |

### Cars

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cars` | List all cars |
| GET | `/cars/:id` | Get car details |
| POST | `/cars` | Create car listing (dealer) |
| PUT | `/cars/:id` | Update car |
| DELETE | `/cars/:id` | Delete car |
| GET | `/cars/featured` | Get featured cars |
| GET | `/cars/search` | Search cars |

### Auctions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auctions` | List live auctions |
| GET | `/auctions/:id` | Get auction details |
| POST | `/auctions/:id/start` | Start auction (dealer) |
| POST | `/auctions/:id/end` | End auction (dealer) |
| POST | `/auctions/:id/extend` | Extend auction |

### Bids

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bids` | Place a bid |
| GET | `/bids/my` | Get my bids |
| GET | `/bids/:carId` | Get bids for a car |
| GET | `/bids/:id` | Get bid details |

### Escrow

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/escrow` | Get my escrows |
| GET | `/escrow/:id` | Get escrow details |
| POST | `/escrow/:id/fund` | Fund escrow |
| POST | `/escrow/:id/release` | Release to seller (admin) |
| POST | `/escrow/:id/refund` | Refund buyer (admin) |
| POST | `/escrow/:id/dispute` | Open dispute |

### Payments (M-Pesa)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/initiate` | Initiate M-Pesa payment |
| POST | `/payments/callback` | M-Pesa callback URL |
| GET | `/payments/status/:id` | Check payment status |
| GET | `/payments/my` | Get my payments |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get profile |
| PUT | `/users/me` | Update profile |
| GET | `/users/:id` | Get user profile |
| GET | `/users/:id/reviews` | Get user reviews |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get notifications |
| PUT | `/notifications/:id/read` | Mark as read |
| PUT | `/notifications/read-all` | Mark all as read |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/conversations` | Get conversations |
| GET | `/chat/conversations/:id/messages` | Get messages |
| POST | `/chat/conversations` | Start conversation |
| POST | `/chat/messages` | Send message |

## Data Models

### Car

```typescript
{
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel: "Petrol" | "Diesel" | "Electric" | "Hybrid";
  transmission: "Automatic" | "Manual";
  bodyType: string;
  color: string;
  condition: string;
  images: Array<{ url: string; thumb: string }>;
  dealer: {
    id: string;
    name: string;
    verified: boolean;
  };
  auction?: {
    status: "live" | "ended" | "upcoming";
    currentBid: number;
    endTime: string;
  };
  escrowEnabled: boolean;
  inspectionStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}
```

### Bid

```typescript
{
  id: string;
  carId: string;
  userId: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "outbid";
  maxBid?: number;
  isAuto: boolean;
  createdAt: string;
}
```

### Escrow

```typescript
{
  id: string;
  carId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  commission: number;
  sellerAmount: number;
  status: "pending" | "funded" | "vehicle_confirmed" | "delivered" | "released" | "refunded" | "disputed";
  timeline: {
    depositReceived: boolean;
    inspectionCompleted: boolean;
    deliveryConfirmed: boolean;
    fundsReleased: boolean;
  };
  history: Array<{
    action: string;
    by: string;
    at: string;
  }>;
  createdAt: string;
}
```

### Payment

```typescript
{
  id: string;
  userId: string;
  type: "bid" | "deposit" | "escrow" | "inspection";
  amount: number;
  status: "pending" | "success" | "failed" | "cancelled";
  mpesaReceipt?: string;
  checkoutRequestId?: string;
  createdAt: string;
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Webhooks

Subscribe to events for real-time updates:

### Events

| Event | Description |
|-------|-------------|
| `auction.started` | Auction has started |
| `auction.ended` | Auction has ended |
| `auction.bid` | New bid placed |
| `auction.outbid` | User has been outbid |
| `escrow.created` | New escrow created |
| `escrow.funded` | Escrow funded |
| `escrow.released` | Funds released |
| `payment.success` | Payment successful |
| `payment.failed` | Payment failed |

### Webhook Payload

```json
{
  "event": "auction.bid",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "carId": "507f1f77bcf86cd799439011",
    "bidId": "...",
    "amount": 500000,
    "bidderId": "..."
  }
}
```

## SDKs

### JavaScript/TypeScript

```bash
npm install @kayad/sdk
```

```javascript
import { KayadClient } from '@kayad/sdk';

const client = new KayadClient({
  apiKey: 'your_api_key',
  environment: 'production'
});

// List cars
const cars = await client.cars.list();

// Place bid
const bid = await client.bids.create({
  carId: '507f1f77bcf86cd799439011',
  amount: 500000,
  phone: '254712345678'
});
```

## Testing

### Sandbox Environment

Use the staging API for testing: `https://staging-api.kayad.space/api/v1`

### Test Data

Test M-Pesa payments with:
- Phone: `254700000000` to `254799999999`
- Amount: Any positive number

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kayad.space | (Set in env) |
| Dealer | dealer@kayad.space | (Set in env) |
| Buyer | buyer@kayad.space | (Set in env) |

## Support

- **API Support**: api@kayad.space
- **Documentation**: https://docs.kayad.space
- **Status Page**: https://status.kayad.space
- **GitHub Issues**: https://github.com/kayad/kayad-api/issues

## Frontend Screen-to-Backend Integration

This section provides UI-to-API mapping for the KAYAD high-fidelity frontend screens.

### 1. Live Bidding Room

**Objective:** Synchronize real-time auction state and user bidding actions.

#### Data Fetching (GET)
*   **Endpoint:** `/api/auctions/{auction_id}/status`
*   **UI Mapping:**
    *   `Current High Bid`: Map to `.text-display-lg` (e.g., "$285,500").
    *   `Market Pulse`: Map to progress bar percentage and color logic (Bullish/Bearish).
    *   `Collectors/Watchers`: Map to the counter.
    *   `Bidding History`: Map to the list items. Each entry needs: `timestamp`, `paddle_id`, `location`, and `amount`.

#### User Actions (POST)
*   **Endpoint:** `/api/auctions/{auction_id}/bid`
*   **Payload:** `{ "amount": number, "bidder_id": string }`
*   **Trigger:** `PLACE BID` button.
*   **Logic:**
    *   Frontend validates that `amount` >= `Next Min Bid`.
    *   On 200 OK: Trigger UI pulse on bid amount and append to history list.

#### Real-time Integration (WebSockets)
*   **Socket Event:** `auction_update`
*   **Handler:** Update bid amount, pulse "LIVE" indicator, add new bids to ticker.

### 2. Secure Escrow Hub

**Objective:** Manage the immutable transaction ledger and admin-controlled payouts.

#### Escrow State (GET)
*   **Endpoint:** `/api/escrow/transactions/{transaction_id}`
*   **UI Mapping:**
    *   `Total Funds Held`: Map to primary balance display.
    *   `Commission %`: Fetch `admin_commission_rate` (default 2.5%).
    *   `Timeline`: Map statuses (Deposit Received, Inspection Passed, Funds Released) to stepper.

#### Admin Monetization Controls (PATCH)
*   **Endpoint:** `/api/admin/settings/monetization`
*   **Payload:** `{ "commission_rate": float, "waiver_active": boolean }`

#### Immutable Logs (GET)
*   **Endpoint:** `/api/escrow/audit-logs`
*   **UI Mapping:** Render transaction table with `transaction_hash`, `status`, `timestamp`.

### 3. Shared Identity & Security
*   **Headers:** All requests include `Authorization: Bearer <JWT_TOKEN>`.
*   **Biometrics:** `/api/auth/verify-biometric` before deposit submission.

**Target Architecture:** RESTful API with WebSocket (Socket.io/ws) support.

## Changelog

See [CHANGES.md](../CHANGES.md) for API version history.

## Deprecation

Deprecated endpoints are marked with `X-Deprecated` header and will be removed after 6 months notice.
