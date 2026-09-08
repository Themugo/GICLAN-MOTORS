/**
 * Dealer Onboarding E2E Tests
 *
 * Tests for dealer registration and onboarding workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Dealer Onboarding Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
  });

  test.describe('Happy Path', () => {
    test('should complete dealer registration successfully', async ({ page }) => {
      const dealerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `dealer-${Date.now()}@kayad.test`,
        phone: '+254712345678',
        password: 'SecurePassword123!',
        role: 'dealer' as const,
      };

      // Fill registration form
      await page.fill('input[name="firstName"]', dealerData.firstName);
      await page.fill('input[name="lastName"]', dealerData.lastName);
      await page.fill('input[name="email"]', dealerData.email);
      await page.fill('input[name="phone"]', dealerData.phone);
      await page.fill('input[name="password"]', dealerData.password);
      await page.fill('input[name="confirmPassword"]', dealerData.password);

      // Select dealer role
      await page.click('input[name="role"][value="dealer"]');

      // Accept terms and conditions
      await page.click('input[name="terms"]');

      // Submit registration
      await page.click('button[type="submit"]');

      // Verify email verification page is shown
      await expect(page).toHaveURL(/\/verify-email/);
      await expect(page.locator('h1')).toContainText('Verify Email');

      // Simulate OTP verification (in real test, would get OTP from email)
      await page.fill('input[name="otp"]', '123456');
      await page.click('button[type="submit"]');

      // Verify redirect to dealer dashboard
      await expect(page).toHaveURL(/\/dealer\/dashboard/);
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    });

    test('should complete dealer registration with business details', async ({ page }) => {
      const dealerData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: `dealer-business-${Date.now()}@kayad.test`,
        phone: '+254723456789',
        password: 'SecurePassword123!',
        businessName: 'Auto Motors Ltd',
        businessLicense: 'BIZ-12345',
        role: 'dealer' as const,
      };

      // Fill registration form
      await page.fill('input[name="firstName"]', dealerData.firstName);
      await page.fill('input[name="lastName"]', dealerData.lastName);
      await page.fill('input[name="email"]', dealerData.email);
      await page.fill('input[name="phone"]', dealerData.phone);
      await page.fill('input[name="password"]', dealerData.password);
      await page.fill('input[name="confirmPassword"]', dealerData.password);

      // Select dealer role
      await page.click('input[name="role"][value="dealer"]');

      // Fill business details
      await page.fill('input[name="businessName"]', dealerData.businessName);
      await page.fill('input[name="businessLicense"]', dealerData.businessLicense);

      // Accept terms
      await page.click('input[name="terms"]');

      // Submit
      await page.click('button[type="submit"]');

      // Verify email verification
      await expect(page).toHaveURL(/\/verify-email/);
    });
  });

  test.describe('Edge Cases', () => {
    test('should reject invalid phone number format', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `invalid-phone@kayad.test`);
      await page.fill('input[name="phone"]', 'invalid-phone');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      await page.click('input[name="role"][value="dealer"]');
      await page.click('input[name="terms"]');
      await page.click('button[type="submit"]');

      // Verify error message
      await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="phone-error"]')).toContainText('valid phone');
    });

    test('should reject weak password', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `weak-pwd-${Date.now()}@kayad.test`);
      await page.fill('input[name="phone"]', '+254712345678');
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');

      await page.click('input[name="role"][value="dealer"]');
      await page.click('input[name="terms"]');
      await page.click('button[type="submit"]');

      // Verify password strength error
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should reject mismatched password confirmation', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `mismatch-${Date.now()}@kayad.test`);
      await page.fill('input[name="phone"]', '+254712345678');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

      await page.click('input[name="role"][value="dealer"]');
      await page.click('input[name="terms"]');
      await page.click('button[type="submit"]');

      // Verify mismatch error
      await expect(page.locator('[data-testid="confirm-password-error"]')).toBeVisible();
    });

    test('should reject terms not accepted', async ({ page }) => {
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `no-terms-${Date.now()}@kayad.test`);
      await page.fill('input[name="phone"]', '+254712345678');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      await page.click('input[name="role"][value="dealer"]');
      // Don't accept terms
      await page.click('button[type="submit"]');

      // Verify terms error
      await expect(page.locator('[data-testid="terms-error"]')).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle duplicate email registration', async ({ page, request }) => {
      const email = `duplicate-${Date.now()}@kayad.test`;

      // Register first user via API
      await ApiHelper.registerApi(request, {
        firstName: 'John',
        lastName: 'Doe',
        email,
        phone: '+254712345678',
        password: 'SecurePassword123!',
        role: 'dealer',
      });

      // Try to register with same email via UI
      await page.fill('input[name="firstName"]', 'Jane');
      await page.fill('input[name="lastName"]', 'Smith');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="phone"]', '+254723456789');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      await page.click('input[name="role"][value="dealer"]');
      await page.click('input[name="terms"]');
      await page.click('button[type="submit"]');

      // Verify duplicate error
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText('already registered');
    });

    test('should handle NTSA verification timeout', async ({ page }) => {
      // Mock NTSA API timeout
      await page.route('**/api/ntsa/verify', async route => {
        await new Promise(resolve => setTimeout(resolve, 30000));
        route.fulfill({ status: 504 });
      });

      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `ntsa-timeout-${Date.now()}@kayad.test`);
      await page.fill('input[name="phone"]', '+254712345678');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      await page.click('input[name="role"][value="dealer"]');
      await page.fill('input[name="businessLicense"]', 'BIZ-12345');
      await page.click('input[name="terms"]');
      await page.click('button[type="submit"]');

      // Verify timeout handling - should show error or retry option
      await expect(page.locator('[data-testid="ntsa-error"]')).toBeVisible();
    });

    test('should handle email service failure', async ({ page }) => {
      // Mock email service failure
      await page.route('**/api/email/send', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Email service down' }) });
      });

      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `email-fail-${Date.now()}@kayad.test`);
      await page.fill('input[name="phone"]', '+254712345678');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      await page.click('input[name="role"][value="dealer"]');
      await page.click('input[name="terms"]');
      await page.click('button[type="submit"]');

      // Should handle gracefully - maybe show manual verification option
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });

    test('should handle network timeout during registration', async ({ page }) => {
      // Mock network timeout
      await page.route('**/api/auth/register', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `network-timeout-${Date.now()}@kayad.test`);
      await page.fill('input[name="phone"]', '+254712345678');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      await page.click('input[name="role"][value="dealer"]');
      await page.click('input[name="terms"]');
      await page.click('button[type="submit"]');

      // Should show timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });
  });

  test.describe('Post-Registration', () => {
    test('should allow dealer to complete profile after registration', async ({ page, request }) => {
      // Register dealer
      const email = `profile-${Date.now()}@kayad.test`;
      await ApiHelper.registerApi(request, {
        firstName: 'John',
        lastName: 'Doe',
        email,
        phone: '+254712345678',
        password: 'SecurePassword123!',
        role: 'dealer',
      });

      // Login
      const token = await ApiHelper.loginApi(request, email, 'SecurePassword123!');
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, token);

      // Navigate to profile completion
      await page.goto('/dealer/profile/complete');

      // Fill additional profile details
      await page.fill('input[name="businessAddress"]', '123 Business St, Nairobi');
      await page.fill('input[name="businessDescription"]', 'Premium car dealership');
      await page.fill('input[name="website"]', 'https://example.com');

      // Upload business documents
      await page.setInputFiles('input[type="file"]', 'test/fixtures/business-license.pdf');

      // Submit
      await page.click('button[type="submit"]');

      // Verify profile completion
      await expect(page).toHaveURL(/\/dealer\/dashboard/);
      await expect(page.locator('[data-testid="profile-complete"]')).toBeVisible();
    });

    test('should show pending verification status', async ({ page, request }) => {
      const email = `pending-${Date.now()}@kayad.test`;
      await ApiHelper.registerApi(request, {
        firstName: 'John',
        lastName: 'Doe',
        email,
        phone: '+254712345678',
        password: 'SecurePassword123!',
        role: 'dealer',
      });

      const token = await ApiHelper.loginApi(request, email, 'SecurePassword123!');
      await page.addInitScript((authToken) => {
        window.localStorage.setItem('token', authToken);
      }, token);

      await page.goto('/dealer/dashboard');

      // Verify pending status
      await expect(page.locator('[data-testid="verification-status"]')).toContainText('Pending');
    });
  });
});
