// Performance utilities - no JSX to avoid type issues

// Preload a component (for anticipated navigation)
export function preloadComponent(importFn: () => Promise<any>) {
    if (typeof window !== 'undefined') {
        importFn();
    }
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

// Throttle utility for scroll handlers
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// Request idle callback polyfill
export function idleCallback(callback: () => void) {
    if (typeof window !== 'undefined') {
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(callback);
        } else {
            setTimeout(callback, 1);
        }
    }
}

// Measure performance
export function measurePerformance(name: string, fn: () => void) {
    if (typeof window !== 'undefined' && window.performance) {
        const start = performance.now();
        fn();
        const end = performance.now();
        console.log(`[Perf] ${name}: ${(end - start).toFixed(2)}ms`);
    } else {
        fn();
    }
}

// Check if device prefers reduced motion
export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Get connection type for adaptive loading
export function getConnectionType(): 'slow' | 'fast' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';
    const connection = (navigator as any).connection;
    if (!connection) return 'unknown';

    if (connection.saveData) return 'slow';
    if (connection.effectiveType === '4g') return 'fast';
    if (['slow-2g', '2g', '3g'].includes(connection.effectiveType)) return 'slow';
    return 'unknown';
}
