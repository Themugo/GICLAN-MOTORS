/**
 * Reviews E2E Tests
 *
 * Tests for review workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Reviews Workflow', () => {
  let buyerToken: string;
  let dealerToken: string;
  let vehicleId: string;
  let escrowId: string;

  test.beforeEach(async ({ page, request }) => {
    // Login as dealer
    const dealerCredentials = AuthHelper.getTestUser('dealer');
    dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);

    // Create vehicle
    const vehicle = await ApiHelper.createVehicle(request, dealerToken, {
      title: 'Toyota Camry 2020',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      price: 2500000,
    });
    vehicleId = vehicle.data._id;

    // Create and complete escrow
    const escrow = await ApiHelper.createEscrow(request, dealerToken, {
      vehicleId,
      buyerId: 'test-buyer-id',
      amount: 2500000,
      status: 'released',
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
    test('should allow buyer to submit review after escrow completion', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);

      // Click write review button
      await page.click('button:has-text("Write Review")');

      // Fill review form
      await page.selectOption('select[name="rating"]', '5');
      await page.fill('textarea[name="comment"]', 'Excellent vehicle, exactly as described. Great dealer!');

      // Add tags
      await page.click('button:has-text("Add Tag")');
      await page.click('label:has-text("Reliable")');
      await page.click('label:has-text("Professional")');

      // Submit review
      await page.click('button[type="submit"]');

      // Verify review submitted
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Review submitted');
    });

    test('should display review on vehicle page', async ({ page }) => {
      // Submit review
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '4');
      await page.fill('textarea[name="comment"]', 'Good experience overall');
      await page.click('button[type="submit"]');

      // Navigate to vehicle page
      await page.goto(`/vehicles/${vehicleId}`);

      // Verify review appears
      await expect(page.locator('[data-testid="review-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-item"]')).toContainText('Good experience');
    });

    test('should update dealer rating after review', async ({ page }) => {
      // Submit review
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '5');
      await page.fill('textarea[name="comment"]', 'Excellent service');
      await page.click('button[type="submit"]');

      // Navigate to dealer profile
      await page.goto('/dealer/profile');

      // Verify rating updated
      await expect(page.locator('[data-testid="dealer-rating"]')).toContainText('5.0');
    });

    test('should send review notification to dealer', async ({ page, context }) => {
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

      // Submit review
      await buyerPage.click('button:has-text("Write Review")');
      await buyerPage.selectOption('select[name="rating"]', '5');
      await buyerPage.fill('textarea[name="comment"]', 'Great dealer');
      await buyerPage.click('button[type="submit"]');

      // Verify dealer notification
      await expect(dealerPage.locator('[data-testid="review-notification"]')).toBeVisible({ timeout: 5000 });

      await buyerPage.close();
      await dealerPage.close();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle minimum rating', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '1');
      await page.fill('textarea[name="comment"]', 'Poor experience');
      await page.click('button[type="submit"]');

      // Verify review submitted
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle maximum rating', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '5');
      await page.fill('textarea[name="comment"]', 'Perfect experience');
      await page.click('button[type="submit"]');

      // Verify review submitted
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle long review comment', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');

      const longComment = 'This is a very detailed review. '.repeat(50);
      await page.selectOption('select[name="rating"]', '4');
      await page.fill('textarea[name="comment"]', longComment);
      await page.click('button[type="submit"]');

      // Verify review submitted
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle review without comment', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '3');
      // Don't fill comment
      await page.click('button[type="submit"]');

      // Verify review submitted (comment optional)
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle review with photos', async ({ page }) => {
      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '5');
      await page.fill('textarea[name="comment"]', 'Great vehicle');

      // Upload photos
      await page.setInputFiles('input[type="file"]', 'test/fixtures/car1.jpg');

      await page.click('button[type="submit"]');

      // Verify review submitted with photos
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-photos"]')).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle duplicate review', async ({ page, request }) => {
      // Submit first review
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/reviews', buyerToken, {
        vehicleId,
        dealerId: 'test-dealer-id',
        escrowId,
        rating: 5,
        comment: 'First review',
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '4');
      await page.fill('textarea[name="comment"]', 'Second review');
      await page.click('button[type="submit"]');

      // Verify duplicate error
      await expect(page.locator('[data-testid="duplicate-error"]')).toBeVisible();
    });

    test('should handle fraud detection trigger', async ({ page }) => {
      // Mock fraud detection
      await page.route('**/api/fraud/check', route => {
        route.fulfill({ status: 403, body: JSON.stringify({ error: 'Fraud detected' }) });
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '5');
      await page.fill('textarea[name="comment"]', 'Suspicious review');
      await page.click('button[type="submit"]');

      // Verify fraud error
      await expect(page.locator('[data-testid="fraud-error"]')).toBeVisible();
    });

    test('should handle invalid escrow state', async ({ page, request }) => {
      // Create pending escrow
      const pendingEscrow = await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId,
        buyerId: 'test-buyer-id',
        amount: 2500000,
        status: 'pending_payment',
      });

      await page.goto(`/buyer/escrow/${pendingEscrow.data._id}`);

      // Verify review button disabled
      await expect(page.locator('button:has-text("Write Review")')).toBeDisabled();
    });

    test('should handle network timeout during submission', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/reviews', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '5');
      await page.fill('textarea[name="comment"]', 'Test review');
      await page.click('button[type="submit"]');

      // Verify timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });
  });

  test.describe('Review Management', () => {
    test('should allow buyer to edit review', async ({ page, request }) => {
      // Submit initial review
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/reviews', buyerToken, {
        vehicleId,
        dealerId: 'test-dealer-id',
        escrowId,
        rating: 4,
        comment: 'Initial review',
      });

      await page.goto(`/buyer/reviews`);
      await page.click('[data-testid="review-item"]');
      await page.click('button:has-text("Edit")');

      // Update review
      await page.selectOption('select[name="rating"]', '5');
      await page.fill('textarea[name="comment"]', 'Updated review - better experience');
      await page.click('button[type="submit"]');

      // Verify update
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Review updated');
    });

    test('should allow buyer to delete review', async ({ page, request }) => {
      // Submit review
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/reviews', buyerToken, {
        vehicleId,
        dealerId: 'test-dealer-id',
        escrowId,
        rating: 4,
        comment: 'Review to delete',
      });

      await page.goto(`/buyer/reviews`);
      await page.click('[data-testid="review-item"]');
      await page.click('button:has-text("Delete")');
      await page.click('button:has-text("Confirm")');

      // Verify deletion
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Review deleted');
    });

    test('should allow buyer to view review history', async ({ page }) => {
      await page.goto(`/buyer/reviews`);

      // Verify review history
      await expect(page.locator('[data-testid="review-list"]')).toBeVisible();
    });

    test('should allow dealer to respond to review', async ({ page }) => {
      // Submit review as buyer
      await ApiHelper.authenticatedRequest(page.request, 'POST', '/api/reviews', buyerToken, {
        vehicleId,
        dealerId: 'test-dealer-id',
        escrowId,
        rating: 5,
        comment: 'Great service',
      });

      // Login as dealer
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await page.goto('/dealer/reviews');

      // Respond to review
      await page.click('[data-testid="review-item"]');
      await page.click('button:has-text("Respond")');
      await page.fill('textarea[name="response"]', 'Thank you for your review!');
      await page.click('button[type="submit"]');

      // Verify response
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Response submitted');
    });
  });

  test.describe('Review Display', () => {
    test('should show review rating stars', async ({ page }) => {
      await page.goto(`/vehicles/${vehicleId}`);

      // Verify star rating display
      await expect(page.locator('[data-testid="star-rating"]')).toBeVisible();
    });

    test('should show review tags', async ({ page, request }) => {
      // Submit review with tags
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/reviews', buyerToken, {
        vehicleId,
        dealerId: 'test-dealer-id',
        escrowId,
        rating: 5,
        comment: 'Great dealer',
        tags: ['Reliable', 'Professional'],
      });

      await page.goto(`/vehicles/${vehicleId}`);

      // Verify tags displayed
      await expect(page.locator('[data-testid="review-tags"]')).toBeVisible();
      await expect(page.locator('[data-testid="tag-item"]')).toHaveCount(2);
    });

    test('should show review date', async ({ page, request }) => {
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/reviews', buyerToken, {
        vehicleId,
        dealerId: 'test-dealer-id',
        escrowId,
        rating: 4,
        comment: 'Recent review',
      });

      await page.goto(`/vehicles/${vehicleId}`);

      // Verify date displayed
      await expect(page.locator('[data-testid="review-date"]')).toBeVisible();
    });

    test('should allow filtering reviews by rating', async ({ page }) => {
      await page.goto(`/vehicles/${vehicleId}`);

      // Filter by 5-star reviews
      await page.selectOption('select[name="ratingFilter"]', '5');

      // Verify filter applied
      await expect(page.locator('[data-testid="filter-applied"]')).toBeVisible();
    });

    test('should allow sorting reviews', async ({ page }) => {
      await page.goto(`/vehicles/${vehicleId}`);

      // Sort by newest
      await page.selectOption('select[name="sortBy"]', 'newest');

      // Verify sort applied
      await expect(page.locator('[data-testid="sort-applied"]')).toBeVisible();
    });
  });

  test.describe('Review Security', () => {
    test('should prevent review without completed escrow', async ({ page, request }) => {
      // Create pending escrow
      const pendingEscrow = await ApiHelper.createEscrow(request, dealerToken, {
        vehicleId,
        buyerId: 'test-buyer-id',
        amount: 2500000,
        status: 'pending_payment',
      });

      await page.goto(`/buyer/escrow/${pendingEscrow.data._id}`);

      // Verify review button disabled
      await expect(page.locator('button:has-text("Write Review")')).toBeDisabled();
    });

    test('should prevent multiple reviews for same transaction', async ({ page, request }) => {
      // Submit first review
      await ApiHelper.authenticatedRequest(request, 'POST', '/api/reviews', buyerToken, {
        vehicleId,
        dealerId: 'test-dealer-id',
        escrowId,
        rating: 5,
        comment: 'First review',
      });

      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify write review button disabled
      await expect(page.locator('button:has-text("Write Review")')).toBeDisabled();
    });

    test('should flag suspicious review patterns', async ({ page }) => {
      // Mock fraud detection for suspicious patterns
      await page.route('**/api/fraud/check', route => {
        route.fulfill({ status: 403, body: JSON.stringify({ error: 'Suspicious pattern detected' }) });
      });

      await page.goto(`/buyer/escrow/${escrowId}`);
      await page.click('button:has-text("Write Review")');
      await page.selectOption('select[name="rating"]', '5');
      await page.fill('textarea[name="comment"]', 'Suspicious pattern review');
      await page.click('button[type="submit"]');

      // Verify fraud detection
      await expect(page.locator('[data-testid="fraud-error"]')).toBeVisible();
    });

    test('should require authentication to submit review', async ({ page }) => {
      // Clear auth
      await page.evaluate(() => {
        window.localStorage.removeItem('token');
      });

      await page.goto(`/buyer/escrow/${escrowId}`);

      // Verify redirect to login
      await expect(page).toHaveURL('/login');
    });
  });
});
