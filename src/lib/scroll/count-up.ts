import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Compte de 0 jusqu'à `data-count-to` quand l'élément entre en viewport.
 *
 * Usage :
 *   <span data-count-to="200" data-count-suffix="+">0</span>
 *
 * Si `prefers-reduced-motion: reduce`, la valeur finale est affichée
 * directement sans animation.
 */
export function initCountUp(reducedMotion: boolean) {
  const elements = document.querySelectorAll<HTMLElement>('[data-count-to]');

  if (reducedMotion) {
    elements.forEach((el) => {
      const target = parseInt(el.dataset.countTo ?? '0', 10);
      const suffix = el.dataset.countSuffix ?? '';
      el.textContent = `${target}${suffix}`;
    });
    return;
  }

  elements.forEach((el) => {
    const target = parseInt(el.dataset.countTo ?? '0', 10);
    const suffix = el.dataset.countSuffix ?? '';

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        const obj = { value: 0 };
        gsap.to(obj, {
          value: target,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = `${Math.floor(obj.value)}${suffix}`;
          },
        });
      },
    });
  });
}
