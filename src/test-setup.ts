/**
 * Vitest Setup File
 * Mocks for browser APIs not available in jsdom
 */

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(
    private callback: IntersectionObserverCallback,
    private options?: IntersectionObserverInit
  ) {}

  observe(target: Element): void {
    // Simulate immediate intersection for testing
    const entry: IntersectionObserverEntry = {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: (this.options?.root instanceof Element ? this.options.root.getBoundingClientRect() : null),
      time: Date.now(),
    };
    this.callback([entry], this);
  }

  unobserve(_target: Element): void {
    // No-op for testing
  }

  disconnect(): void {
    // No-op for testing
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
  constructor(
    private callback: ResizeObserverCallback,
    private options?: ResizeObserverOptions
  ) {}

  observe(target: Element): void {
    // No-op for testing
  }

  unobserve(target: Element): void {
    // No-op for testing
  }

  disconnect(): void {
    // No-op for testing
  }
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  get length() { return 0; },
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  get length() { return 0; },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL
const urlCreateObjectURLMock = () => 'blob:test-url';
const urlRevokeObjectURLMock = () => {};

Object.defineProperty(URL, 'createObjectURL', {
  value: urlCreateObjectURLMock,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: urlRevokeObjectURLMock,
});

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: true,
    PROD: false,
    MODE: 'test',
    VITE_API_URL: '/api',
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
  },
});

// Mock canvas for any chart libraries
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  font = '';
  textAlign = 'start';
  textBaseline = 'alphabetic';

  fillRect() {}
  clearRect() {}
  getImageData() { return { data: [] }; }
  putImageData() {}
  createImageData() { return { data: [] }; }
  setTransform() {}
  drawImage() {}
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  stroke() {}
  fill() {}
  arc() {}
  measureText() { return { width: 0 }; }
  translate() {}
  scale() {}
  rotate() {}
  transform() {}
}

HTMLCanvasElement.prototype.getContext = (() => new MockCanvasRenderingContext2D()) as any;

// Mock HTMLElement.dataset
if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'dataset', {
    get() {
      return {};
    },
  });
}

// Silence console.error for expected test failures
const originalError = console.error;
console.error = (...args: unknown[]) => {
  // Allow certain errors through
  const message = args[0]?.toString?.() || '';
  if (
    message.includes('Unable to find an element') ||
    message.includes('not wrapped in act') ||
    message.includes('Warning:')
  ) {
    originalError.apply(console, args);
  }
};
