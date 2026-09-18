import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
import { sceneStates, type Anchor, type SceneState } from './states';
import type { CameraRig } from './rig';
import type { PointerState } from './pointer';
import {
  applyDissolveToRig,
  createDissolveUniforms,
  type DissolveUniforms,
} from './dissolve';

gsap.registerPlugin(ScrollTrigger);

const tmpTarget = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const tmpQuatDesired = new THREE.Quaternion();
const tmpQuatBaseInv = new THREE.Quaternion();
const tmpQuatLocal = new THREE.Quaternion();
const tmpOffset = new THREE.Vector3();

/**
 * Contrôle la caméra de surveillance articulée.
 *
 *  - "anchor" (position + rotation + scale du `rig.root`) : résolu depuis
 *    l'ancrage de la section courante (world coords ou edge du viewport).
 *    Animé par GSAP / ScrollTrigger. Recalculé au resize.
 *  - "look" (yaw + pitch des pivots) : mapping proportionnel depuis la souris,
 *    appliqué en **world space** puis converti en rotations locales des pivots
 *    via l'inverse de la rotation de la base. Conséquence : que la base soit
 *    posée à plat, sur un mur ou au plafond, mouseX → pan visuel horizontal
 *    et mouseY → tilt visuel vertical, **toujours**.
 *
 * Math :
 *   rotation_world_désirée = R_yaw(worldY) · R_pitch(worldX)     (ordre YXZ)
 *   rotation_locale_pivots = inverse(rotation_base) · rotation_world_désirée
 *   → décomposition en Euler YXZ
 *     → tmpEuler.y → pivotYaw.rotation.y
 *     → tmpEuler.x → pivotPitch.rotation.x
 *
 * **Déferral des transitions de section** : quand Lenis est en plein scroll
 * (anchor click long, fast wheel…), on enregistre la dernière section
 * traversée dans `pendingState` mais on ne déclenche pas le tween. Le tween
 * démarre quand la velocity passe sous `settleVelocity`, vers la **section
 * finale** — pas via les intermédiaires.
 *
 * **Transition de section** : dissolve par dither (cf. `dissolve.ts`) entre
 * deux poses. Le rig disparaît en pixels noisy (`uDissolve` 0 → 1), on
 * téléporte position/rotation/scale instantanément pendant qu'il est
 * invisible, puis il réapparaît (`uDissolve` 1 → 0). Pas de slide à
 * l'écran — l'identité de la section est portée uniquement par le dissolve.
 *
 * Reduced motion : pivots fixes à 0 (caméra droit devant).
 */
export class CameraController {
  private rig: CameraRig;
  private threeCamera: THREE.PerspectiveCamera;
  private pointer: PointerState;
  private reduced: boolean;
  private lenis: Lenis | null;

  // Pose ancrée (mutée par GSAP)
  private anchor = {
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    scale: 1,
  };

  // État actif (pour recalcul au resize)
  private currentState: SceneState = sceneStates.hero;

  // Section traversée pendant un scroll en cours — appliquée à l'arrêt
  private pendingState: SceneState | null = null;

  // Angles courants en world space (lerpés vers la cible chaque frame)
  private worldYaw = 0;
  private worldPitch = 0;

  // Amplitudes max — ressenti "caméra posée"
  private readonly maxYaw = Math.PI / 3; // ±60°
  private readonly maxPitch = Math.PI * 0.2; // ±36°
  private readonly aimLerp = 0.8;

  // Seuil de velocity Lenis sous lequel on considère le scroll comme "presque
  // terminé" — la caméra commence à tween avant l'arrêt complet pour arriver
  // en même temps que le contenu. En pixels/seconde (~50 = dernière fraction
  // du easing-out de Lenis). Plus haut = la caméra démarre plus tôt.
  private readonly settleVelocity = 200;

  // Durées des deux phases du dissolve (out → swap instantané → in)
  private readonly dissolveOutDuration = 0.05;
  private readonly dissolveInDuration = 0.07;

  // Durées du burst glitch — découplées du dissolve : le dissolve fait le swap
  // de pose en ~120ms, mais le glitch s'étale sur ~750ms pour rester bien visible
  // comme "signature visuelle de la transition".
  private readonly glitchAttackDuration = 0.15; // 0.08 → 1.0 rapidement
  private readonly glitchDecayDuration = 0.6;   // 1.0 → 0.08 progressivement

  // Dissolve par dither — uniforms partagés appliqués à tous les matériaux du rig.
  // Animés pendant les transitions de section pour donner un effet
  // "caméra qui décroche / signal CCTV".
  private readonly dissolve: DissolveUniforms = createDissolveUniforms();

  // Timeline en cours pour pouvoir l'annuler si une nouvelle transition arrive
  private currentTimeline: gsap.core.Timeline | null = null;

  // Offset de `Base` dans le frame local de `root` — mesuré au chargement.
  // Permet d'aligner la **Base** (et non la racine du rig) sur l'ancrage,
  // quelle que soit la structure du GLB.
  private readonly rigBaseOffset = new THREE.Vector3();

  // Intensité du glitch post-process (référence externe au pass).
  // En steady-state on reste à `idleGlitch`, on pulse à 1.0 pendant la transition.
  private glitchUniform: { value: number } | null = null;
  private readonly idleGlitch = 0.08;

  // Mode tactile : pas de transitions de section (rig fixé sur hero),
  // rotations dérivées du scroll au lieu du pointer.
  private isTouch: boolean;

  // Progression de scroll [0, 1] — utilisée en mode touch pour piloter
  // les rotations du rig. Mise à jour via le listener Lenis.
  private scrollProgress = 0;

  constructor(
    rig: CameraRig,
    threeCamera: THREE.PerspectiveCamera,
    pointer: PointerState,
    reducedMotion: boolean,
    lenis: Lenis | null = null,
    glitchUniform: { value: number } | null = null,
    isTouch: boolean = false,
  ) {
    this.rig = rig;
    this.threeCamera = threeCamera;
    this.pointer = pointer;
    this.reduced = reducedMotion;
    this.lenis = lenis;
    this.glitchUniform = glitchUniform;
    this.isTouch = isTouch;
    if (this.glitchUniform) this.glitchUniform.value = this.idleGlitch;

    // Patch tous les matériaux du rig pour supporter le dither dissolve
    applyDissolveToRig(this.rig.root, this.dissolve);

    // Mesure l'offset de Base dans le frame local de root, pour pouvoir
    // ensuite aligner Base (et pas la racine) sur la position d'ancrage.
    this.computeBaseOffset();

    const initial = this.pickFixedState();
    this.currentState = initial;
    this.resolveAnchor(initial.anchor, this.anchor.position);
    this.anchor.rotation.set(...initial.baseRotation);
    this.anchor.scale = initial.scale;
    this.applyAnchor();

    if (!this.reduced) {
      this.bindSectionStates();
      this.bindSettleListener();
    }
  }

  /**
   * Sélectionne l'état "fixe" à utiliser quand on n'a pas de transition
   * scroll-based (donc en mode touch, ou comme pose initiale par défaut).
   *
   * Sur touch : `mobilePortrait` ou `mobileLandscape` selon l'orientation.
   * Sinon (desktop) : `hero` — pose initiale, qui sera vite remplacée par
   * la première section traversée via ScrollTrigger.
   */
  private pickFixedState(): SceneState {
    if (this.isTouch) {
      const isPortrait = window.innerHeight >= window.innerWidth;
      if (isPortrait && sceneStates.mobilePortrait) return sceneStates.mobilePortrait;
      if (!isPortrait && sceneStates.mobileLandscape) return sceneStates.mobileLandscape;
    }
    return sceneStates.hero;
  }

  /** Crée un ScrollTrigger par section [data-scene-state]. */
  private bindSectionStates() {
    // En mobile/tactile, on garde le rig en pose fixe (hero) — la rotation est
    // animée par le scroll progress, pas par les sections.
    if (this.isTouch) return;

    document.querySelectorAll<HTMLElement>('[data-scene-state]').forEach((el) => {
      const name = el.dataset.sceneState;
      if (!name || !(name in sceneStates)) return;
      const target = sceneStates[name];

      ScrollTrigger.create({
        trigger: el,
        start: 'top 65%',
        end: 'bottom 35%',
        onEnter: () => this.handleEnter(target),
        onEnterBack: () => this.handleEnter(target),
      });
    });
  }

  /**
   * Écoute le scroll Lenis pour :
   *  - mettre à jour `scrollProgress` (utilisé en mode touch pour les rotations)
   *  - appliquer la dernière section traversée dès que la velocity passe sous
   *    le seuil (mode desktop uniquement)
   */
  private bindSettleListener() {
    if (!this.lenis) return;
    this.lenis.on('scroll', () => {
      this.scrollProgress = this.lenis?.progress ?? 0;
      if (!this.isTouch && this.isSettled()) this.applyPending();
    });
  }

  /** Le scroll est "essentiellement fini" : velocity faible ou idle. */
  private isSettled(): boolean {
    if (!this.lenis) return true;
    return (
      !this.lenis.isScrolling ||
      Math.abs(this.lenis.velocity) < this.settleVelocity
    );
  }

  /**
   * Appelé quand on entre dans une section.
   * - Si scroll "settled" (idle ou velocity faible) → on tween tout de suite
   * - Sinon (nav-click long, fast-scroll) → on mémorise et on attend que
   *   la velocity passe sous le seuil pour tween direct vers la section finale
   */
  private handleEnter(target: SceneState) {
    this.pendingState = target;
    if (this.isSettled()) this.applyPending();
  }

  /** Applique `pendingState` si il diffère de l'état actif. */
  private applyPending() {
    if (this.pendingState && this.pendingState !== this.currentState) {
      this.tweenTo(this.pendingState);
    }
    this.pendingState = null;
  }

  /**
   * Transition de section : dissolve out → swap instantané de la pose →
   * dissolve in. Pas de slide hors-écran : le rig est entièrement remplacé
   * pendant le moment d'invisibilité.
   */
  private tweenTo(target: SceneState) {
    this.currentState = target;

    // Tue toute transition en cours pour éviter les empilements
    this.currentTimeline?.kill();
    this.currentTimeline = null;
    gsap.killTweensOf(this.anchor.position);
    gsap.killTweensOf(this.anchor.rotation);
    gsap.killTweensOf(this.anchor);
    gsap.killTweensOf(this.dissolve.uDissolve);
    if (this.glitchUniform) gsap.killTweensOf(this.glitchUniform);

    const finalPos = new THREE.Vector3();
    this.resolveAnchor(target.anchor, finalPos);

    this.currentTimeline = gsap.timeline({
      onComplete: () => {
        this.currentTimeline = null;
      },
    });

    // ── Phase 1 — dissolve out (0 → 1) ──────────────────────
    this.currentTimeline.to(this.dissolve.uDissolve, {
      value: 1,
      duration: this.dissolveOutDuration,
      ease: 'linear',
    });

    // ── Swap instantané pendant que le rig est invisible ────
    this.currentTimeline.set(this.anchor.position, {
      x: finalPos.x,
      y: finalPos.y,
      z: finalPos.z,
    });
    this.currentTimeline.set(this.anchor.rotation, {
      x: target.baseRotation[0],
      y: target.baseRotation[1],
      z: target.baseRotation[2],
    });
    this.currentTimeline.set(this.anchor, { scale: target.scale });

    // ── Phase 2 — dissolve in (1 → 0) ───────────────────────
    this.currentTimeline.to(this.dissolve.uDissolve, {
      value: 0.9,
      duration: this.dissolveInDuration,
      ease: 'linear',
    });

    // ── Glitch (découplé du dissolve) ───────────────────────
    // Attack rapide pendant que le dissolve se passe, puis decay long pour que
    // l'effet "signal qui décroche" reste perceptible bien après le swap de pose.
    if (this.glitchUniform) {
      this.currentTimeline.to(
        this.glitchUniform,
        {
          value: 1.0,
          duration: this.glitchAttackDuration,
          ease: 'power3.in',
        },
        0, // démarre en même temps que la timeline
      );
      this.currentTimeline.to(
        this.glitchUniform,
        {
          value: this.idleGlitch,
          duration: this.glitchDecayDuration,
          ease: 'power2.out',
        },
        this.glitchAttackDuration, // démarre après l'attack
      );
    }
  }

  private applyAnchor() {
    // On veut que `Base` (et non la racine du rig) se retrouve à `anchor.position`.
    // → `root.position` = `anchor.position - rotation_appliquée_à(rigBaseOffset * scale)`
    tmpOffset.copy(this.rigBaseOffset);
    tmpOffset.multiplyScalar(this.anchor.scale);
    tmpOffset.applyEuler(this.anchor.rotation);

    this.rig.root.position.copy(this.anchor.position).sub(tmpOffset);
    this.rig.root.rotation.copy(this.anchor.rotation);
    this.rig.root.scale.setScalar(this.anchor.scale);
  }

  /**
   * Calcule l'offset de `Base` dans le frame local de `root`, mesuré une fois
   * au chargement quand le rig n'a pas encore reçu de transform de notre part.
   *
   * Si Base est à l'origine du root (placeholder typique) → offset = (0, 0, 0)
   * → aucune compensation, comportement identique.
   *
   * Si Base est offsettée (GLB où la racine coïncide avec PivotYaw, ou tout
   * autre arrangement) → l'offset reflète cette différence, on l'utilise pour
   * recaler la position du root et que Base se retrouve pile à l'ancrage.
   */
  private computeBaseOffset() {
    this.rig.root.updateMatrixWorld(true);
    this.rig.base.getWorldPosition(this.rigBaseOffset);
    // Transforme la position monde en frame local de root
    this.rig.root.worldToLocal(this.rigBaseOffset);
  }

  /**
   * Demi-dimensions visibles dans la scène à la profondeur z donnée.
   * Dépend du FOV de la caméra Three et de l'aspect ratio courant.
   */
  private viewportHalfSize(z: number): { halfW: number; halfH: number } {
    const distance = Math.abs(this.threeCamera.position.z - z);
    const halfH = Math.tan((this.threeCamera.fov * Math.PI) / 360) * distance;
    const halfW = halfH * this.threeCamera.aspect;
    return { halfW, halfH };
  }

  /** Résout un ancrage (world ou edge) en coordonnées monde. */
  private resolveAnchor(a: Anchor, out: THREE.Vector3) {
    if (a.kind === 'world') {
      out.set(a.x, a.y, a.z);
      return;
    }
    const z = a.z ?? 0;
    const { halfW, halfH } = this.viewportHalfSize(z);
    const insetX = a.insetX ?? 0;
    const insetY = a.insetY ?? 0;
    const cross = a.cross ?? 0;
    switch (a.side) {
      case 'right':
        out.set(halfW - insetX, cross, z);
        break;
      case 'left':
        out.set(-halfW + insetX, cross, z);
        break;
      case 'top':
        out.set(cross + insetX, halfH + insetY, z);
        break;
      case 'topleft':
        out.set(-halfW + insetX, halfH - insetY, z);
        break;
      case 'bottomleft':
        out.set(-halfW + insetX, -halfH + insetY, z);
        break;
      case 'topright':
        out.set(halfW - insetX, halfH - insetY, z);
        break;
      case 'bottomright':
        out.set(halfW - insetX, -halfH + insetY, z);
        break;
      case 'bottom':
        out.set(cross + insetX, -halfH - insetY, z);
        break;
    }
  }

  /**
   * Appelé quand le viewport change (resize, rotation device…).
   *  - En mode touch : on re-pick la pose mobile selon l'orientation courante
   *    (bascule portrait ↔ landscape automatique).
   *  - Dans tous les cas : on recalcule l'ancrage edge de l'état actif et on
   *    snap la base à la nouvelle position.
   */
  handleResize() {
    // Bascule de pose si l'orientation a changé (touch uniquement)
    if (this.isTouch) {
      const next = this.pickFixedState();
      if (next !== this.currentState) {
        this.currentState = next;
        this.anchor.rotation.set(...next.baseRotation);
        this.anchor.scale = next.scale;
      }
    }

    this.resolveAnchor(this.currentState.anchor, tmpTarget);
    this.currentTimeline?.kill();
    this.currentTimeline = null;
    gsap.killTweensOf(this.anchor.position);
    this.anchor.position.copy(tmpTarget);
  }

  /**
   * Mappe une valeur souris [-1, 1] vers une plage personnalisée [min, max].
   *  - range = undefined → identité (plein débattement [-1, 1])
   *  - range = [-1, 0]   → mouseX=-1 → -1, mouseX=+1 → 0, mouseX=0 → -0.5
   *  - range = [0, 1]    → mouseX=-1 →  0, mouseX=+1 → 1
   */
  private mapToRange(value: number, range?: [number, number]): number {
    if (!range) return value;
    const [min, max] = range;
    const t = (value + 1) / 2; // [-1, 1] → [0, 1]
    return min + (max - min) * t;
  }

  /** Appelé chaque frame. */
  update() {
    this.applyAnchor();

    // Cibles en world space — source dépend du mode
    let yawNorm: number;
    let pitchNorm: number;

    if (this.reduced) {
      yawNorm = 0;
      pitchNorm = 0;
    } else if (this.isTouch) {
      // Mobile : motion type "Lissajous" pilotée par le scroll.
      // Fréquences premières (2.5 vs 3.7) pour éviter la répétition.
      const state = this.currentState;
      const p = this.scrollProgress;
      yawNorm = Math.sin(p * Math.PI * 2.5-0.5) * (state.yawRange[1]-state.yawRange[0])+state.yawRange[0];
      pitchNorm = Math.sin(p * Math.PI * 5.0) *  (state.pitchRange[1]-state.pitchRange[0])+state.pitchRange[0];
    } else {
      // Desktop : mouse-driven, plages par section
      const state = this.currentState;
      yawNorm = this.mapToRange(this.pointer.lerped.x, state.yawRange);
      pitchNorm = this.mapToRange(this.pointer.lerped.y, state.pitchRange);
    }

    const yawTarget = yawNorm * this.maxYaw;
    const pitchTarget = pitchNorm * this.maxPitch;

    // Lerp en world space (mental model clair, transitions lisses même quand
    // la base change d'orientation entre deux sections)
    const k = this.reduced ? 1 : this.aimLerp;
    this.worldYaw += (yawTarget - this.worldYaw) * k;
    this.worldPitch += (pitchTarget - this.worldPitch) * k;

    // Rotation désirée en world space — ordre YXZ : Y (yaw) puis X (pitch)
    tmpEuler.set(this.worldPitch, this.worldYaw, 0, 'YXZ');
    tmpQuatDesired.setFromEuler(tmpEuler);

    // Inverse de la rotation de la base (anchor.rotation)
    tmpQuatBaseInv.setFromEuler(this.anchor.rotation).invert();

    // Rotation locale des pivots = inverse(base) · world_désiré
    tmpQuatLocal.copy(tmpQuatBaseInv).multiply(tmpQuatDesired);

    // Décomposer en (pitch_X, yaw_Y, _) avec ordre YXZ
    tmpEuler.setFromQuaternion(tmpQuatLocal, 'YXZ');

    this.rig.pivotYaw.rotation.y = tmpEuler.y;
    this.rig.pivotPitch.rotation.x = tmpEuler.x;
  }
}
