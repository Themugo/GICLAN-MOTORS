// src/utils/observability.ts
// Frontend observability utilities for RUM, performance tracking, and analytics
// These functions gracefully degrade if optional analytics packages are not installed

// Lazy-loaded optional dependencies
let Sentry: any = null;
let posthog: any = null;

async function loadDependencies() {
  if (Sentry && posthog) return { Sentry, posthog };

  try {
    const [sentryModule, posthogModule] = await Promise.allSettled([
      import('@sentry/react').catch(() => null),
      import('posthog-js').catch(() => null),
    ]);

    Sentry = sentryModule?.status === 'fulfilled' ? sentryModule.value : null;
    posthog = posthogModule?.status === 'fulfilled' ? posthogModule.value?.default || posthogModule.value : null;

    return { Sentry, posthog };
  } catch {
    return { Sentry: null, posthog: null };
  }
}

/**
 * Initialize observability (Sentry + PostHog)
 */
export async function initObservability() {
  await loadDependencies();
}

/**
 * Track Core Web Vitals
 */
export async function trackCoreWebVitals() {
  if (typeof window === 'undefined') return;

  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry || !ph) return;

  try {
    const webVitals = await import('web-vitals');
    const { onCLS, onINP, onFCP, onLCP, onTTFB } = webVitals;

    const trackMetric = (metric: any) => {
      const name = metric.name;
      sentry.captureMessage(`${name} Metric`, {
        level: 'info',
        tags: { metric: name, value: metric.value, rating: metric.rating },
        extra: { metric },
      });
      ph.capture('core_web_vital', { metric: name, value: metric.value, rating: metric.rating });
    };

    onCLS(trackMetric);
    onINP(trackMetric);
    onFCP(trackMetric);
    onLCP(trackMetric);
    onTTFB(trackMetric);
  } catch (err) {
    console.warn('[Observability] Failed to track web vitals:', err);
  }
}

/**
 * Track page view
 */
export async function trackPageView(pageName: string, properties?: Record<string, any>) {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry || !ph) return;

  ph.capture('$pageview', { page: pageName, ...properties });
  sentry.addBreadcrumb({ category: 'navigation', message: `Viewed ${pageName}`, level: 'info' });
}

/**
 * Track user action
 */
export async function trackUserAction(action: string, properties?: Record<string, any>) {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry || !ph) return;

  ph.capture(action, properties);
  sentry.addBreadcrumb({ category: 'user', message: action, level: 'info', data: properties });
}

/**
 * Track error
 */
export async function trackError(error: Error, context?: Record<string, any>) {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry) {
    console.error('[Error]', error, context);
    return;
  }

  sentry.captureException(error, { extra: context });
  ph?.capture?.('error', { error: error.message, stack: error.stack, ...context });
}

/**
 * Track performance
 */
export async function trackPerformance(metricName: string, value: number, unit: string = 'ms') {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry && !ph) return;

  ph?.capture?.('performance', { metric: metricName, value, unit });
  sentry?.captureMessage?.('Performance Metric', {
    level: 'info',
    tags: { metric: metricName, value, unit },
  });
}

/**
 * Track workflow step
 */
export async function trackWorkflowStep(workflowName: string, step: string, properties?: Record<string, any>) {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry && !ph) return;

  ph?.capture?.('workflow_step', { workflow: workflowName, step, ...properties });
  sentry?.addBreadcrumb?.({ category: 'workflow', message: `${workflowName} - ${step}`, level: 'info', data: properties });
}

/**
 * Track workflow completion
 */
export async function trackWorkflowCompletion(workflowName: string, success: boolean, properties?: Record<string, any>) {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry && !ph) return;

  ph?.capture?.('workflow_completion', { workflow: workflowName, success, ...properties });
  sentry?.addBreadcrumb?.({
    category: 'workflow',
    message: `${workflowName} - ${success ? 'Completed' : 'Failed'}`,
    level: success ? 'info' : 'warning',
    data: properties
  });
}

/**
 * Track workflow abandonment
 */
export async function trackWorkflowAbandonment(workflowName: string, step: string, properties?: Record<string, any>) {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry && !ph) return;

  ph?.capture?.('workflow_abandonment', { workflow: workflowName, step, ...properties });
  sentry?.captureMessage?.('Workflow Abandoned', {
    level: 'warning',
    tags: { workflow: workflowName, step },
    extra: properties,
  });
}

/**
 * Track user journey
 */
export async function trackUserJourney(journeyName: string, step: string, properties?: Record<string, any>) {
  const { posthog: ph } = await loadDependencies();
  ph?.capture?.('user_journey', { journey: journeyName, step, ...properties });
}

/**
 * Track API call
 */
export async function trackApiCall(endpoint: string, method: string, duration: number, success: boolean) {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry && !ph) return;

  ph?.capture?.('api_call', { endpoint, method, duration, success });

  if (!success) {
    sentry?.captureMessage?.('API Call Failed', {
      level: 'warning',
      tags: { endpoint, method },
      extra: { duration },
    });
  }
}

/**
 * Set user context
 */
export async function setUserContext(userId: string, properties?: Record<string, any>) {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  if (!sentry && !ph) return;

  sentry?.setUser?.({ id: userId, ...properties });
  ph?.identify?.(userId, properties);
}

/**
 * Clear user context
 */
export async function clearUserContext() {
  const { Sentry: sentry, posthog: ph } = await loadDependencies();
  sentry?.setUser?.(null);
  ph?.reset?.();
}
