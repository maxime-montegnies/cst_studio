import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * Glitch post-process pass — style CCTV qui décroche / signal vidéo cassé.
 *
 * Ingrédients (tous pondérés par `uIntensity`) :
 *  - **RGB shift** : R et B décalés horizontalement, fringe couleur sur les bords
 *  - **Block displacement** : tranches horizontales aléatoires déplacées
 *  - **Scanlines** : ondulation horizontale (vieille CRT)
 *  - **White flash** : éclair blanc ponctuel
 *
 * `uIntensity = 0`   → rendu intact
 * `uIntensity = 1`   → glitch maximal
 * Anim conseillée : 0.08 en steady-state (subtil), pulse à 1.0 pendant la transition.
 */
export interface GlitchUniforms {
  uIntensity: { value: number };
  uTime: { value: number };
  uResolution: { value: THREE.Vector2 };
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uIntensity;
  uniform float uTime;
  uniform vec2 uResolution;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime*1.0;
    float i = uIntensity;

    // ── Block displacement par bandes horizontales (sparse) ──
    float bands = 28.0;
    float band = floor(uv.y * bands);
    // Seed change ~6 fois/sec pour un effet "saccadé"
    float seed = hash(vec2(band, floor(t * 60.0)));
    // Seulement les bandes avec seed > 0.75 sont déplacées
    float bandActive = step(0.75, seed);
    float bandShift = (hash(vec2(band + 11.0, floor(t * 6.0))) - 0.5)
                      * 0.08 * i * bandActive;
    uv.x += bandShift;

    // ── RGB shift ──
    float shift = (0.0015 + 0.012 * 5.0 * i);
    vec4 r = texture2D(tDiffuse, uv + vec2(shift, 0.0));
    vec4 g = texture2D(tDiffuse, uv);
    vec4 b = texture2D(tDiffuse, uv - vec2(shift, 0.0));
    vec3 col = vec3(r.r, g.g, b.b);
    // Garde l'alpha du sample central → la forme du rig reste nette
    float a = g.a;

    // ── Scanlines (subtiles, pulsent légèrement) ──
    float scan = sin(vUv.y * uResolution.y * 1.4 + t * 4.0);
    scan = 0.5 + 0.5 * scan;
    // col *= mix(1.0, scan, 0.18 * i);

    // ── Flash blanc ponctuel (rare) ──
    float flashSeed = hash(vec2(floor(t * 5.5), 13.0));
    float flash = step(0.96, flashSeed);
    // col = mix(col, vec3(1.0), flash * i * 0.35);
    col *= 0.05;
    col.g *= 0.4;
    col.b *= 0.4;

    gl_FragColor = vec4(col, a);
  }
`;

/**
 * Crée un ShaderPass glitch. Retourne le pass + ses uniforms pour pouvoir
 * tween l'intensité depuis l'extérieur.
 *
 * Note : `ShaderPass` clone les uniforms passés dans son constructeur (via
 * `UniformsUtils.clone`). Donc on récupère les uniforms **depuis le pass
 * lui-même** après création — c'est ces références-là qu'il faut muter pour
 * que ça arrive jusqu'au GPU.
 */
export function createGlitchPass(): { pass: ShaderPass; uniforms: GlitchUniforms } {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uIntensity: { value: 0.08 },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader,
    fragmentShader,
  });

  // ⚠ On retourne les uniforms du PASS (clonés), pas ceux d'origine.
  const uniforms: GlitchUniforms = {
    uIntensity: pass.uniforms.uIntensity as { value: number },
    uTime: pass.uniforms.uTime as { value: number },
    uResolution: pass.uniforms.uResolution as { value: THREE.Vector2 },
  };

  return { pass, uniforms };
}
