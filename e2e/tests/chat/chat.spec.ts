/**
 * Chat E2E Tests
 *
 * Tests for real-time chat workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Chat Workflow', () => {
  let buyerToken: string;
  let dealerToken: string;
  let leadId: string;

  test.beforeEach(async ({ page, request }) => {
    // Login as buyer
    const buyerCredentials = AuthHelper.getTestUser('buyer');
    buyerToken = await ApiHelper.loginApi(request, buyerCredentials.email, buyerCredentials.password);

    // Login as dealer
    const dealerCredentials = AuthHelper.getTestUser('dealer');
    dealerToken = await ApiHelper.loginApi(request, dealerCredentials.email, dealerCredentials.password);
  });

  test.describe('Happy Path', () => {
    test('should send and receive real-time messages', async ({ page, context }) => {
      // Create buyer context
      const buyerPage = await context.newPage();
      await buyerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyerPage.goto('/buyer/chats');

      // Create dealer context
      const dealerPage = await context.newPage();
      await dealerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await dealerPage.goto('/dealer/chats');

      // Buyer sends message
      await buyerPage.click('button:has-text("New Chat")');
      await buyerPage.fill('input[name="message"]', 'Hello, I am interested in your vehicles');
      await buyerPage.click('button:has-text("Send")');

      // Verify message appears in buyer chat
      await expect(buyerPage.locator('[data-testid="message-sent"]')).toBeVisible();

      // Verify message appears in dealer chat (real-time)
      await expect(dealerPage.locator('[data-testid="message-received"]')).toBeVisible({ timeout: 5000 });
      await expect(dealerPage.locator('[data-testid="message-received"]')).toContainText('Hello, I am interested');

      // Dealer replies
      await dealerPage.fill('input[name="message"]', 'Hi! Which vehicle are you interested in?');
      await dealerPage.click('button:has-text("Send")');

      // Verify reply appears in buyer chat
      await expect(buyerPage.locator('[data-testid="message-received"]')).toContainText('Which vehicle');

      // Clean up
      await buyerPage.close();
      await dealerPage.close();
    });

    test('should show message read receipts', async ({ page, context }) => {
      const buyerPage = await context.newPage();
      await buyerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyerPage.goto('/buyer/chats');

      const dealerPage = await context.newPage();
      await dealerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await dealerPage.goto('/dealer/chats');

      // Buyer sends message
      await buyerPage.click('button:has-text("New Chat")');
      await buyerPage.fill('input[name="message"]', 'Test message');
      await buyerPage.click('button:has-text("Send")');

      // Wait for dealer to read
      await dealerPage.waitForSelector('[data-testid="message-received"]');

      // Verify read receipt appears in buyer chat
      await expect(buyerPage.locator('[data-testid="read-receipt"]')).toBeVisible({ timeout: 5000 });

      await buyerPage.close();
      await dealerPage.close();
    });

    test('should handle offline recipient with notifications', async ({ page, context }) => {
      const buyerPage = await context.newPage();
      await buyerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyerPage.goto('/buyer/chats');

      // Buyer sends message while dealer is offline
      await buyerPage.click('button:has-text("New Chat")');
      await buyerPage.fill('input[name="message"]', 'Message for offline dealer');
      await buyerPage.click('button:has-text("Send")');

      // Verify message queued
      await expect(buyerPage.locator('[data-testid="message-queued"]')).toBeVisible();

      // Verify notification sent
      await expect(buyerPage.locator('[data-testid="notification-sent"]')).toBeVisible();

      await buyerPage.close();
    });

    test('should display message history', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      // Open existing chat
      await page.click('[data-testid="chat-item"]');

      // Verify message history loads
      await expect(page.locator('[data-testid="message-history"]')).toBeVisible();
      const messageCount = await page.locator('[data-testid="message-item"]').count();
      expect(messageCount).toBeGreaterThan(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle message with emoji', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');
      await page.fill('input[name="message"]', 'Great! 👍 Thanks for the info 🚗');
      await page.click('button:has-text("Send")');

      // Verify emoji renders correctly
      await expect(page.locator('[data-testid="message-sent"]')).toContainText('👍');
      await expect(page.locator('[data-testid="message-sent"]')).toContainText('🚗');
    });

    test('should handle long message', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      const longMessage = 'This is a very long message that exceeds the normal length. '.repeat(20);

      await page.click('button:has-text("New Chat")');
      await page.fill('input[name="message"]', longMessage);
      await page.click('button:has-text("Send")');

      // Verify message sent
      await expect(page.locator('[data-testid="message-sent"]')).toBeVisible();
    });

    test('should handle empty message submission', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');
      // Don't fill message
      await page.click('button:has-text("Send")');

      // Verify button disabled or error shown
      await expect(page.locator('button:has-text("Send")')).toBeDisabled();
    });

    test('should handle message with special characters', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');
      await page.fill('input[name="message"]', 'Price: KES 2,500,000. Contact: +254-712-345-678');
      await page.click('button:has-text("Send")');

      // Verify message sent with special characters
      await expect(page.locator('[data-testid="message-sent"]')).toContainText('KES 2,500,000');
    });

    test('should handle rapid message sending', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');

      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        await page.fill('input[name="message"]', `Message ${i}`);
        await page.click('button:has-text("Send")');
      }

      // Verify all messages sent
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(5);
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle WebSocket disconnect', async ({ page, context }) => {
      const buyerPage = await context.newPage();
      await buyerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyerPage.goto('/buyer/chats');

      // Simulate WebSocket disconnect
      await buyerPage.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Try to send message
      await buyerPage.click('button:has-text("New Chat")');
      await buyerPage.fill('input[name="message"]', 'Test message');
      await buyerPage.click('button:has-text("Send")');

      // Verify offline indicator
      await expect(buyerPage.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // Simulate reconnect
      await buyerPage.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Verify reconnection
      await expect(buyerPage.locator('[data-testid="online-indicator"]')).toBeVisible();

      await buyerPage.close();
    });

    test('should handle message persistence failure', async ({ page }) => {
      // Mock database failure
      await page.route('**/api/chat/send', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Database error' }) });
      });

      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');
      await page.fill('input[name="message"]', 'Test message');
      await page.click('button:has-text("Send")');

      // Verify error message
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
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');
      await page.fill('input[name="message"]', 'Test message');
      await page.click('button:has-text("Send")');

      // Should still succeed but with warning
      await expect(page.locator('[data-testid="warning-message"]')).toBeVisible();
    });

    test('should handle rate limit on messages', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');

      // Send many messages rapidly
      for (let i = 0; i < 20; i++) {
        await page.fill('input[name="message"]', `Message ${i}`);
        await page.click('button:has-text("Send")');
      }

      // Verify rate limit error
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
    });
  });

  test.describe('Chat Features', () => {
    test('should allow file attachment', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');

      // Attach file
      await page.setInputFiles('input[type="file"]', 'test/fixtures/document.pdf');

      await page.fill('input[name="message"]', 'Here is the document');
      await page.click('button:has-text("Send")');

      // Verify file attached
      await expect(page.locator('[data-testid="file-attachment"]')).toBeVisible();
    });

    test('should allow image sharing', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');

      // Attach image
      await page.setInputFiles('input[type="file"]', 'test/fixtures/car1.jpg');

      await page.click('button:has-text("Send")');

      // Verify image displayed
      await expect(page.locator('[data-testid="image-attachment"]')).toBeVisible();
    });

    test('should allow typing indicator', async ({ page, context }) => {
      const buyerPage = await context.newPage();
      await buyerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await buyerPage.goto('/buyer/chats');

      const dealerPage = await context.newPage();
      await dealerPage.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, dealerToken);
      await dealerPage.goto('/dealer/chats');

      // Buyer starts typing
      await buyerPage.click('button:has-text("New Chat")');
      await buyerPage.fill('input[name="message"]', 'Test');

      // Verify typing indicator appears in dealer chat
      await expect(dealerPage.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 2000 });

      await buyerPage.close();
      await dealerPage.close();
    });

    test('should allow message deletion', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');
      await page.fill('input[name="message"]', 'Message to delete');
      await page.click('button:has-text("Send")');

      // Delete message
      await page.click('[data-testid="message-menu"]');
      await page.click('button:has-text("Delete")');
      await page.click('button:has-text("Confirm")');

      // Verify message deleted
      await expect(page.locator('[data-testid="message-deleted"]')).toBeVisible();
    });

    test('should allow message editing', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      await page.click('button:has-text("New Chat")');
      await page.fill('input[name="message"]', 'Original message');
      await page.click('button:has-text("Send")');

      // Edit message
      await page.click('[data-testid="message-menu"]');
      await page.click('button:has-text("Edit")');
      await page.fill('input[name="message"]', 'Edited message');
      await page.click('button:has-text("Save")');

      // Verify message edited
      await expect(page.locator('[data-testid="message-edited"]')).toContainText('Edited message');
    });
  });

  test.describe('Chat Management', () => {
    test('should allow archiving chats', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      // Archive chat
      await page.click('[data-testid="chat-menu"]');
      await page.click('button:has-text("Archive")');

      // Verify chat archived
      await expect(page.locator('[data-testid="archived-chats"]')).toBeVisible();
    });

    test('should allow muting chats', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      // Mute chat
      await page.click('[data-testid="chat-menu"]');
      await page.click('button:has-text("Mute")');

      // Verify chat muted
      await expect(page.locator('[data-testid="mute-indicator"]')).toBeVisible();
    });

    test('should allow blocking users', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      // Block user
      await page.click('[data-testid="chat-menu"]');
      await page.click('button:has-text("Block")');
      await page.click('button:has-text("Confirm")');

      // Verify user blocked
      await expect(page.locator('[data-testid="blocked-indicator"]')).toBeVisible();
    });

    test('should search chat history', async ({ page }) => {
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, buyerToken);
      await page.goto('/buyer/chats');

      // Search for specific message
      await page.fill('input[name="search"]', 'price');
      await page.click('button:has-text("Search")');

      // Verify search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });
  });
});
