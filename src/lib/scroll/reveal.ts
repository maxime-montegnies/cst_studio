import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-reveal générique pour les éléments `[data-reveal]`.
 *
 * Usage :
 *   <h2 data-reveal>Titre</h2>
 *   <div data-reveal data-reveal-delay="0.2">Élément retardé</div>
 *
 * Initial state (`opacity: 0; translateY(32px)`) appliqué via CSS sur
 * `html.js [data-reveal]` (voir `global.css`) — évite tout flash si JS désactivé.
 *
 * Si `prefers-reduced-motion: reduce`, les éléments sont rendus visibles
 * immédiatement sans animation.
 */
export function initReveal(reducedMotion: boolean) {
  const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');

  if (reducedMotion) {
    elements.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  elements.forEach((el) => {
    const delay = parseFloat(el.dataset.revealDelay ?? '0');
    gsap.fromTo(
      el,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 1.0,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      },
    );
  });
}
