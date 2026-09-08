/**
 * Vehicle Listing E2E Tests
 *
 * Tests for vehicle listing workflow
 * Covers: happy paths, edge cases, failure scenarios
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { ApiHelper } from '../helpers/api.helper';

test.describe('Vehicle Listing Workflow', () => {
  let dealerToken: string;

  test.beforeEach(async ({ page, request }) => {
    // Login as dealer
    const credentials = AuthHelper.getTestUser('dealer');
    dealerToken = await ApiHelper.loginApi(request, credentials.email, credentials.password);
    await page.addInitScript((token) => {
      window.localStorage.setItem('token', token);
    }, dealerToken);

    await page.goto('/dealer/dashboard');
  });

  test.describe('Happy Path', () => {
    test('should create vehicle listing successfully', async ({ page }) => {
      // Navigate to add vehicle page
      await page.click('button:has-text("Add Vehicle")');
      await expect(page).toHaveURL(/\/dealer\/vehicles\/new/);

      // Fill vehicle details
      await page.fill('input[name="title"]', 'Toyota Camry 2020');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="model"]', 'Camry');
      await page.fill('input[name="year"]', '2020');
      await page.fill('input[name="price"]', '2500000');
      await page.fill('input[name="mileage"]', '50000');
      await page.fill('textarea[name="description"]', 'Well-maintained Toyota Camry with full service history');

      // Select fuel type
      await page.selectOption('select[name="fuelType"]', 'petrol');

      // Select transmission
      await page.selectOption('select[name="transmission"]', 'automatic');

      // Upload images
      await page.setInputFiles('input[type="file"][multiple]', [
        'test/fixtures/car1.jpg',
        'test/fixtures/car2.jpg',
        'test/fixtures/car3.jpg',
      ]);

      // Submit listing
      await page.click('button[type="submit"]');

      // Verify listing created
      await expect(page).toHaveURL(/\/dealer\/vehicles/);
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Vehicle listed successfully');
    });

    test('should create vehicle listing with auction', async ({ page }) => {
      await page.click('button:has-text("Add Vehicle")');

      // Fill vehicle details
      await page.fill('input[name="title"]', 'BMW X5 2021');
      await page.fill('input[name="make"]', 'BMW');
      await page.fill('input[name="model"]', 'X5');
      await page.fill('input[name="year"]', '2021');
      await page.fill('input[name="price"]', '8000000');

      // Enable auction
      await page.click('input[name="isAuction"]');

      // Set auction parameters
      await page.fill('input[name="startingPrice"]', '7000000');
      await page.fill('input[name="reservePrice"]', '7500000');

      // Set auction duration
      await page.selectOption('select[name="auctionDuration"]', '7');

      // Submit
      await page.click('button[type="submit"]');

      // Verify auction created
      await expect(page.locator('[data-testid="auction-created"]')).toBeVisible();
    });

    test('should edit existing vehicle listing', async ({ page, request }) => {
      // Create vehicle first
      const vehicle = await ApiHelper.createVehicle(request, dealerToken, {
        title: 'Test Vehicle',
        make: 'Toyota',
        model: 'Corolla',
        year: 2019,
        price: 2000000,
      });

      // Navigate to edit page
      await page.goto(`/dealer/vehicles/${vehicle.data._id}/edit`);

      // Update price
      await page.fill('input[name="price"]', '2200000');
      await page.fill('textarea[name="description"]', 'Updated description');

      // Submit
      await page.click('button[type="submit"]');

      // Verify update
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should delete vehicle listing', async ({ page, request }) => {
      // Create vehicle first
      const vehicle = await ApiHelper.createVehicle(request, dealerToken, {
        title: 'Test Vehicle',
        make: 'Toyota',
        model: 'Corolla',
        year: 2019,
        price: 2000000,
      });

      // Navigate to vehicle detail
      await page.goto(`/dealer/vehicles/${vehicle.data._id}`);

      // Click delete
      await page.click('button:has-text("Delete")');

      // Confirm deletion
      await page.click('button:has-text("Confirm")');

      // Verify deletion
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('deleted');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle maximum image upload', async ({ page }) => {
      await page.click('button:has-text("Add Vehicle")');

      // Fill basic details
      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="model"]', 'Corolla');
      await page.fill('input[name="year"]', '2019');
      await page.fill('input[name="price"]', '2000000');

      // Upload maximum allowed images (e.g., 20)
      const imageFiles = Array(20).fill('test/fixtures/car1.jpg');
      await page.setInputFiles('input[type="file"][multiple]', imageFiles);

      // Submit
      await page.click('button[type="submit"]');

      // Should either succeed or show max limit error
      const errorElement = page.locator('[data-testid="image-limit-error"]');
      const successElement = page.locator('[data-testid="success-message"]');

      await expect(errorElement.or(successElement)).toBeVisible();
    });

    test('should handle invalid image format', async ({ page }) => {
      await page.click('button:has-text("Add Vehicle")');

      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="model"]', 'Corolla');
      await page.fill('input[name="year"]', '2019');
      await page.fill('input[name="price"]', '2000000');

      // Upload invalid file
      await page.setInputFiles('input[type="file"]', 'test/fixtures/invalid.exe');

      // Submit
      await page.click('button[type="submit"]');

      // Verify error
      await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
    });

    test('should handle missing required fields', async ({ page }) => {
      await page.click('button:has-text("Add Vehicle")');

      // Don't fill required fields
      await page.click('button[type="submit"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="make-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="price-error"]')).toBeVisible();
    });

    test('should handle negative price', async ({ page }) => {
      await page.click('button:has-text("Add Vehicle")');

      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="price"]', '-1000');

      await page.click('button[type="submit"]');

      // Verify error
      await expect(page.locator('[data-testid="price-error"]')).toBeVisible();
    });

    test('should handle future year', async ({ page }) => {
      await page.click('button:has-text("Add Vehicle")');

      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="year"]', '2030');

      await page.click('button[type="submit"]');

      // Verify error
      await expect(page.locator('[data-testid="year-error"]')).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('should handle image upload failure', async ({ page }) => {
      // Mock image upload failure
      await page.route('**/api/upload', route => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Upload failed' }) });
      });

      await page.click('button:has-text("Add Vehicle")');

      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="price"]', '2000000');

      await page.setInputFiles('input[type="file"]', 'test/fixtures/car1.jpg');

      await page.click('button[type="submit"]');

      // Verify error
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    });

    test('should handle NTSA verification failure', async ({ page }) => {
      // Mock NTSA failure
      await page.route('**/api/ntsa/verify', route => {
        route.fulfill({ status: 400, body: JSON.stringify({ error: 'Verification failed' }) });
      });

      await page.click('button:has-text("Add Vehicle")');

      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="chassisNumber"]', 'INVALID123');
      await page.fill('input[name="price"]', '2000000');

      await page.click('button[type="submit"]');

      // Verify error
      await expect(page.locator('[data-testid="ntsa-error"]')).toBeVisible();
    });

    test('should handle network timeout during listing creation', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/cars', route => {
        setTimeout(() => route.abort(), 30000);
      });

      await page.click('button:has-text("Add Vehicle")');

      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="price"]', '2000000');

      await page.click('button[type="submit"]');

      // Verify timeout error
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
    });

    test('should handle SEO generation failure', async ({ page }) => {
      // Mock SEO failure
      await page.route('**/api/seo/generate', route => {
        route.fulfill({ status: 500 });
      });

      await page.click('button:has-text("Add Vehicle")');

      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="price"]', '2000000');

      await page.click('button[type="submit"]');

      // Should still succeed but without SEO
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Bulk Upload', () => {
    test('should handle bulk vehicle upload via CSV', async ({ page }) => {
      await page.goto('/dealer/vehicles/bulk-upload');

      // Upload CSV file
      await page.setInputFiles('input[type="file"]', 'test/fixtures/vehicles.csv');

      // Submit
      await page.click('button[type="submit"]');

      // Verify upload started
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

      // Wait for completion
      await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible({ timeout: 60000 });
    });

    test('should handle invalid CSV format', async ({ page }) => {
      await page.goto('/dealer/vehicles/bulk-upload');

      await page.setInputFiles('input[type="file"]', 'test/fixtures/invalid.csv');

      await page.click('button[type="submit"]');

      // Verify error
      await expect(page.locator('[data-testid="csv-error"]')).toBeVisible();
    });
  });

  test.describe('Listing Status', () => {
    test('should set listing to draft', async ({ page }) => {
      await page.click('button:has-text("Add Vehicle")');

      await page.fill('input[name="title"]', 'Test Vehicle');
      await page.fill('input[name="make"]', 'Toyota');
      await page.fill('input[name="price"]', '2000000');

      // Select draft status
      await page.selectOption('select[name="status"]', 'draft');

      await page.click('button[type="submit"]');

      // Verify draft status
      await expect(page.locator('[data-testid="status-draft"]')).toBeVisible();
    });

    test('should publish draft listing', async ({ page, request }) => {
      // Create draft vehicle
      const vehicle = await ApiHelper.createVehicle(request, dealerToken, {
        title: 'Test Vehicle',
        make: 'Toyota',
        status: 'draft',
      });

      // Navigate to vehicle
      await page.goto(`/dealer/vehicles/${vehicle.data._id}`);

      // Click publish
      await page.click('button:has-text("Publish")');

      // Verify published
      await expect(page.locator('[data-testid="status-published"]')).toBeVisible();
    });

    test('should archive sold vehicle', async ({ page, request }) => {
      // Create vehicle
      const vehicle = await ApiHelper.createVehicle(request, dealerToken, {
        title: 'Test Vehicle',
        make: 'Toyota',
        status: 'sold',
      });

      await page.goto(`/dealer/vehicles/${vehicle.data._id}`);

      // Click archive
      await page.click('button:has-text("Archive")');

      // Verify archived
      await expect(page.locator('[data-testid="status-archived"]')).toBeVisible();
    });
  });
});
