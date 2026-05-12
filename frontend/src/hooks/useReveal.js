import { useEffect } from 'react';

// Adds .is-visible to any `.reveal` element when it scrolls into the viewport.
export default function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps); // eslint-disable-line
}
