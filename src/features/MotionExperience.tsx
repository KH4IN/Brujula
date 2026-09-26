import { useEffect } from 'react';

export type MotionLevel = 'low' | 'medium' | 'high';

/** Decorative choreography only. Content and controls exist before this effect runs. */
export function MotionExperience({ level, section }: { level: MotionLevel; section: string }) {
  useEffect(() => {
    if (level !== 'high' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let disposed = false;
    let animation: { cancel: () => void } | undefined;
    const frame = requestAnimationFrame(() => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>('.content > .page-heading, .content > .wealth-strip, .content > .stat-grid, .content > .dashboard-paths, .content > .card, .content > .dashboard-grid'));
      if (!targets.length) return;
      void import('animejs/animation').then(({ animate }) => {
        if (disposed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        animation = animate(targets, {
          opacity: { from: 0, to: 1 },
          translateY: { from: '14px', to: '0px' },
          duration: 540,
          delay: (_, index) => Math.min((index ?? 0) * 65, 300),
          ease: 'outCubic',
        });
      }).catch(() => { /* The interface remains usable if the optional module is unavailable. */ });
    });
    return () => { disposed = true; cancelAnimationFrame(frame); animation?.cancel(); };
  }, [level, section]);

  return null;
}
