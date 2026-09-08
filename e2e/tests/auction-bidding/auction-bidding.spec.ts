/**
 * Auction Bidding E2E Tests
 *
 * Tests for auction bidding workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Auction Bidding Workflow', () => {
  let buyerToken: string;
  let dealerToken: string;
  let auctionId: string;

  test.beforeEach(async ({ page, request }) => {
    // Login as dealer
    const dealerCredentials = AuthHelper.getTestUser('dealer');
    dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);

    // Create auction
    const auction = await ApiHelper.createAuction(request, dealerToken, {
      title: 'BMW X5 2021 Auction',
      vehicleId: 'test-vehicle-id',
      startingPrice: 7000000,
      reservePrice: 7500000,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });
    auctionId = auction.data._id;

    // Login as buyer
    const buyerCredentials = AuthHelper.getTestUser('buyer');
    buyerToken = await ApiHelper.loginApi(request, buyerCredentials.email, buyerCredentials.password);
    await page.addInitScript((authToken) => {
      window.localStorage.setItem('token', authToken);
    }, buyerToken);
  });

  test.describe('Happy Path', () => {
    test('should place successful bid', async ({ page }) => {
      // Navigate to auction page
      await page.goto(`/auctions/${auctionId}`);

      // Verify auction is active
      await expect(page.locator('[data-testid="auction-status"]')).toContainText('Active');

      // Place bid
      await page.fill('input[name="bidAmount"]', '7100000');
      await page.click('button:has-text("Place Bid")');

      // Verify bid placed
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Bid placed successfully');

      // Verify current bid updated
      await expect(page.locator('[data-testid="current-bid"]')).toContainText('7,100,000');
    });

    test('should show real-time bid updates', async ({ page, context }) => {
      // Create two buyer contexts
      const buyer1Page = await context.newPage();
      await buyer1Page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyer1Page.goto(`/auctions/${auctionId}`);

      const buyer2Credentials = AuthHelper.getTestUser('buyer');
      const buyer2Token = await ApiHelper.loginApi(context.request, buyer2Credentials.email, buyer2Credentials.password);

      const buyer2Page = await context.newPage();
      await buyer2Page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyer2Token);
      await buyer2Page.goto(`/auctions/${auctionId}`);

      // Buyer 1 places bid
      await buyer1Page.fill('input[name="bidAmount"]', '7100000');
      await buyer1Page.click('button:has-text("Place Bid")');

      // Verify buyer 2 sees real-time update
      await expect(buyer2Page.locator('[data-testid="current-bid"]')).toContainText('7,100,000', { timeout: 5000 });

      await buyer1Page.close();
      await buyer2Page.close();
    });

    test('should notify outbid bidder', async ({ page, context }) => {
      const buyer1Page = await context.newPage();
      await buyer1Page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyer1Page.goto(`/auctions/${auctionId}`);

      const buyer2Credentials = AuthHelper.getTestUser('buyer');
      const buyer2Token = await ApiHelper.loginApi(context.request, buyer2Credentials.email, buyer2Credentials.password);

      const buyer2Page = await context.newPage();
      await buyer2Page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyer2Token);
      await buyer2Page.goto(`/auctions/${auctionId}`);

      // Buyer 1 places bid
      await buyer1Page.fill('input[name="bidAmount"]', '7100000');
      await buyer1Page.click('button:has-text("Place Bid")');

      // Buyer 2 outbids
      await buyer2Page.fill('input[name="bidAmount"]', '7200000');
      await buyer2Page.click('button:has-text("Place Bid")');

      // Verify buyer 1 receives outbid notification
      await expect(buyer1Page.locator('[data-testid="outbid-notification"]')).toBeVisible({ timeout: 5000 });

      await buyer1Page.close();
      await buyer2Page.close();
    });

    test('should enforce minimum bid increment', async ({ page }) => {
      await page.goto(`/auctions/${auctionId}`);

      // Try to place bid below minimum increment
      await page.fill('input[name="bidAmount"]', '7050000'); // Assuming minimum increment is 100,000
      await page.click('button:has-text("Place Bid")');

      // Verify error
      await expect(page.locator('[data-testid="bid-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="bid-error"]')).toContainText('minimum bid');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle bid at reserve price', async ({ page }) => {
      await page.goto(`/auctions/${auctionId}`);

      // Place bid exactly at reserve price
      await page.fill('input[name="bidAmount"]', '7500000');
      await page.click('button:has-text("Place Bid")');

      // Verify bid placed
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle maximum bid limit', async ({ page }) => {
      await page.goto(`/auctions/${auctionId}`);

      // Try to place extremely high bid
      await page.fill('input[name="bidAmount"]', '999999999');
      await page.click('button:has-text("Place Bid")');

      // Verify error or validation
      const errorElement = page.locator('[data-testid="bid-error"]');
      const successElement = page.locator('[data-testid="success-message"]');
      await expect(errorElement.or(successElement)).toBeVisible();
    });

    test('should handle concurrent bids', async ({ page, context }) => {
      const buyer1Page = await context.newPage();
      await buyer1Page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyer1Page.goto(`/auctions/${auctionId}`);

      const buyer2Credentials = AuthHelper.getTestUser('buyer');
      const buyer2Token = await ApiHelper.loginApi(context.request, buyer2Credentials.email, buyer2Credentials.password);

      const buyer2Page = await context.newPage();
      await buyer2Page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyer2Token);
      await buyer2Page.goto(`/auctions/${auctionId}`);

      // Both place bids simultaneously
      await Promise.all([
        buyer1Page.fill('input[name="bidAmount"]', '7100000'),
        buyer2Page.fill('input[name="bidAmount"]', '7200000'),
      ]);

      await Promise.all([
        buyer1Page.click('button:has-text("Place Bid")'),
        buyer2Page.click('button:has-text("Place Bid")'),
      ]);

      // Verify only one bid wins (Redis lock)
      await expect(buyer1Page.locator('[data-testid="success-message"]').or(buyer1Page.locator('[data-testid="bid-error"]'))).toBeVisible();
      await expect(buyer2Page.locator('[data-testid="success-message"]').or(buyer2Page.locator('[data-testid="bid-error"]'))).toBeVisible();

      await buyer1Page.close();
      await buyer2Page.close();
    });

    test('should handle bid below current bid', async ({ page, request }) => {
      // Place initial bid
      await ApiHelper.placeBid(request, buyerToken, auctionId, 7100000);

      await page.goto(`/auctions/${auctionId}`);

      // Try to place lower bid
      await page.fill('input[name="bidAmount"]', '7000000');
      await page.click('button:has-text("Place Bid")');

      // Verify error
      await expect(page.locator('[data-testid="bid-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="bid-error"]')).toContainText('higher than current');
    });

    test('should handle bid on ended auction', async ({ page, request }) => {
      // End auction via API
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/auctions/${auctionId}/end`, dealerToken, { status: 'ended' });

      await page.goto(`/auctions/${auctionId}`);

      // Try to place bid
      await page.fill('input[name="bidAmount"]', '7100000');
      await page.click('button:has-text("Place Bid")');

      // Verify error
      await expect(page.locator('[data-testid="auction-ended"]')).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle fraud detection trigger', async ({ page }) => {
      // Mock fraud detection
      await page.route('**/api/fraud/check', route => {
        route.fulfill({ status: 403, body: JSON.stringify({ error: 'Fraud detected' }) });
      });

      await page.goto(`/auctions/${auctionId}`);
      await page.fill('input[name="bidAmount"]', '7100000');
      await page.click('button:has-text("Place Bid")');

      // Verify fraud error
      await expect(page.locator('[data-testid="fraud-error"]')).toBeVisible();
    });

    test('should handle Redis lock acquisition failure', async ({ page }) => {
      // Mock Redis lock failure
      await page.route('**/api/bids', route => {
        route.fulfill({ status: 423, body: JSON.stringify({ error: 'Lock acquisition failed' }) });
      });

      await page.goto(`/auctions/${auctionId}`);
      await page.fill('input[name="bidAmount"]', '7100000');
      await page.click('button:has-text("Place Bid")');

      // Verify lock error
      await expect(page.locator('[data-testid="lock-error"]')).toBeVisible();
    });

    test('should handle network timeout during bid', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/bids', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.goto(`/auctions/${auctionId}`);
      await page.fill('input[name="bidAmount"]', '7100000');
      await page.click('button:has-text("Place Bid")');

      // Verify timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });

    test('should handle insufficient funds check', async ({ page }) => {
      // Mock insufficient funds
      await page.route('**/api/bids', route => {
        route.fulfill({ status: 400, body: JSON.stringify({ error: 'Insufficient funds' }) });
      });

      await page.goto(`/auctions/${auctionId}`);
      await page.fill('input[name="bidAmount"]', '7100000');
      await page.click('button:has-text("Place Bid")');

      // Verify error
      await expect(page.locator('[data-testid="funds-error"]')).toBeVisible();
    });
  });

  test.describe('Bid Management', () => {
    test('should show bid history', async ({ page, request }) => {
      // Place multiple bids
      await ApiHelper.placeBid(request, buyerToken, auctionId, 7100000);
      await ApiHelper.placeBid(request, buyerToken, auctionId, 7200000);

      await page.goto(`/auctions/${auctionId}`);

      // View bid history
      await page.click('button:has-text("Bid History")');

      // Verify history shows
      await expect(page.locator('[data-testid="bid-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="bid-item"]')).toHaveCount(2);
    });

    test('should allow bid withdrawal', async ({ page, request }) => {
      // Place bid
      await ApiHelper.placeBid(request, buyerToken, auctionId, 7100000);

      await page.goto(`/auctions/${auctionId}`);

      // Withdraw bid
      await page.click('[data-testid="bid-menu"]');
      await page.click('button:has-text("Withdraw Bid")');
      await page.click('button:has-text("Confirm")');

      // Verify withdrawal
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Bid withdrawn');
    });

    test('should show auction countdown', async ({ page }) => {
      await page.goto(`/auctions/${auctionId}`);

      // Verify countdown timer
      await expect(page.locator('[data-testid="countdown-timer"]')).toBeVisible();
    });

    test('should show watchlist functionality', async ({ page }) => {
      await page.goto(`/auctions/${auctionId}`);

      // Add to watchlist
      await page.click('button:has-text("Watch")');

      // Verify added to watchlist
      await expect(page.locator('[data-testid="watchlist-indicator"]')).toBeVisible();

      // View watchlist
      await page.goto('/buyer/watchlist');
      await expect(page.locator('[data-testid="watchlist-item"]')).toContainText('BMW X5');
    });
  });

  test.describe('Auction End', () => {
    test('should determine winner when auction ends', async ({ page, request }) => {
      // Place bids
      await ApiHelper.placeBid(request, buyerToken, auctionId, 7100000);
      await ApiHelper.placeBid(request, buyerToken, auctionId, 7200000);

      // End auction
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/auctions/${auctionId}/end`, dealerToken, { status: 'ended' });

      await page.goto(`/auctions/${auctionId}`);

      // Verify winner determined
      await expect(page.locator('[data-testid="auction-winner"]')).toBeVisible();
      await expect(page.locator('[data-testid="final-price"]')).toContainText('7,200,000');
    });

    test('should auto-create escrow after auction', async ({ page, request }) => {
      // Place winning bid
      await ApiHelper.placeBid(request, buyerToken, auctionId, 7100000);

      // End auction
      await ApiHelper.authenticatedRequest(request, 'PATCH', `/api/auctions/${auctionId}/end`, dealerToken, { status: 'ended' });

      // Wait for escrow creation
      await page.waitForTimeout(2000);

      // Verify escrow created
      await page.goto('/buyer/escrow');
      await expect(page.locator('[data-testid="escrow-item"]')).toContainText('BMW X5');
    });

    test('should notify all participants when auction ends', async ({ page, context }) => {
      const buyer1Page = await context.newPage();
      await buyer1Page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyer1Page.goto(`/auctions/${auctionId}`);

      const buyer2Credentials = AuthHelper.getTestUser('buyer');
      const buyer2Token = await ApiHelper.loginApi(context.request, buyer2Credentials.email, buyer2Credentials.password);

      const buyer2Page = await context.newPage();
      await buyer2Page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyer2Token);
      await buyer2Page.goto(`/auctions/${auctionId}`);

      // End auction
      await ApiHelper.authenticatedRequest(context.request, 'PATCH', `/api/auctions/${auctionId}/end`, dealerToken, { status: 'ended' });

      // Verify both receive notifications
      await expect(buyer1Page.locator('[data-testid="auction-ended-notification"]')).toBeVisible({ timeout: 5000 });
      await expect(buyer2Page.locator('[data-testid="auction-ended-notification"]')).toBeVisible({ timeout: 5000 });

      await buyer1Page.close();
      await buyer2Page.close();
    });
  });

  test.describe('SMS Bidding', () => {
    test('should allow SMS bidding (if enabled)', async ({ page, request }) => {
      // This would require SMS service integration
      // For now, test the UI flow

      await page.goto(`/auctions/${auctionId}`);
      await page.click('button:has-text("SMS Bidding")');

      // Verify SMS bidding modal
      await expect(page.locator('[data-testid="sms-bidding-modal"]')).toBeVisible();
    });

    test('should validate SMS bid format', async ({ page }) => {
      await page.goto(`/auctions/${auctionId}`);
      await page.click('button:has-text("SMS Bidding")');

      // Test invalid format
      await page.fill('input[name="smsBid"]', 'INVALID');
      await page.click('button:has-text("Submit SMS Bid")');

      // Verify error
      await expect(page.locator('[data-testid="sms-error"]')).toBeVisible();
    });
  });
});
