import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPlaceholderRig, rigFromGLB, type CameraRig } from './rig';
import { createGlitchPass, type GlitchUniforms } from './passes/glitch-pass';

/**
 * Wrapper Three.js minimal : scène, caméra, lumières, render, loader rig.
 */
export class Scene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly glitchUniforms: GlitchUniforms;
  private rig?: CameraRig;
  private resizeSubscribers: Array<(w: number, h: number) => void> = [];
  private onResize = () => this.resize();
  private clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    // Pixel ratio = 1 partout : on n'a pas besoin de retina pour ce rendu
    // (le dither + glitch sont volontairement chunky, plus de perfs en bonus).
    this.renderer.setPixelRatio(0.25);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    // this.setupLighting();

    // ── Post-processing pipeline ────────────────────────────
    // Render target HDR-capable + MSAA 4x (WebGL 2). Alpha conservé
    // pour que le canvas reste transparent et laisse voir le fond CSS.
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      // type: THREE.HalfFloatType,
      type: THREE.UnsignedByteType,
      samples: 0,
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const glitch = createGlitchPass();
    this.glitchUniforms = glitch.uniforms;
    this.composer.addPass(glitch.pass);

    // OutputPass : tone mapping + sRGB encoding final
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 4, 5);
    this.scene.add(key);

    // Rim rouge — signature de marque, simule un spot en latéral
    const rim = new THREE.DirectionalLight(0xff3333, 0.55);
    rim.position.set(-4, -1, -3);
    this.scene.add(rim);

    // Fill subtil bleu nuit pour adoucir les ombres
    const fill = new THREE.DirectionalLight(0x445577, 0.3);
    fill.position.set(0, -3, 2);
    this.scene.add(fill);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const dpr = this.renderer.getPixelRatio();
    // Le glitch shader veut la résolution en pixels physiques pour caler ses
    // scanlines, et le composer travaille à la même résolution interne.
    this.glitchUniforms.uResolution.value.set(w * dpr, h * dpr);
    this.resizeSubscribers.forEach((cb) => cb(w * dpr, h * dpr));
  }

  /** Ajoute un objet à la scène. */
  add(obj: THREE.Object3D) {
    this.scene.add(obj);
  }

  /** S'abonne au resize, notifié avec la taille du canvas en pixels physiques. */
  onResizeNotify(callback: (w: number, h: number) => void) {
    this.resizeSubscribers.push(callback);
    const dpr = this.renderer.getPixelRatio();
    callback(window.innerWidth * dpr, window.innerHeight * dpr);
  }

  /**
   * Placeholder : caméra de surveillance stylisée en primitives.
   * Mimique la hiérarchie Base / PivotYaw / PivotPitch du GLB final.
   */
  loadPlaceholderRig(): CameraRig {
    const rig = createPlaceholderRig();
    this.rig = rig;
    this.scene.add(rig.root);
    return rig;
  }

  /**
   * Charge le rig depuis un GLB. Les pivots du modèle doivent porter les
   * noms `Base`, `PivotYaw`, `PivotPitch` (cf. `rig.ts`).
   */
  async loadRigFromGLB(url: string): Promise<CameraRig> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const rig = rigFromGLB(gltf.scene);
    this.rig = rig;
    this.scene.add(rig.root);
    return rig;
  }

  getRig(): CameraRig | undefined {
    return this.rig;
  }

  /**
   * Charge une environment map HDR (EXR) et l'applique comme IBL :
   *  - réflexions PBR (metalness > 0)
   *  - éclairage indirect réaliste sur les matériaux
   *
   * Le PMREMGenerator pré-filtre la map équirectangulaire en plusieurs mip
   * levels — c'est ce que les shaders PBR de Three.js attendent pour des
   * reflets de qualité (sans ça, on aurait du sampling pur lent).
   *
   * Le fond de la scène reste transparent (on n'affecte pas `scene.background`)
   * pour ne pas masquer le fond CSS animé.
   */
  async loadEnvironment(url: string): Promise<void> {
    const loader = new EXRLoader();
    const equirect = await loader.loadAsync(url);
    equirect.mapping = THREE.EquirectangularReflectionMapping;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envMap = pmremGenerator.fromEquirectangular(equirect).texture;

    this.scene.environment = envMap;

    // Cleanup : on n'a plus besoin de l'equirect ni du générateur
    equirect.dispose();
    pmremGenerator.dispose();
  }

  render() {
    // Le shader glitch a besoin du temps écoulé pour ses random per-frame
    this.glitchUniforms.uTime.value = this.clock.getElapsedTime();
    this.composer.render();
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.composer.dispose();
    this.renderer.dispose();
  }
}
