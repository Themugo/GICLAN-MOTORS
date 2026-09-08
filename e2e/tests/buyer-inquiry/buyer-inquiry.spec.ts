/**
 * Buyer Inquiry E2E Tests
 *
 * Tests for buyer inquiry workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Buyer Inquiry Workflow', () => {
  let buyerToken: string;
  let vehicleId: string;

  test.beforeEach(async ({ page, request }) => {
    // Create test vehicle
    const dealerCredentials = AuthHelper.getTestUser('dealer');
    const dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);

    const vehicle = await ApiHelper.createVehicle(request, dealerToken, {
      title: 'Toyota Camry 2020',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      price: 2500000,
    });
    vehicleId = vehicle.data._id;

    // Login as buyer
    const buyerCredentials = AuthHelper.getTestUser('buyer');
    buyerToken = await ApiHelper.loginApi(request, buyerCredentials.email, buyerCredentials.password);
    await page.addInitScript((authToken) => {
      window.localStorage.setItem('token', authToken);
    }, buyerToken);
  });

  test.describe('Happy Path', () => {
    test('should submit buyer inquiry successfully', async ({ page }) => {
      // Navigate to vehicle detail page
      await page.goto(`/vehicles/${vehicleId}`);

      // Click contact dealer button
      await page.click('button:has-text("Contact Dealer")');

      // Fill inquiry form
      await page.fill('textarea[name="message"]', 'I am interested in this vehicle. Is it still available?');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.fill('input[name="budget"]', '2500000');

      // Submit inquiry
      await page.click('button[type="submit"]');

      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Inquiry sent');
    });

    test('should submit inquiry as anonymous user', async ({ page }) => {
      // Clear auth token
      await page.evaluate(() => {
        window.localStorage.removeItem('token');
      });

      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');

      // Fill inquiry form with contact details
      await page.fill('input[name="name"]', 'John Doe');
      await page.fill('input[name="email"]', `buyer-${Date.now()}@kayad.test`);
      await page.fill('input[name="phone"]', '+254712345678');
      await page.fill('textarea[name="message"]', 'I am interested in this vehicle');

      await page.click('button[type="submit"]');

      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should show inquiry in buyer dashboard', async ({ page }) => {
      // Submit inquiry
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Navigate to buyer dashboard
      await page.goto('/buyer/dashboard');

      // Verify inquiry appears in list
      await expect(page.locator('[data-testid="inquiry-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="inquiry-item"]')).toContainText('Toyota Camry');
    });

    test('should send notification to dealer', async ({ page, request }) => {
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Verify notification sent (would check dealer notifications in real test)
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Dealer notified');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rate limit exceeded', async ({ page }) => {
      // Submit multiple inquiries rapidly
      for (let i = 0; i < 5; i++) {
        await page.goto(`/vehicles/${vehicleId}`);
        await page.click('button:has-text("Contact Dealer")');
        await page.fill('textarea[name="message"]', `Inquiry ${i}`);
        await page.fill('input[name="phone"]', '+254712345678');
        await page.click('button[type="submit"]');
      }

      // Try one more - should hit rate limit
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Final inquiry');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Verify rate limit error
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
    });

    test('should handle inactive dealer', async ({ page, request }) => {
      // Deactivate dealer
      const dealerCredentials = AuthHelper.getTestUser('dealer');
      const dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);

      // Create vehicle with inactive dealer (would need API endpoint for this)

      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');

      // Verify inactive dealer message
      await expect(page.locator('[data-testid="dealer-inactive"]')).toBeVisible();
    });

    test('should handle duplicate inquiry', async ({ page }) => {
      // Submit first inquiry
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Try to submit duplicate inquiry
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Verify duplicate error
      await expect(page.locator('[data-testid="duplicate-error"]')).toBeVisible();
    });

    test('should handle invalid phone format', async ({ page }) => {
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', 'invalid-phone');
      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
    });

    test('should handle empty message', async ({ page }) => {
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('input[name="phone"]', '+254712345678');
      // Don't fill message
      await page.click('button[type="submit"]');

      // Verify validation error
      await expect(page.locator('[data-testid="message-error"]')).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle notification service failure', async ({ page }) => {
      // Mock notification failure
      await page.route('**/api/notifications/send', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Notification service down' }) });
      });

      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Should still succeed but with warning
      await expect(page.locator('[data-testid="warning-message"]')).toBeVisible();
    });

    test('should handle network timeout during submission', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/leads', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Verify timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });

    test('should handle database error', async ({ page }) => {
      // Mock database error
      await page.route('**/api/leads', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Database error' }) });
      });

      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Verify error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test.describe('Inquiry Management', () => {
    test('should allow buyer to view inquiry history', async ({ page }) => {
      // Submit inquiry
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // View inquiry history
      await page.goto('/buyer/inquiries');

      // Verify inquiry appears
      await expect(page.locator('[data-testid="inquiry-item"]')).toBeVisible();
      await expect(page.locator('[data-testid="inquiry-item"]')).toContainText('Toyota Camry');
    });

    test('should allow buyer to delete inquiry', async ({ page }) => {
      // Submit inquiry
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Delete inquiry
      await page.goto('/buyer/inquiries');
      await page.click('button:has-text("Delete")');
      await page.click('button:has-text("Confirm")');

      // Verify deletion
      await expect(page.locator('[data-testid="success-message"]')).toContainText('deleted');
    });

    test('should allow buyer to follow up on inquiry', async ({ page }) => {
      // Submit inquiry
      await page.goto(`/vehicles/${vehicleId}`);
      await page.click('button:has-text("Contact Dealer")');
      await page.fill('textarea[name="message"]', 'Interested in this vehicle');
      await page.fill('input[name="phone"]', '+254712345678');
      await page.click('button[type="submit"]');

      // Follow up
      await page.goto('/buyer/inquiries');
      await page.click('button:has-text("Follow Up")');
      await page.fill('textarea[name="message"]', 'Any updates on this vehicle?');
      await page.click('button[type="submit"]');

      // Verify follow up sent
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Follow up sent');
    });
  });

  test.describe('Saved Search Alerts', () => {
    test('should create saved search alert', async ({ page }) => {
      await page.goto('/buyer/saved-searches');
      await page.click('button:has-text("Create Alert")');

      // Fill search criteria
      await page.selectOption('select[name="make"]', 'Toyota');
      await page.selectOption('select[name="model"]', 'Camry');
      await page.fill('input[name="minPrice"]', '2000000');
      await page.fill('input[name="maxPrice"]', '3000000');

      await page.click('button[type="submit"]');

      // Verify alert created
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should receive alert for matching vehicle', async ({ page, request }) => {
      // Create saved search
      await page.goto('/buyer/saved-searches');
      await page.click('button:has-text("Create Alert")');
      await page.selectOption('select[name="make"]', 'Toyota');
      await page.fill('input[name="maxPrice"]', '3000000');
      await page.click('button[type="submit"]');

      // Create matching vehicle (would trigger alert in real scenario)
      const dealerCredentials = AuthHelper.getTestUser('dealer');
      const dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);
      await ApiHelper.createVehicle(request, dealerToken, {
        title: 'Toyota Corolla 2019',
        make: 'Toyota',
        model: 'Corolla',
        year: 2019,
        price: 2200000,
      });

      // Check for alert notification
      await page.goto('/buyer/notifications');
      await expect(page.locator('[data-testid="notification-item"]')).toContainText('Toyota');
    });
  });
});
