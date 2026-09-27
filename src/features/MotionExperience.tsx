import { useEffect } from 'react';

export type MotionLevel = 'low' | 'ultra';

/** Decorative choreography only. Content and controls exist before this effect runs. */
export function MotionExperience({ level, section }: { level: MotionLevel; section: string }) {
  useEffect(() => {
    if (level !== 'ultra' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let disposed = false;
    let animation: { cancel: () => void } | undefined;
    const frame = requestAnimationFrame(() => {
      // Animate a bounded set of page panels, including those rendered by feature components.
      // Avoid animating transaction rows or every imported holding in a large account.
      const targets = Array.from(document.querySelectorAll<HTMLElement>([
        '.content > .page-heading', '.content > .wealth-strip', '.content > .stat-grid',
        '.content > .dashboard-paths', '.content > .card', '.content > .dashboard-grid',
        '.content > .budget-summary', '.content > .budget-grid',
        '.content > .feature-intro', '.content > .feature-grid',
        '.content > .investment-list',
        '.content > .ultra-stage',
      ].join(', '))).slice(0, 12);
      if (!targets.length) return;
      void import('animejs/animation').then(({ animate }) => {
        if (disposed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        animation = animate(targets, {
          opacity: { from: 0, to: 1 },
          translateY: { from: '54px', to: '0px' },
          duration: 1100,
          delay: (_, index) => Math.min((index ?? 0) * 160, 640),
          ease: 'outCubic',
        });
      }).catch(() => { /* The interface remains usable if the optional module is unavailable. */ });
    });
    return () => { disposed = true; cancelAnimationFrame(frame); animation?.cancel(); };
  }, [level, section]);

  return null;
}
