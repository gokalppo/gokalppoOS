// Honour the OS-level "reduce motion" preference.
export const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia) &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
