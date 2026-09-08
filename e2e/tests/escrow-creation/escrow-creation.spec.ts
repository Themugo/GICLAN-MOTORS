/**
 * Escrow Creation E2E Tests
 *
 * Tests for escrow creation workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Escrow Creation Workflow', () => {
  let buyerToken: string;
  let dealerToken: string;
  let auctionId: string;

  test.beforeEach(async ({ page, request }) => {
    // Login as dealer
    const dealerCredentials = AuthHelper.getTestUser('dealer');
    dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);

    // Create and end auction to trigger escrow
    const auction = await ApiHelper.createAuction(request, dealerToken, {
      title: 'BMW X5 2021 Auction',
      vehicleId: 'test-vehicle-id',
      startingPrice: 7000000,
      reservePrice: 7500000,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    auctionId = auction.data._id;

    // Place winning bid
    const buyerCredentials = AuthHelper.getTestUser('buyer');
    buyerToken = await ApiHelper.loginApi(request, buyerCredentials.email, buyerCredentials.password);
    await ApiHelper.placeBid(request, buyerToken, auctionId, 7600000);

    // End auction
    await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/auctions/${auctionId}/end`, dealerToken, { status: 'ended' });
  });

  test.describe('Happy Path', () => {
    test('should auto-create escrow after auction ends', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      // Verify escrow created
      await expect(page.locator('[data-testid="escrow-item"]')).toBeVisible();
      await expect(page.locator('[data-testid="escrow-item"]')).toContainText('BMW X5');
    });

    test('should show escrow in pending payment status', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Verify status
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText('Pending Payment');
    });

    test('should notify buyer of escrow creation', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/notifications');

      // Verify notification
      await expect(page.locator('[data-testid="notification-item"]')).toContainText('Escrow created');
    });

    test('should notify seller of escrow creation', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto('/dealer/notifications');

      // Verify notification
      await expect(page.locator('[data-testid="notification-item"]')).toContainText('Escrow created');
    });

    test('should show correct escrow amount', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Verify amount
      await expect(page.locator('[data-testid="escrow-amount"]')).toContainText('7,600,000');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle manual escrow creation', async ({ page, request }) => {
      // Create manual escrow
      await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
        type: 'manual',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto('/dealer/escrow');

      // Verify manual escrow appears
      await expect(page.locator('[data-testid="escrow-item"]')).toContainText('Manual');
    });

    test('should handle escrow with custom terms', async ({ page, request }) => {
      // Create escrow with custom terms
      await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
        terms: 'Custom delivery terms: 7 days inspection period',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Verify custom terms
      await expect(page.locator('[data-testid="escrow-terms"]')).toContainText('Custom delivery terms');
    });

    test('should handle escrow for direct sale (non-auction)', async ({ page, request }) => {
      // Create escrow for direct sale
      await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
        type: 'direct',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      // Verify direct sale escrow
      await expect(page.locator('[data-testid="escrow-type"]')).toContainText('Direct Sale');
    });

    test('should handle escrow with partial payment option', async ({ page, request }) => {
      // Create escrow with partial payment
      await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
        partialPayment: {
          percentage: 30,
          amount: 1500000,
        },
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Verify partial payment option
      await expect(page.locator('[data-testid="partial-payment"]')).toContainText('30%');
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle escrow creation failure', async ({ page, request }) => {
      // Mock escrow creation failure
      await page.route('**/api/escrow', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Escrow creation failed' }) });
      });

      // Try to create escrow
      await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      // Verify error notification
      await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
    });

    test('should handle invalid auction state', async ({ page, request }) => {
      // Try to create escrow for active auction
      const activeAuction = await ApiHelper.createAuction(request, dealerToken, {
        title: 'Active Auction',
        vehicleId: 'test-vehicle-id',
        startingPrice: 7000000,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await ApiHelper.createEscrow(request, dealerToken, {
        auctionId: activeAuction.data._id,
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      // Verify error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('invalid auction state');
    });

    test('should handle notification failure', async ({ page }) => {
      // Mock notification failure
      await page.route('**/api/notifications/send', route => {
        route.fulfill({ status: 500 });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      // Escrow should still be created but with warning
      await expect(page.locator('[data-testid="escrow-item"]')).toBeVisible();
      await expect(page.locator('[data-testid="warning-message"]')).toBeVisible();
    });

    test('should handle database error during creation', async ({ page, request }) => {
      // Mock database error
      await page.route('**/api/escrow', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Database error' }) });
      });

      await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      // Verify error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test.describe('Escrow Management', () => {
    test('should allow buyer to view escrow details', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Verify details
      await expect(page.locator('[data-testid="escrow-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="vehicle-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="seller-info"]')).toBeVisible();
    });

    test('should allow seller to view escrow details', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto('/dealer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Verify details
      await expect(page.locator('[data-testid="escrow-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="buyer-info"]')).toBeVisible();
    });

    test('should allow buyer to cancel escrow before payment', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');
      await page.click('button:has-text("Cancel Escrow")');
      await page.click('button:has-text("Confirm")');

      // Verify cancellation
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Escrow cancelled');
    });

    test('should show escrow timeline', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Verify timeline
      await expect(page.locator('[data-testid="escrow-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-item"]')).toHaveCount.greaterThan(0);
    });

    test('should allow escrow notes attachment', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');
      await page.click('button:has-text("Add Note")');
      await page.fill('textarea[name="note"]', 'Please include spare keys in delivery');
      await page.click('button:has-text("Save")');

      // Verify note added
      await expect(page.locator('[data-testid="note-item"]')).toContainText('spare keys');
    });
  });

  test.describe('Escrow Status Transitions', () => {
    test('should transition from pending to funded after payment', async ({ page, request }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Initial status
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText('Pending Payment');

      // Simulate payment (would be done via M-Pesa in real scenario)
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/escrow/${auctionId}/status`, buyerToken, { status: 'funded' });

      await page.reload();

      // Verify status transition
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText('Funded');
    });

    test('should show delivery timeline after funding', async ({ page, request }) => {
      // Fund escrow
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/escrow/${auctionId}/status`, buyerToken, { status: 'funded' });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');

      // Verify delivery timeline
      await expect(page.locator('[data-testid="delivery-timeline"]')).toBeVisible();
    });

    test('should allow seller to confirm shipment', async ({ page, request }) => {
      // Fund escrow
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/escrow/${auctionId}/status`, buyerToken, { status: 'funded' });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto('/dealer/escrow');

      await page.click('[data-testid="escrow-item"]');
      await page.click('button:has-text("Confirm Shipment")');
      await page.fill('input[name="trackingNumber"]', 'TRK123456789');
      await page.click('button[type="submit"]');

      // Verify shipment confirmed
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Shipment confirmed');
    });
  });

  test.describe('Escrow Security', () => {
    test('should prevent unauthorized access to escrow', async ({ page }) => {
      // Try to access escrow without authentication
      await page.goto('/buyer/escrow');

      // Verify redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should prevent buyer from accessing seller escrow view', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);

      // Try to access dealer escrow endpoint
      await page.goto('/dealer/escrow');

      // Verify access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    test('should show escrow activity log', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/escrow');

      await page.click('[data-testid="escrow-item"]');
      await page.click('button:has-text("Activity Log")');

      // Verify activity log
      await expect(page.locator('[data-testid="activity-log"]')).toBeVisible();
    });
  });
});
