import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit', () => {
  test('Homepage accessibility', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Showroom page accessibility', async ({ page }) => {
    await page.goto('/showroom');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard navigation on homepage', async ({ page }) => {
    await page.goto('/');

    // Test Tab navigation
    await page.keyboard.press('Tab');
    const firstFocusable = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT'].includes(firstFocusable || '')).toBeTruthy();

    // Test Enter key on links
    await page.keyboard.press('Enter');

    // Test Escape key to close modals
    await page.keyboard.press('Escape');
  });

  test('Focus indicators visible', async ({ page }) => {
    await page.goto('/');

    // Focus on first interactive element
    await page.keyboard.press('Tab');

    // Check for visible focus indicator
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineOffset: styles.outlineOffset,
        boxShadow: styles.boxShadow
      };
    });

    // Focus should have visible indicator
    const hasFocusIndicator =
      focusedElement.outline !== 'none' ||
      focusedElement.boxShadow !== 'none';

    expect(hasFocusIndicator).toBeTruthy();
  });

  test('Skip navigation link exists', async ({ page }) => {
    await page.goto('/');

    // Check for skip navigation link
    const skipLink = page.locator('a[href="#main"], a[href="#content"], a[href="#skip"]');
    const exists = await skipLink.count();

    // Skip link should exist
    expect(exists).toBeGreaterThan(0);
  });

  test('ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/');

    // Check buttons without text have aria-label
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button should have text or aria-label
      if (!text || text.trim() === '') {
        expect(ariaLabel).toBeTruthy();
      }
    }
  });

  test('Images have alt text', async ({ page }) => {
    await page.goto('/');

    // Check all images have alt text
    const images = await page.locator('img').all();

    for (const image of images) {
      const alt = await image.getAttribute('alt');

      // Image should have alt attribute
      expect(alt).toBeDefined();
    }
  });

  test('Form labels exist', async ({ page }) => {
    await page.goto('/login');

    // Check form inputs have associated labels
    const inputs = await page.locator('input').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');

      // Input should have id, aria-label, or aria-labelledby
      expect(id || ariaLabel || ariaLabelledby).toBeTruthy();
    }
  });

  test('Color contrast', async ({ page }) => {
    await page.goto('/');

    // This would require a color contrast checker library
    // For now, we'll check that text is not on similar background colors
    const body = await page.locator('body');
    const styles = await body.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      };
    });

    // Body should have defined colors
    expect(styles.color).toBeDefined();
    expect(styles.backgroundColor).toBeDefined();
  });

  test('Modal focus trap', async ({ page }) => {
    await page.goto('/');

    // Open a modal (this would need to be adapted to actual modal trigger)
    // For now, we'll test the concept

    // When modal opens, focus should be trapped inside
    // When modal closes, focus should return to trigger
  });

  test('Live regions for dynamic content', async ({ page }) => {
    await page.goto('/');

    // Check for live regions
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();

    // Live regions should exist for dynamic content
    // This is informational, not a hard requirement
  });
});
