import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Initialise Lenis (smooth scroll style obermann — easing exponentiel marqué)
 * et le ponte avec GSAP/ScrollTrigger.
 *
 * Retourne `null` si `prefers-reduced-motion: reduce` est actif :
 * dans ce cas on laisse le scroll natif.
 */
export function initSmoothScroll(reducedMotion: boolean): Lenis | null {
  if (reducedMotion) return null;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
  });

  // Lenis → ScrollTrigger : à chaque scroll, on rafraîchit les triggers
  lenis.on('scroll', ScrollTrigger.update);

  // Un seul ticker pour tout : GSAP pilote Lenis
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
