import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';

function TestComp({ options }) {
  const [ref, entry] = useIntersectionObserver(options);
  return (
    <div ref={ref} data-testid="sentinel">
      {entry ? `intersecting:${entry.isIntersecting}` : 'no-entry'}
    </div>
  );
}

// Mock IntersectionObserver class
class MockIntersectionObserver {
  static instances = [];
  static lastCallback = null;

  constructor(callback, options = {}) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
    MockIntersectionObserver.lastCallback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }

  // Helper to trigger callback for testing
  triggerCallback(entries) {
    this.callback(entries, this);
  }
}

describe('useIntersectionObserver', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    MockIntersectionObserver.lastCallback = null;
    globalThis.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a ref and entry', () => {
    render(<TestComp />);
    expect(screen.getByTestId('sentinel')).toBeDefined();
    // The hook should have created an observer
    expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0);
  });

  it('creates IntersectionObserver with correct options', () => {
    render(<TestComp />);
    const instance = MockIntersectionObserver.instances[0];
    expect(instance.options).toMatchObject({ threshold: 0, rootMargin: '200px' });
  });

  it('creates IntersectionObserver with custom options', () => {
    render(<TestComp options={{ threshold: 0.5, rootMargin: '100px' }} />);
    const instance = MockIntersectionObserver.instances[0];
    expect(instance.options).toMatchObject({ threshold: 0.5, rootMargin: '100px' });
  });

  it('calls observe when ref is attached', () => {
    const observeSpy = vi.spyOn(MockIntersectionObserver.prototype, 'observe');
    render(<TestComp />);
    expect(observeSpy).toHaveBeenCalled();
  });
});
