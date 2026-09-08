/**
 * M-Pesa Payment E2E Tests
 *
 * Tests for M-Pesa payment workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('M-Pesa Payment Workflow', () => {
  let buyerToken: string;
  let dealerToken: string;
  let escrowId: string;

  test.beforeEach(async ({ page, request }) => {
    // Login as dealer
    const dealerCredentials = AuthHelper.getTestUser('dealer');
    dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);

    // Create escrow
    const escrow = await ApiHelper.createEscrow(request, dealerToken, {
      vehicleId: 'test-vehicle-id',
      buyerId: 'test-buyer-id',
      amount: 5000000,
      status: 'pending_payment',
    });
    escrowId = escrow.data._id;

    // Login as buyer
    const buyerCredentials = AuthHelper.getTestUser('buyer');
    buyerToken = await ApiHelper.loginApi(request, buyerCredentials.email, buyerCredentials.password);
    await page.addInitScript((authToken) => {
      window.localStorage.setItem('token', authToken);
    }, buyerToken);
  });

  test.describe('Happy Path', () => {
    test('should initiate M-Pesa STK push successfully', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Click pay button
      await page.click('button:has-text("Pay Now")');

      // Verify phone number input
      await expect(page.locator('input[name="phoneNumber"]')).toBeVisible();

      // Enter phone number
      await page.fill('input[name="phoneNumber"]', '+254712345678');

      // Confirm payment
      await page.click('button:has-text("Confirm Payment")');

      // Verify STK push initiated
      await expect(page.locator('[data-testid="stk-push-sent"]')).toBeVisible();
      await expect(page.locator('[data-testid="stk-push-sent"]')).toContainText('Check your phone');
    });

    test('should complete payment after STK push confirmation', async ({ page, request }) => {
      // Initiate payment
      await ApiHelper.initiatePayment(request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      await page.goto(`/buyer/escrow/${escrowId}`);

      // Simulate M-Pesa callback (in real test, would wait for actual callback)
      await page.route('**/api/payments/callback', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            ResultCode: 0,
            ResultDesc: 'Success',
            MerchantRequestID: 'test-request-id',
            CheckoutRequestID: 'test-checkout-id',
          }),
        });
      });

      // Wait for payment completion
      await page.waitForTimeout(3000);

      // Verify payment completed
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText('Funded');
    });

    test('should show payment confirmation details', async ({ page, request }) => {
      // Complete payment
      await ApiHelper.initiatePayment(request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify payment details
      await expect(page.locator('[data-testid="payment-amount"]')).toContainText('5,000,000');
      await expect(page.locator('[data-testid="payment-phone"]')).toContainText('+254712345678');
    });

    test('should send payment confirmation notifications', async ({ page, context }) => {
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

      // Initiate and complete payment
      await ApiHelper.initiatePayment(context.request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      // Verify buyer notification
      await expect(buyerPage.locator('[data-testid="payment-success-notification"]')).toBeVisible({ timeout: 5000 });

      // Verify seller notification
      await expect(dealerPage.locator('[data-testid="payment-received-notification"]')).toBeVisible({ timeout: 5000 });

      await buyerPage.close();
      await dealerPage.close();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle invalid phone number format', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');

      // Enter invalid phone
      await page.fill('input[name="phoneNumber"]', 'invalid-phone');
      await page.click('button:has-text("Confirm Payment")');

      // Verify validation error
      await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
    });

    test('should handle insufficient funds', async ({ page, request }) => {
      // Mock insufficient funds response
      await page.route('**/api/payments/initiate', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            ResultCode: 1032,
            ResultDesc: 'Insufficient funds',
          }),
        });
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Verify insufficient funds error
      await expect(page.locator('[data-testid="insufficient-funds-error"]')).toBeVisible();
    });

    test('should handle payment timeout', async ({ page, request }) => {
      // Mock timeout
      await page.route('**/api/payments/initiate', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Verify timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });

    test('should handle user cancels STK push', async ({ page, request }) => {
      // Mock user cancellation
      await page.route('**/api/payments/callback', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user',
          }),
        });
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Verify cancellation message
      await expect(page.locator('[data-testid="cancelled-error"]')).toBeVisible();
    });

    test('should handle duplicate payment attempt', async ({ page, request }) => {
      // Initiate first payment
      await ApiHelper.initiatePayment(request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      // Try to initiate second payment
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Verify duplicate error
      await expect(page.locator('[data-testid="duplicate-error"]')).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle M-Pesa API failure', async ({ page, request }) => {
      // Mock M-Pesa API failure
      await page.route('**/api/mpesa/stkpush', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'M-Pesa API error' }) });
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Verify error
      await expect(page.locator('[data-testid="mpesa-error"]')).toBeVisible();
    });

    test('should handle callback failure', async ({ page, request }) => {
      // Initiate payment
      await ApiHelper.initiatePayment(request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      // Mock callback failure
      await page.route('**/api/payments/callback', route => {
        route.fulfill({ status: 500 });
      });

      await page.goto(`/buyer/escrow/${escrowId}`);

      // Should show pending status with retry option
      await expect(page.locator('[data-testid="payment-pending"]')).toBeVisible();
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    });

    test('should handle network timeout during payment', async ({ page }) => {
      // Mock network timeout
      await page.route('**/api/payments/initiate', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Verify timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });

    test('should handle idempotency check for duplicate payments', async ({ page, request }) => {
      // Send same payment request twice
      const paymentData = {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
        idempotencyKey: 'test-key-123',
      };

      await ApiHelper.initiatePayment(request, buyerToken, paymentData);
      await ApiHelper.initiatePayment(request, buyerToken, paymentData);

      await page.goto(`/buyer/escrow/${escrowId}`);

      // Should show original payment status
      await expect(page.locator('[data-testid="payment-status"]')).toBeVisible();
    });
  });

  test.describe('Payment Management', () => {
    test('should allow payment retry after failure', async ({ page, request }) => {
      // Initiate failed payment
      await page.route('**/api/payments/initiate', route => {
        route.fulfill({ status: 500 });
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Retry payment
      await page.unroute('**/api/payments/initiate');
      await page.click('button:has-text("Retry")');

      // Verify retry initiated
      await expect(page.locator('[data-testid="retry-initiated"]')).toBeVisible();
    });

    test('should show payment history', async ({ page, request }) => {
      // Make multiple payment attempts
      await ApiHelper.initiatePayment(request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Payment History")');

      // Verify history
      await expect(page.locator('[data-testid="payment-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-item"]')).toHaveCount.greaterThan(0);
    });

    test('should allow payment cancellation before completion', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');

      // Cancel before confirming
      await page.click('button:has-text("Cancel")');

      // Verify cancellation
      await expect(page.locator('[data-testid="payment-cancelled"]')).toBeVisible();
    });

    test('should show payment receipt after completion', async ({ page, request }) => {
      // Complete payment
      await ApiHelper.initiatePayment(request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("View Receipt")');

      // Verify receipt
      await expect(page.locator('[data-testid="payment-receipt"]')).toBeVisible();
      await expect(page.locator('[data-testid="receipt-amount"]')).toContainText('5,000,000');
    });
  });

  test.describe('Payment Security', () => {
    test('should prevent payment for non-existent escrow', async ({ page, request }) => {
      await ApiHelper.initiatePayment(request, buyerToken, {
        escrowId: 'non-existent-id',
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      await page.goto('/buyer/escrow/non-existent-id');

      // Verify error
      await expect(page.locator('[data-testid="not-found-error"]')).toBeVisible();
    });

    test('should prevent payment for already funded escrow', async ({ page, request }) => {
      // Fund escrow
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/escrow/${escrowId}/status`, buyerToken, { status: 'funded' });

      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify pay button disabled
      await expect(page.locator('button:has-text("Pay Now")')).toBeDisabled();
    });

    test('should validate payment amount matches escrow amount', async ({ page, request }) => {
      // Try to pay different amount
      await ApiHelper.initiatePayment(request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 6000000, // Different from escrow amount
      });

      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify amount mismatch error
      await expect(page.locator('[data-testid="amount-mismatch-error"]')).toBeVisible();
    });

    test('should show payment security warnings', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');

      // Verify security warnings
      await expect(page.locator('[data-testid="security-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-warning"]')).toContainText('official M-Pesa');
    });
  });

  test.describe('Payment Notifications', () => {
    test('should send SMS confirmation to buyer', async ({ page }) => {
      // This would verify SMS sent in real scenario
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Verify SMS notification indicator
      await expect(page.locator('[data-testid="sms-sent-indicator"]')).toBeVisible();
    });

    test('should send email receipt to buyer', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Pay Now")');
      await page.fill('input[name="phoneNumber"]', '+254712345678');
      await page.click('button:has-text("Confirm Payment")');

      // Verify email notification indicator
      await expect(page.locator('[data-testid="email-sent-indicator"]')).toBeVisible();
    });

    test('should notify seller of payment received', async ({ page, context }) => {
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

      // Complete payment
      await ApiHelper.initiatePayment(context.request, buyerToken, {
        escrowId,
        phoneNumber: '+254712345678',
        amount: 5000000,
      });

      // Verify seller notification
      await expect(dealerPage.locator('[data-testid="payment-received-notification"]')).toBeVisible({ timeout: 5000 });

      await buyerPage.close();
      await dealerPage.close();
    });
  });
});
