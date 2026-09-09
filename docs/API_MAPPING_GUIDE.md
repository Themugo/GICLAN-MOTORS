# KAYAD | API Mapping & Integration Guide
## Frontend-to-Backend Synchronization (Live Auction & Escrow Hub)

This document provides the technical mapping required to connect the KAYAD high-fidelity frontend screens to a functional backend. It is designed for consumption by AI software engineering agents (e.g., OpenHands, Devin) or full-stack developers.

---

### 1. Live Bidding Room ({{DATA:SCREEN:SCREEN_3}})
**Objective:** Synchronize real-time auction state and user bidding actions.

#### A. Data Fetching (GET)
*   **Endpoint:** `/api/auctions/{auction_id}/status`
*   **UI Mapping:**
    *   `Current High Bid`: Map to `.text-display-lg` (e.g., "$285,500").
    *   `Market Pulse`: Map to progress bar percentage and color logic (Bullish/Bearish).
    *   `Collectors/Watchers`: Map to the "1,248" counter.
    *   `Bidding History`: Map to the `Real-time Bidding History` list items. Each entry needs: `timestamp`, `paddle_id`, `location`, and `amount`.

#### B. User Actions (POST)
*   **Endpoint:** `/api/auctions/{auction_id}/bid`
*   **Payload:** `{ "amount": number, "bidder_id": string }`
*   **Trigger:** `PLACE BID` button.
*   **Logic:** 
    *   Frontend should validate that `amount` >= `Next Min Bid`.
    *   On 200 OK: Trigger a UI pulse on the bid amount and append to the top of the history list.

#### C. Real-time Integration (WebSockets)
*   **Socket Event:** `auction_update`
*   **Handler:** Update the bid amount, pulse the "LIVE" indicator, and add new bids to the ticker without page refresh.

---

### 2. Secure Escrow Hub ({{DATA:SCREEN:SCREEN_16}})
**Objective:** Manage the immutable transaction ledger and admin-controlled payouts.

#### A. Escrow State (GET)
*   **Endpoint:** `/api/escrow/transactions/{transaction_id}`
*   **UI Mapping:**
    *   `Total Funds Held`: Map to primary balance display.
    *   `Commission %`: Fetch the current `admin_commission_rate` (default 2.5%).
    *   `Timeline`: Map statuses (Deposit Received, Inspection Passed, Funds Released) to the vertical stepper.

#### B. Admin Monetization Controls (PATCH)
*   **Endpoint:** `/api/admin/settings/monetization`
*   **Payload:** `{ "commission_rate": float, "waiver_active": boolean }`
*   **UI Mapping:** Connect sliders or input fields in the Admin view to this endpoint to adjust platform fees dynamically.

#### C. Immutable Logs (GET)
*   **Endpoint:** `/api/escrow/audit-logs`
*   **UI Mapping:** Render the transaction table with `transaction_hash`, `status`, and `timestamp`. Labels should clearly indicate that records are "IMMUTABLE."

---

### 3. Shared Identity & Security
*   **Headers:** All requests must include `Authorization: Bearer <JWT_TOKEN>`.
*   **Biometrics:** The `Secure Bidder Authorization` ({{DATA:SCREEN:SCREEN_6}}) should trigger a call to `/api/auth/verify-biometric` before allowing deposit submission.

---
**Status:** READY FOR IMPLEMENTATION
**Target Architecture:** RESTful API with WebSocket (Socket.io/ws) support.
