import * as THREE from 'three';

/**
 * Quad fullscreen avec un ShaderMaterial — sert de fond animé pour la scène.
 *
 * Le vertex shader place le quad directement en clip space (NDC), donc
 * il couvre toujours l'intégralité du viewport quelle que soit la caméra.
 *
 * Le rendu se fait AVANT le logo (`renderOrder = -1`, `depthWrite = false`),
 * et n'écrit pas dans le depth buffer — le logo passe toujours devant.
 *
 * Uniforms :
 *  - uTime       : temps écoulé (secondes) — grain animé
 *  - uMouse      : pointer lissé en NDC [-1, 1]
 *  - uResolution : taille du canvas en pixels
 *  - uScroll     : progression du scroll [0, 1]
 *
 * Le shader actuel produit un dégradé rouge/noir radial influencé par la souris,
 * avec grain de film subtil et vignette. C'est volontairement simple — on peut
 * remplacer le fragmentShader par n'importe quoi de plus poussé (fluid, fbm,
 * post-process, etc.).
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Place le quad en clip space — couvre tout le viewport
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uTime;
  uniform vec2  uMouse;
  uniform vec2  uResolution;
  uniform float uScroll;

  varying vec2 vUv;

  // Hash 2D → [0,1]
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Value noise 2D
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    // UV corrigés pour l'aspect (sinon le dégradé radial s'écrase)
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vUv;
    vec2 aspectUv = vec2(uv.x * aspect, uv.y);

    // Centre du glow : centre de l'écran biaisé légèrement vers la souris
    vec2 mouseUv = uMouse * 0.5 + 0.5;            // 0..1
    mouseUv.x *= aspect;
    vec2 center  = vec2(0.5 * aspect, 0.5);
    vec2 target  = mix(center, mouseUv, 0.25);
    float d = distance(aspectUv, target);

    // Couleurs de marque
    vec3 deepRed   = vec3(0.82, 0.11, 0.11);
    vec3 nearBlack = vec3(0.027, 0.027, 0.039);

    // Halo radial — glow doux qui décroît
    float glow = 1.0 - smoothstep(0.0, 0.65, d);
    vec3 color = mix(nearBlack, deepRed * 0.35, glow);

    // Léger shift colorimétrique en fonction du scroll
    color = mix(color, color * vec3(1.0, 0.88, 0.88), uScroll * 0.4);

    // Grain de film
    float grain = noise(uv * 1500.0 + uTime * 0.3) * 0.05 - 0.025;
    color += grain;

    // Vignette
    float vignette = 1.0 - smoothstep(0.55, 1.15, length(uv - 0.5));
    color *= mix(0.55, 1.0, vignette);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class ShaderBackground {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uScroll: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1; // rendu en premier
  }

  setResolution(width: number, height: number) {
    this.material.uniforms.uResolution.value.set(width, height);
  }

  setMouse(x: number, y: number) {
    this.material.uniforms.uMouse.value.set(x, y);
  }

  setScroll(progress: number) {
    this.material.uniforms.uScroll.value = progress;
  }

  setTime(time: number) {
    this.material.uniforms.uTime.value = time;
  }

  dispose() {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
