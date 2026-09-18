import * as THREE from 'three';

/**
 * Caméra de surveillance articulée — hiérarchie attendue :
 *
 *   root  (group ajouté à la scène ; sa position/rotation = "ancrage" d'une section)
 *   └── Base         — partie statique (mounting plate)
 *       └── PivotYaw     — rotation autour de Y (suit la souris horizontalement)
 *           └── PivotPitch   — rotation autour de X (suit la souris verticalement)
 *               └── (tête, lentille, accessoires…)
 *
 * Pour le vrai logo en GLB : les objets doivent porter ces noms exacts
 * dans Blender (ou autre outil 3D), sensibles à la casse.
 */
export interface CameraRig {
  /** Group racine — c'est lui que `CameraController` déplace par section. */
  root: THREE.Object3D;
  /** Partie statique (mounting plate). Référence pour debug uniquement. */
  base: THREE.Object3D;
  /** Pivot yaw — rotation autour de Y (pan horizontal). */
  pivotYaw: THREE.Object3D;
  /** Pivot pitch — rotation autour de X (tilt vertical). */
  pivotPitch: THREE.Object3D;
}

/**
 * Placeholder stylisé construit en primitives Three.js.
 * Mimique la hiérarchie attendue du GLB final → la même logique de contrôle
 * fonctionne pour les deux, on swap juste la source du rig.
 */
export function createPlaceholderRig(): CameraRig {
  const root = new THREE.Group();
  root.name = 'CameraRig';

  // ── Matériaux ──────────────────────────────────────
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1f,
    metalness: 0.75,
    roughness: 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xd01c1c,
    metalness: 0.5,
    roughness: 0.3,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0d,
    metalness: 0.6,
    roughness: 0.2,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xd01c1c,
    emissive: 0xd01c1c,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });

  // ── Base (mounting plate) ──────────────────────────
  const base = new THREE.Group();
  base.name = 'Base';
  const basePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 0.12, 32),
    bodyMat,
  );
  base.add(basePlate);
  // Petit cou cylindrique au sommet de la base
  const baseNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 0.16, 24),
    bodyMat,
  );
  baseNeck.position.y = 0.14;
  base.add(baseNeck);
  root.add(base);

  // ── Pivot YAW ──────────────────────────────────────
  const pivotYaw = new THREE.Group();
  pivotYaw.name = 'PivotYaw';
  pivotYaw.position.y = 0.22; // sommet du cou de la base
  base.add(pivotYaw);

  // Le pivot yaw porte un cylindre vertical (la "tour" rotative)
  const yawTower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.32, 20),
    bodyMat,
  );
  yawTower.position.y = 0.16;
  pivotYaw.add(yawTower);

  // ── Pivot PITCH ────────────────────────────────────
  const pivotPitch = new THREE.Group();
  pivotPitch.name = 'PivotPitch';
  pivotPitch.position.y = 0.32;
  pivotYaw.add(pivotPitch);

  // Bras qui tient la tête
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.14, 0.42),
    bodyMat,
  );
  arm.position.z = 0.18;
  pivotPitch.add(arm);

  // ── Tête de caméra ─────────────────────────────────
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.32, 0.6),
    accentMat,
  );
  head.position.z = 0.52;
  pivotPitch.add(head);

  // Bord noir devant la tête (cadre de l'objectif)
  const lensRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.06, 32),
    darkMat,
  );
  lensRing.rotation.x = Math.PI / 2;
  lensRing.position.z = 0.84;
  pivotPitch.add(lensRing);

  // Lentille noire
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.14, 32),
    darkMat,
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.92;
  pivotPitch.add(lens);

  // LED rouge "REC" sur la tête
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), ledMat);
  led.position.set(0.15, 0.12, 0.7);
  pivotPitch.add(led);

  return { root, base, pivotYaw, pivotPitch };
}

/**
 * Extrait le rig depuis un GLB chargé. Les objets doivent être nommés
 * `Base`, `PivotYaw`, `PivotPitch` (sensible à la casse) — n'importe où
 * dans la hiérarchie tant que la chaîne parent-enfant respecte l'ordre.
 */
export function rigFromGLB(scene: THREE.Object3D): CameraRig {
  const base = scene.getObjectByName('Base');
  const pivotYaw = scene.getObjectByName('PivotYaw');
  const pivotPitch = scene.getObjectByName('PivotPitch');

  if (!base || !pivotYaw || !pivotPitch) {
    const found = {
      Base: base?.name ?? 'MANQUANT',
      PivotYaw: pivotYaw?.name ?? 'MANQUANT',
      PivotPitch: pivotPitch?.name ?? 'MANQUANT',
    };
    throw new Error(
      `Le GLB doit contenir des objets nommés "Base", "PivotYaw", "PivotPitch". ` +
        `Trouvés : ${JSON.stringify(found)}`,
    );
  }

  return { root: scene, base, pivotYaw, pivotPitch };
}
