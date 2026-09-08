/**
 * Authentication Helper for E2E Tests
 * Provides reusable authentication functions for different user roles
 */

import { Page } from '@playwright/test';

export interface UserCredentials {
  email: string;
  password: string;
  role?: 'buyer' | 'dealer' | 'admin';
}

export class AuthHelper {
  /**
   * Login a user with given credentials
   */
  static async login(page: Page, credentials: UserCredentials) {
    await page.goto('/login');

    await page.fill('input[name="email"]', credentials.email);
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/\/dashboard|\/home/, { timeout: 10000 });

    // Verify login success
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
    if (!isLoggedIn) {
      throw new Error('Login failed - user menu not visible');
    }
  }

  /**
   * Logout current user
   */
  static async logout(page: Page) {
    await page.click('[data-testid="user-menu"]');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/login', { timeout: 10000 });
  }

  /**
   * Register a new user
   */
  static async register(page: Page, userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'buyer' | 'dealer';
  }) {
    await page.goto('/register');

    await page.fill('input[name="firstName"]', userData.firstName);
    await page.fill('input[name="lastName"]', userData.lastName);
    await page.fill('input[name="email"]', userData.email);
    await page.fill('input[name="phone"]', userData.phone);
    await page.fill('input[name="password"]', userData.password);

    // Select role
    await page.click(`input[name="role"][value="${userData.role}"]`);

    await page.click('button[type="submit"]');

    // Wait for registration to complete
    await page.waitForURL(/\/verify-email|\/dashboard/, { timeout: 10000 });
  }

  /**
   * Verify email with OTP
   */
  static async verifyEmail(page: Page, otp: string) {
    await page.goto('/verify-email');
    await page.fill('input[name="otp"]', otp);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Get test user credentials for different roles
   */
  static getTestUser(role: 'buyer' | 'dealer' | 'admin'): UserCredentials {
    const users = {
      buyer: {
        email: process.env.E2E_BUYER_EMAIL || 'buyer@kayad.test',
        password: process.env.E2E_BUYER_PASSWORD || 'TestPassword123!',
        role: 'buyer' as const,
      },
      dealer: {
        email: process.env.E2E_DEALER_EMAIL || 'dealer@kayad.test',
        password: process.env.E2E_DEALER_PASSWORD || 'TestPassword123!',
        role: 'dealer' as const,
      },
      admin: {
        email: process.env.E2E_ADMIN_EMAIL || 'admin@kayad.test',
        password: process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!',
        role: 'admin' as const,
      },
    };

    return users[role];
  }
}
