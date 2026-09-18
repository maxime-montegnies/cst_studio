/**
 * État souris partagé entre les modules de la scène (logo, shader).
 *
 * - `target`  : position brute en NDC [-1, 1] sur chaque axe, mise à jour à `pointermove`
 * - `lerped`  : version lissée à appeler `lerpPointer()` une fois par frame
 *
 * Les deux consommateurs (LogoController, ShaderBackground) lisent `lerped`
 * pour éviter les saccades et garder un mouvement cohérent.
 */
export interface PointerState {
  target: { x: number; y: number };
  lerped: { x: number; y: number };
}

export function createPointerState(): PointerState {
  const state: PointerState = {
    target: { x: 0, y: 0 },
    lerped: { x: 0, y: 0 },
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      state.target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      state.target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );

  return state;
}

/** Lisse `lerped` vers `target` — à appeler une fois par frame. */
export function lerpPointer(state: PointerState, factor = 0.06) {
  state.lerped.x += (state.target.x - state.lerped.x) * factor;
  state.lerped.y += (state.target.y - state.lerped.y) * factor;
}
