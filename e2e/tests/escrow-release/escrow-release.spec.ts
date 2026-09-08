/**
 * Escrow Release E2E Tests
 *
 * Tests for escrow release workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Escrow Release Workflow', () => {
  let buyerToken: string;
  let dealerToken: string;
  let escrowId: string;

  test.beforeEach(async ({ page, request }) => {
    // Login as dealer
    const dealerCredentials = AuthHelper.getTestUser('dealer');
    dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);

    // Create funded escrow
    const escrow = await ApiHelper.createEscrow(request, dealerToken, {
      vehicleId: 'test-vehicle-id',
      buyerId: 'test-buyer-id',
      amount: 5000000,
      status: 'funded',
    });
    escrowId = escrow.data._id;

    // Login as buyer
    const buyerCredentials = AuthHelper.getTestUser('buyer');
    buyerToken = await ApiHelper.loginApi(request, buyerCredentials.email, buyerCredentials.password);
  });

  test.describe('Happy Path', () => {
    test('should allow buyer to confirm delivery and release funds', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Confirm delivery
      await page.click('button:has-text("Confirm Delivery")');

      // Confirm release
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // Verify release initiated
      await expect(page.locator('[data-testid="release-initiated"]')).toBeVisible();
    });

    test('should process seller payout after release', async ({ page, request }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Confirm delivery and release
      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // Mock M-Pesa payout success
      await page.route('**/api/mpesa/payout', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            ResultCode: 0,
            ResultDesc: 'Success',
          }),
        });
      });

      // Wait for payout processing
      await page.waitForTimeout(3000);

      // Verify payout completed
      await expect(page.locator('[data-testid="payout-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText('Released');
    });

    test('should notify seller of fund release', async ({ page, context }) => {
      const buyerPage = await context.newPage();
      await buyerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyerPage.goto(`/buyer/escrow/${escrowId}`);

      const dealerPage = await context.newPage();
      await dealerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await dealerPage.goto('/dealer/notifications');

      // Release funds
      await buyerPage.click('button:has-text("Confirm Delivery")');
      await buyerPage.click('button:has-text("Release Funds")');
      await buyerPage.click('button:has-text("Confirm Release")');

      // Verify seller notification
      await expect(dealerPage.locator('[data-testid="funds-released-notification"]')).toBeVisible({ timeout: 5000 });

      await buyerPage.close();
      await dealerPage.close();
    });

    test('should show transaction details after release', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Complete release
      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // View transaction
      await page.click('button:has-text("View Transaction")');

      // Verify transaction details
      await expect(page.locator('[data-testid="transaction-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="transaction-amount"]')).toContainText('5,000,000');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle partial release', async ({ page, request }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Request partial release
      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Partial Release")');
      await page.fill('input[name="releaseAmount"]', '2500000');
      await page.click('button:has-text("Confirm")');

      // Verify partial release initiated
      await expect(page.locator('[data-testid="partial-release-initiated"]')).toBeVisible();
    });

    test('should handle auto-release after N days', async ({ page, request }) => {
      // Set auto-release date to past
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/escrow/${escrowId}/auto-release`, dealerToken, {
        autoReleaseDate: new Date(Date.now() - 86400000).toISOString(),
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify auto-release triggered
      await expect(page.locator('[data-testid="auto-release-triggered"]')).toBeVisible();
    });

    test('should handle release with dispute pending', async ({ page, request }) => {
      // Create dispute
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        reason: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify release blocked due to dispute
      await expect(page.locator('[data-testid="release-blocked"]')).toBeVisible();
      await expect(page.locator('[data-testid="release-blocked"]')).toContainText('dispute pending');
    });

    test('should handle release with insufficient funds', async ({ page, request }) => {
      // Mock insufficient funds for payout
      await page.route('**/api/mpesa/payout', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            ResultCode: 1032,
            ResultDesc: 'Insufficient funds',
          }),
        });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // Verify payout error
      await expect(page.locator('[data-testid="payout-error"]')).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle payout initiation failure', async ({ page, request }) => {
      // Mock payout failure
      await page.route('**/api/mpesa/payout', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Payout failed' }) });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // Verify error
      await expect(page.locator('[data-testid="payout-error"]')).toBeVisible();
    });

    test('should handle callback failure during payout', async ({ page, request }) => {
      // Mock callback failure
      await page.route('**/api/payments/callback', route => {
        route.fulfill({ status: 500 });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // Should show pending status with retry option
      await expect(page.locator('[data-testid="payout-pending"]')).toBeVisible();
      await expect(page.locator('button:has-text("Retry Payout")')).toBeVisible();
    });

    test('should handle network timeout during release', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/escrow/*/release', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // Verify timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });

    test('should handle database error during release', async ({ page, request }) => {
      // Mock database error
      await page.route('**/api/escrow/*/release', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Database error' }) });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // Verify error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test.describe('Release Management', () => {
    test('should allow buyer to cancel release before confirmation', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');

      // Cancel before confirming
      await page.click('button:has-text("Cancel")');

      // Verify cancellation
      await expect(page.locator('[data-testid="release-cancelled"]')).toBeVisible();
    });

    test('should show release timeline', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // View timeline
      await page.click('button:has-text("View Timeline")');

      // Verify timeline
      await expect(page.locator('[data-testid="release-timeline"]')).toBeVisible();
    });

    test('should allow payout retry after failure', async ({ page }) => {
      // Mock initial payout failure
      await page.route('**/api/mpesa/payout', route => {
        route.fulfill({ status: 500 });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // Retry payout
      await page.unroute('**/api/mpesa/payout');
      await page.click('button:has-text("Retry Payout")');

      // Verify retry initiated
      await expect(page.locator('[data-testid="retry-initiated"]')).toBeVisible();
    });

    test('should show payout receipt after completion', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // View receipt
      await page.click('button:has-text("View Receipt")');

      // Verify receipt
      await expect(page.locator('[data-testid="payout-receipt"]')).toBeVisible();
    });
  });

  test.describe('Admin Release', () => {
    test('should allow admin to force release in dispute', async ({ page, request }) => {
      const adminCredentials = AuthHelper.getTestUser('admin');
      const adminToken = await ApiHelper.loginApi(request, adminCredentials.email, adminCredentials.password);

      // Create dispute
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        reason: 'Vehicle condition issue',
      });

      // Admin force release
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, adminToken);
      await page.goto('/admin/disputes');

      await page.click('[data-testid="dispute-item"]');
      await page.click('button:has-text("Force Release")');
      await page.click('button:has-text("Confirm")');

      // Verify release
      await expect(page.locator('[data-testid="force-release-success"]')).toBeVisible();
    });

    test('should require admin approval for manual release', async ({ page, request }) => {
      const adminCredentials = AuthHelper.getTestUser('admin');
      const adminToken = await ApiHelper.loginApi(request, adminCredentials.email, adminCredentials.password);

      // Request manual release
      await ApiHelper.authenticatedRequest(request, 'POST', `/api/escrow/${escrowId}/manual-release`, buyerToken, {
        reason: 'Seller agreement',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, adminToken);
      await page.goto('/admin/escrow-requests');

      // Approve release
      await page.click('[data-testid="release-request"]');
      await page.click('button:has-text("Approve")');

      // Verify approval
      await expect(page.locator('[data-testid="approval-success"]')).toBeVisible();
    });
  });

  test.describe('Release Security', () => {
    test('should prevent release for non-funded escrow', async ({ page, request }) => {
      // Create pending escrow
      const pendingEscrow = await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
        status: 'pending_payment',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${pendingEscrow.data._id}`);

      // Verify release button disabled
      await expect(page.locator('button:has-text("Release Funds")')).toBeDisabled();
    });

    test('should prevent unauthorized release', async ({ page }) => {
      // Try to access release endpoint as dealer
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    test('should require two-factor confirmation for large amounts', async ({ page, request }) => {
      // Create large escrow
      const largeEscrow = await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 10000000, // Large amount
        status: 'funded',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${largeEscrow.data._id}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');

      // Verify 2FA required
      await expect(page.locator('[data-testid="2fa-required"]')).toBeVisible();
    });

    test('should show release activity log', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Confirm Delivery")');
      await page.click('button:has-text("Release Funds")');
      await page.click('button:has-text("Confirm Release")');

      // View activity log
      await page.click('button:has-text("Activity Log")');

      // Verify log
      await expect(page.locator('[data-testid="activity-log"]')).toBeVisible();
    });
  });
});
