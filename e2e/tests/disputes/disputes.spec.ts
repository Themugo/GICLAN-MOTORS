/**
 * Disputes E2E Tests
 *
 * Tests for dispute workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Disputes Workflow', () => {
  let buyerToken: string;
  let dealerToken: string;
  let adminToken: string;
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

    // Login as admin
    const adminCredentials = AuthHelper.getTestUser('admin');
    adminToken = await ApiHelper.loginApi(request, adminCredentials.email, adminCredentials.password);
  });

  test.describe('Happy Path', () => {
    test('should allow buyer to open dispute', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Open dispute
      await page.click('button:has-text("Open Dispute")');

      // Fill dispute form
      await page.selectOption('select[name="category"]', 'vehicle_condition');
      await page.fill('textarea[name="description"]', 'Vehicle condition does not match description');
      await page.fill('input[name="requestedResolution"]', 'full_refund');

      // Upload evidence
      await page.setInputFiles('input[type="file"]', 'test/fixtures/evidence1.jpg');

      // Submit dispute
      await page.click('button[type="submit"]');

      // Verify dispute created
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Dispute opened');
    });

    test('should allow seller to open dispute', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto(`/dealer/escrow/${escrowId}`);

      // Open dispute
      await page.click('button:has-text("Open Dispute")');

      // Fill dispute form
      await page.selectOption('select[name="category"]', 'payment_issue');
      await page.fill('textarea[name="description"]', 'Buyer has not confirmed delivery');
      await page.click('button[type="submit"]');

      // Verify dispute created
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should mark escrow as disputed', async ({ page, request }) => {
      // Create dispute
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify escrow marked as disputed
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText('Disputed');
    });

    test('should notify all parties of dispute', async ({ page, context }) => {
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

      const adminPage = await context.newPage();
      await adminPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, adminToken);
      await adminPage.goto('/admin/notifications');

      // Open dispute
      await buyerPage.click('button:has-text("Open Dispute")');
      await buyerPage.selectOption('select[name="category"]', 'vehicle_condition');
      await buyerPage.fill('textarea[name="description"]', 'Vehicle condition issue');
      await buyerPage.click('button[type="submit"]');

      // Verify all parties notified
      await expect(buyerPage.locator('[data-testid="dispute-opened-notification"]')).toBeVisible({ timeout: 5000 });
      await expect(dealerPage.locator('[data-testid="dispute-notification"]')).toBeVisible({ timeout: 5000 });
      await expect(adminPage.locator('[data-testid="dispute-notification"]')).toBeVisible({ timeout: 5000 });

      await buyerPage.close();
      await dealerPage.close();
      await adminPage.close();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle dispute with multiple evidence files', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Open Dispute")');
      await page.selectOption('select[name="category"]', 'vehicle_condition');
      await page.fill('textarea[name="description"]', 'Vehicle condition issue');

      // Upload multiple evidence files
      await page.setInputFiles('input[type="file"][multiple]', [
        'test/fixtures/evidence1.jpg',
        'test/fixtures/evidence2.jpg',
        'test/fixtures/evidence3.jpg',
      ]);

      await page.click('button[type="submit"]');

      // Verify dispute created with multiple files
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="evidence-count"]')).toContainText('3');
    });

    test('should handle dispute without evidence', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Open Dispute")');
      await page.selectOption('select[name="category"]', 'delivery_issue');
      await page.fill('textarea[name="description"]', 'Delivery not received');
      // Don't upload evidence
      await page.click('button[type="submit"]');

      // Verify dispute created (evidence optional)
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle dispute for already disputed escrow', async ({ page, request }) => {
      // Create first dispute
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'First dispute',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Try to open second dispute
      await page.click('button:has-text("Open Dispute")');

      // Verify error
      await expect(page.locator('[data-testid="duplicate-error"]')).toBeVisible();
    });

    test('should handle dispute with custom resolution request', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Open Dispute")');
      await page.selectOption('select[name="category"]', 'vehicle_condition');
      await page.fill('textarea[name="description"]', 'Vehicle condition issue');
      await page.selectOption('select[name="resolutionType"]', 'custom');
      await page.fill('input[name="customResolution"]', 'Partial refund of 2,000,000');
      await page.click('button[type="submit"]');

      // Verify custom resolution requested
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle invalid escrow state', async ({ page, request }) => {
      // Create released escrow
      const releasedEscrow = await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId: 'test-vehicle-id',
        buyerId: 'test-buyer-id',
        amount: 5000000,
        status: 'released',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${releasedEscrow.data._id}`);

      // Verify dispute button disabled
      await expect(page.locator('button:has-text("Open Dispute")')).toBeDisabled();
    });

    test('should handle dispute creation failure', async ({ page, request }) => {
      // Mock database error
      await page.route('**/api/disputes', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Database error' }) });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Open Dispute")');
      await page.selectOption('select[name="category"]', 'vehicle_condition');
      await page.fill('textarea[name="description"]', 'Vehicle condition issue');
      await page.click('button[type="submit"]');

      // Verify error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('should handle notification failure', async ({ page }) => {
      // Mock notification failure
      await page.route('**/api/notifications/send', route => {
        route.fulfill({ status: 500 });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Open Dispute")');
      await page.selectOption('select[name="category"]', 'vehicle_condition');
      await page.fill('textarea[name="description"]', 'Vehicle condition issue');
      await page.click('button[type="submit"]');

      // Should still succeed but with warning
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="warning-message"]')).toBeVisible();
    });

    test('should handle network timeout during dispute creation', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/disputes', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      await page.click('button:has-text("Open Dispute")');
      await page.selectOption('select[name="category"]', 'vehicle_condition');
      await page.fill('textarea[name="description"]', 'Vehicle condition issue');
      await page.click('button[type="submit"]');

      // Verify timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });
  });

  test.describe('Dispute Resolution', () => {
    test('should allow admin to review dispute', async ({ page, request }) => {
      // Create dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, adminToken);
      await page.goto('/admin/disputes');

      // Review dispute
      await page.click('[data-testid="dispute-item"]');

      // Verify dispute details
      await expect(page.locator('[data-testid="dispute-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="evidence-section"]')).toBeVisible();
    });

    test('should allow admin to resolve dispute in favor of buyer', async ({ page, request }) => {
      // Create dispute
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, adminToken);
      await page.goto('/admin/disputes');

      await page.click('[data-testid="dispute-item"]');
      await page.click('button:has-text("Resolve in Favor of Buyer")');
      await page.fill('textarea[name="resolutionNotes"]', 'Evidence supports buyer claim');
      await page.click('button[type="submit"]');

      // Verify resolution
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Dispute resolved');
    });

    test('should allow admin to resolve dispute in favor of seller', async ({ page, request }) => {
      // Create dispute
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, adminToken);
      await page.goto('/admin/disputes');

      await page.click('[data-testid="dispute-item"]');
      await page.click('button:has-text("Resolve in Favor of Seller")');
      await page.fill('textarea[name="resolutionNotes"]', 'Seller provided valid evidence');
      await page.click('button[type="submit"]');

      // Verify resolution
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Dispute resolved');
    });

    test('should allow admin to propose compromise', async ({ page, request }) => {
      // Create dispute
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, adminToken);
      await page.goto('/admin/disputes');

      await page.click('[data-testid="dispute-item"]');
      await page.click('button:has-text("Propose Compromise")');
      await page.fill('input[name="compromiseAmount"]', '2500000');
      await page.fill('textarea[name="compromiseReason"]', 'Split the difference');
      await page.click('button[type="submit"]');

      // Verify compromise proposed
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Compromise proposed');
    });

    test('should release funds per resolution decision', async ({ page, request }) => {
      // Create and resolve dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/disputes/${dispute.data._id}/resolve`, adminToken, {
        resolution: 'buyer_favor',
        notes: 'Full refund to buyer',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify funds released to buyer
      await expect(page.locator('[data-testid="refund-processed"]')).toBeVisible();
    });
  });

  test.describe('Dispute Management', () => {
    test('should allow parties to add evidence during dispute', async ({ page, request }) => {
      // Create dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/disputes/${dispute.data._id}`);

      // Add additional evidence
      await page.click('button:has-text("Add Evidence")');
      await page.setInputFiles('input[type="file"]', 'test/fixtures/evidence2.jpg');
      await page.fill('textarea[name="evidenceDescription"]', 'Additional photos of damage');
      await page.click('button[type="submit"]');

      // Verify evidence added
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Evidence added');
    });

    test('should allow parties to respond to dispute', async ({ page, request }) => {
      // Create dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto(`/dealer/disputes/${dispute.data._id}`);

      // Respond to dispute
      await page.click('button:has-text("Respond")');
      await page.fill('textarea[name="response"]', 'Vehicle was accurately described');
      await page.setInputFiles('input[type="file"]', 'test/fixtures/evidence3.jpg');
      await page.click('button[type="submit"]');

      // Verify response submitted
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Response submitted');
    });

    test('should allow parties to accept compromise', async ({ page, request }) => {
      // Create dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      // Admin proposes compromise
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/disputes/${dispute.data._id}/compromise`, adminToken, {
        amount: 2500000,
        reason: 'Split the difference',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/disputes/${dispute.data._id}`);

      // Accept compromise
      await page.click('button:has-text("Accept Compromise")');
      await page.click('button:has-text("Confirm")');

      // Verify acceptance
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Compromise accepted');
    });

    test('should show dispute timeline', async ({ page, request }) => {
      // Create dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/disputes/${dispute.data._id}`);

      // View timeline
      await page.click('button:has-text("View Timeline")');

      // Verify timeline
      await expect(page.locator('[data-testid="dispute-timeline"]')).toBeVisible();
    });
  });

  test.describe('Dispute Security', () => {
    test('should prevent unauthorized access to dispute', async ({ page, request }) => {
      // Create dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      // Try to access as different user
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto(`/buyer/disputes/${dispute.data._id}`);

      // Verify access denied
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    test('should require admin approval for resolution', async ({ page, request }) => {
      // Create dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      // Try to resolve as buyer
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto(`/buyer/disputes/${dispute.data._id}`);

      // Verify resolve button not available
      await expect(page.locator('button:has-text("Resolve")')).not.toBeVisible();
    });

    test('should show dispute activity log', async ({ page, request }) => {
      // Create dispute
      const dispute = await ApiHelper.authenticatedRequest(request, 'POST', '/api/disputes', buyerToken, {
        escrowId,
        category: 'vehicle_condition',
        description: 'Vehicle condition issue',
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, adminToken);
      await page.goto('/admin/disputes');

      await page.click('[data-testid="dispute-item"]');
      await page.click('button:has-text("Activity Log")');

      // Verify activity log
      await expect(page.locator('[data-testid="activity-log"]')).toBeVisible();
    });
  });
});
