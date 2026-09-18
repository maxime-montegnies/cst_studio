/**
 * Ancrage de la base du rig 3D pour chaque section.
 *
 * Deux types d'ancrage :
 *  - `world(x, y, z)`     — position absolue dans le monde
 *  - `edge(side, opts)`   — accroché à un bord du viewport, résolu à
 *    runtime selon l'aspect ratio courant. Réagit au resize.
 *
 * `opts` pour edge :
 *  - inset : distance vers l'intérieur depuis le bord (positif = plus dedans,
 *            négatif = dépasse à l'extérieur). En unités monde.
 *  - cross : position le long de l'axe perpendiculaire au bord :
 *            - right/left → cross = Y (vertical)
 *            - top/bottom → cross = X (horizontal)
 *  - z     : profondeur dans la scène (défaut 0)
 *
 * Convention `baseRotation` :
 *  - [0, 0, 0]              → posée à plat (face caméra)
 *  - [0, 0,  Math.PI / 2]   → mounted "paroi de droite"
 *  - [0, 0, -Math.PI / 2]   → mounted "paroi de gauche"
 *  - [Math.PI, 0, 0]        → mounted "plafond"
 *
 * `yawRange` / `pitchRange` (optionnels) :
 *   Bornes normalisées [-1, 1] de l'amplitude souris pour cette section.
 *   - Défaut implicite : [-1, 1] (symétrique, plein débattement)
 *   - Caméra ancrée à droite → la souris est forcément à sa gauche →
 *     yawRange: [-1, 0]  (pan uniquement vers la gauche)
 *   - Caméra ancrée à gauche  → yawRange: [0, 1]
 *   - Caméra au plafond       → pitchRange: [0, 1] si pitch+ = "regarde en bas"
 *   La valeur souris est interpolée linéairement entre `min` et `max` :
 *     mouseX = -1 → output = min
 *     mouseX = +1 → output = max
 *     mouseX =  0 → output = (min + max) / 2
 */
export type Anchor =
  | { kind: 'world'; x: number; y: number; z: number }
  | {
      kind: 'edge';
      side: 'right' | 'left' | 'top' | 'bottom' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
      insetX?: number;
      insetY?: number;
      cross?: number;
      z?: number;
    };

export interface SceneState {
  anchor: Anchor;
  baseRotation: [number, number, number];
  scale: number;
  /** Plage normalisée [-1, 1] pour le yaw (souris X). Défaut [-1, 1]. */
  yawRange?: [number, number];
  /** Plage normalisée [-1, 1] pour le pitch (souris Y). Défaut [-1, 1]. */
  pitchRange?: [number, number];
}

/** Helper : ancrage à une position monde absolue. */
export function world(x: number, y: number, z = 0): Anchor {
  return { kind: 'world', x, y, z };
}

/** Helper : ancrage à un bord du viewport (résolu à runtime). */
export function edge(
  side: 'right' | 'left' | 'top' | 'bottom' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright',
  opts: { insetX?: number; insetY?: number; cross?: number; z?: number } = {},
): Anchor {
  return { kind: 'edge', side, ...opts };
}

export const sceneStates: Record<string, SceneState> = {
  hero: {
    // Centrée, légèrement bas — la caméra fait face au spectateur
    // anchor: world(0.0, -0.6, 0),
    // baseRotation: [0, 0, 0],
    // scale: 1.0,
    anchor: edge('bottomright', { insetX: 0.28, insetY: 0.76, cross: 0.2, z: -0.0 }),
    baseRotation: [Math.PI, -Math.PI*0.6, Math.PI],
    scale: 0.7,
    // La souris est forcément à droite de la caméra → pan vers la droite seul
    pitchRange: [-0.7, 0.5],
    yawRange: [-1.0, -0.1],
  },

  // ── Poses dédiées tactile ────────────────────────────────────────
  // Sur mobile, le rig reste fixe (pas de transitions de section).
  // Une pose par orientation : portrait (vertical) et landscape (horizontal).
  // CameraController bascule entre les deux au resize / changement d'orientation.
  mobilePortrait: {
    // Écran étroit en hauteur : on remonte un peu et on agrandit
    anchor: edge('top', { insetX: 0.0, insetY: 0.22, cross: 0, z: -0.0 }),
    baseRotation: [Math.PI, 0.0, 0],
    scale: 0.75,
    pitchRange: [0.6, 1],
    yawRange: [-0.4, 0.4],
  },
  mobileLandscape: {
    // Écran large et court : centré, taille standard
    anchor: edge('bottomright', { insetX: 0.28, insetY: 0.3, cross: 0.2, z: -0.0 }),
    baseRotation: [Math.PI, -Math.PI*0.6, Math.PI],
    scale: 0.9,
    pitchRange: [-0.3, 0.3],
    yawRange: [-0.5, 0.5],
  },

  services: {
    anchor: edge('bottomleft', { insetX: 0.28, insetY: 0.76, cross: 0.2, z: -0.0 }),
    baseRotation: [Math.PI, Math.PI*0.6, Math.PI],
    scale: 0.7,
    // La souris est forcément à droite de la caméra → pan vers la droite seul
    pitchRange: [-0.7, 0.5],
    yawRange: [0.1, 1.1],
  },
  showreel: {
    anchor: edge('topright', { insetX: 0.028, insetY: 0.46, cross: 0.2, z: 0.0 }),
    baseRotation: [Math.PI, -Math.PI*0.6, 0],
    scale: 0.85,
    // La souris est forcément à gauche de la caméra → pan vers la gauche seul
    pitchRange: [-0.3, 1],
    yawRange: [-1.3, -0.2],
  },
  realisations: {
    anchor: edge('topleft', { insetX: 0.28, insetY: 0.76, cross: 0.0, z: -0.0 }),
    baseRotation: [Math.PI, Math.PI*0.6, 0],
    scale: 0.7,
    // La souris est forcément à droite de la caméra → pan vers la droite seul
    pitchRange: [-0.3, 1],
    yawRange: [0.2, 1.3],    
  },
  methode: {
    // Plafond centré, comme une caméra qui supervise la production
    anchor: edge('top', { insetX: 1.0, insetY: -0.5, cross: 0, z: -0.0 }),
    baseRotation: [Math.PI, -Math.PI*0.8, 0],
    scale: 0.75,
    pitchRange: [0, 1],
  },
  studio: {
    // Droite, plus en avant pour cohabiter avec stats/témoignages
    anchor: edge('right', { insetX: 0.3, insetY: 0.3, cross: 0.5, z: 0.0 }),
    baseRotation: [0, 0, Math.PI / 2],
    scale: 0.9,
    yawRange: [-1, 0],
  },
  contact: {
    // Centrée, plus proche du spectateur — moment final
    // anchor: world(0, -0.4, 0.4),
    // baseRotation: [0, 0, 0],
    // scale: 1.15,
    anchor: edge('bottom', { insetX: 1.0, insetY: -0.5, cross: 0, z: -0.0 }),
    baseRotation: [Math.PI, -Math.PI*0.8, Math.PI],
    scale: 0.75,
    pitchRange: [-1, 1],
  },
};

export type SceneStateName = keyof typeof sceneStates;
