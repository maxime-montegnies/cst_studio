import * as THREE from 'three';

/**
 * Effet dissolve par dither — pattern Bayer 4×4 (style NES / SNES / pixel-art).
 *
 * Patche les matériaux d'un objet 3D pour ajouter un seuil de dither screen-space :
 *  - `uDissolve = 0`  → matériau intégralement visible
 *  - `uDissolve = 1`  → tous les fragments `discard`és (rig invisible)
 *  - entre les deux  → les pixels disparaissent par paquets selon un pattern
 *    Bayer 4×4 régulier en croisillons (look "retro pixel-art shading")
 *
 * Le pattern est calculé sur `gl_FragCoord` (donc fixé à l'écran, pas à l'objet)
 * → effet "trame TV / signal qui décroche" qui ne bouge pas avec la caméra.
 *
 * Implémenté via `material.onBeforeCompile` pour préserver les propriétés PBR
 * (metalness, roughness, textures…) du matériau d'origine — la dissolve est
 * juste ajoutée en tête du fragment shader, avant le calcul de lighting.
 */
export interface DissolveUniforms {
  /** 0 = visible, 1 = invisible. Animer via GSAP. */
  uDissolve: { value: number };
  /** Taille d'une cellule Bayer en pixels écran. 1 = très fin, 4-6 = chunky retro. */
  uDitherScale: { value: number };
}

export function createDissolveUniforms(): DissolveUniforms {
  return {
    uDissolve: { value: 0 },
    uDitherScale: { value: 1 },
  };
}

const FRAGMENT_HEADER = /* glsl */ `
uniform float uDissolve;
uniform float uDitherScale;

// Bayer 4×4 ordered dither — style NES/SNES classique.
// Construit par récursion : pattern Bayer 2×2 répété puis combiné avec lui-même.
// Renvoie un seuil dans [0, 1) régulier en croisillons.
float bayerDither(vec2 fragCoord) {
  vec2 c = floor(fragCoord / max(uDitherScale, 1.0));
  // Bayer 2×2 base :   0 2
  //                    3 1
  // Formule : (x*2 + y*3) mod 4
  vec2 inner = mod(c, 2.0);
  vec2 outer = mod(floor(c * 0.5), 2.0);
  float bInner = mod(inner.x * 2.0 + inner.y * 3.0, 4.0);
  float bOuter = mod(outer.x * 2.0 + outer.y * 3.0, 4.0);
  // Recombinaison : 4 * bInner + bOuter donne le Bayer 4×4
  //  0  8  2 10
  // 12  4 14  6
  //  3 11  1  9
  // 15  7 13  5
  return (4.0 * bInner + bOuter) / 16.0;
}
`;

const FRAGMENT_DISCARD = /* glsl */ `
float ditherT = bayerDither(gl_FragCoord.xy*1.0);
if (0.75 > ditherT) discard;
if (uDissolve > 0.0) {
}
`;

/** Patche un matériau pour qu'il consomme les uniforms dissolve partagés. */
export function applyDissolveMaterial(
  material: THREE.Material,
  uniforms: DissolveUniforms,
): void {
  // Les matériaux peuvent être partagés entre plusieurs meshes — on évite
  // de re-patcher en empilant des onBeforeCompile (ce qui dupliquerait
  // l'injection du header dans le fragment shader et casserait la compile).
  if (patchedMaterials.has(material)) return;
  patchedMaterials.add(material);

  const onBeforeCompile = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    // Chaîne avec un onBeforeCompile existant si jamais (rare)
    onBeforeCompile?.call(material, shader, renderer);

    shader.uniforms.uDissolve = uniforms.uDissolve;
    shader.uniforms.uDitherScale = uniforms.uDitherScale;

    shader.fragmentShader = shader.fragmentShader
      .replace('void main()', `${FRAGMENT_HEADER}\nvoid main()`)
      .replace('void main() {', `void main() {\n${FRAGMENT_DISCARD}`);
  };

  // Force la recompilation et invalide le cache de program partagé entre matériaux
  material.customProgramCacheKey = () => 'cst-dissolve';
  material.needsUpdate = true;
}

/** Garde-fou contre les patches répétés sur un même matériau partagé. */
const patchedMaterials = new WeakSet<THREE.Material>();

/** Applique dissolve à tous les meshes d'une hiérarchie. */
export function applyDissolveToRig(
  root: THREE.Object3D,
  uniforms: DissolveUniforms,
): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((m) => applyDissolveMaterial(m, uniforms));
  });
}
