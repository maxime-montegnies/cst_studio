# CST Studio — Site

Site de production audiovisuelle — Metz, Grand Est.

## Stack

- [Astro 5](https://astro.build) — site statique pré-rendu, zéro JS par défaut sur le contenu
- TypeScript strict
- CSS vanilla avec design tokens (variables CSS)
- **Fond CSS** animé — `Background.astro` (radial-gradient suivant la souris, grain SVG, vignette)
- **Three.js** — canvas transparent uniquement pour le logo 3D
- **Lenis** — smooth scroll style obermann (easing exponentiel)
- **GSAP + ScrollTrigger** — animations scroll-driven et pose du logo par section

## Démarrage

```bash
npm install
npm run dev
```

Le site tourne sur http://localhost:4321

## Scripts

| Commande | Action |
|----------|--------|
| `npm run dev` | Serveur de développement (HMR) |
| `npm run build` | Build de production dans `./dist/` |
| `npm run preview` | Aperçu local du build de production |

## Structure

```
site/
├── public/
│   ├── favicon.svg
│   └── models/                 (à venir : logo.glb)
└── src/
    ├── components/
    │   ├── Nav.astro           Navigation + menu mobile
    │   ├── Footer.astro
    │   ├── Background.astro    Fond CSS animé (glow souris + grain + vignette)
    │   ├── Scene.astro         Canvas 3D transparent (logo uniquement)
    │   └── sections/           Une section landing = un composant
    │       └── Hero.astro
    ├── content/
    │   └── portfolio/          Projets (Markdown) — collection Astro
    ├── data/                   Données structurées (services, témoignages, stats…)
    ├── layouts/
    │   └── Base.astro          Shell HTML : SEO, OG, Schema.org, fonts
    ├── lib/
    │   ├── scene/
    │   │   ├── scene.ts               Three.js : scène, caméra, lumières, loaders rig
    │   │   ├── rig.ts                 CameraRig : placeholder + GLB loader par nom de mesh
    │   │   ├── camera-controller.ts   Look-at souris + pose ancrée par section (GSAP/ScrollTrigger)
    │   │   ├── states.ts              Map { section → {basePosition, baseRotation, scale} }
    │   │   ├── pointer.ts             État pointer partagé (lerp 0.06)
    │   │   └── shader-background.ts   ⚠️ Dormant — gardé pour effet WebGL ultérieur
    │   └── scroll/
    │       ├── lenis.ts               Smooth scroll obermann + ponté GSAP ScrollTrigger
    │       ├── reveal.ts              Scroll-reveal [data-reveal]
    │       └── count-up.ts            Compteur 0 → [data-count-to]
    ├── pages/
    │   └── index.astro         Page d'accueil — compose les sections
    ├── styles/
    │   ├── tokens.css          Variables CSS (couleurs, typo, espacements)
    │   └── global.css          Reset, accessibilité, utilitaires (boutons)
    ├── content.config.ts       Schémas des collections de contenu
    └── site.config.ts          Métadonnées site (nom, contact, socials, nav)
```

## Le logo 3D — caméra de surveillance articulée

L'objet 3D est une **caméra de surveillance** structurée en 3 pivots emboîtés.
Le contrôleur (`src/lib/scene/camera-controller.ts`) anime :
- L'**ancrage** (`rig.root.position/rotation/scale`) en fonction de la section visible
- Les **pivots yaw + pitch** pour faire "regarder" la caméra vers la souris en temps réel

### Hiérarchie attendue

```
root (group, ajouté à la scène)
└── Base              ← partie statique (mounting plate)
    └── PivotYaw      ← rotation autour de Y (pan, suit souris horizontalement)
        └── PivotPitch ← rotation autour de X (tilt, suit souris verticalement)
            └── tête / lentille / accessoires
```

**Pour le GLB final** : nomme les objets exactement `Base`, `PivotYaw`, `PivotPitch`
(sensible à la casse) dans Blender. `rigFromGLB()` les retrouve par nom.

### Passer du placeholder au vrai GLB

1. Déposer le fichier dans `public/models/logo.glb`
2. Dans `src/components/Scene.astro`, remplacer
   ```ts
   const rig = scene.loadPlaceholderRig();
   ```
   par
   ```ts
   const rig = await scene.loadRigFromGLB('/models/logo.glb');
   ```

### Limites mécaniques

Les pivots sont **clampés** comme une vraie caméra PTZ :
- Yaw : ±~100° (`maxYaw` dans `camera-controller.ts`)
- Pitch : ±~63° (`maxPitch`)

Tune si nécessaire. Lerp angles à `0.08` pour le ressenti "caméra paresseuse".

### Ancrages par section

Dans `src/lib/scene/states.ts`, chaque section définit la pose de la base via
un système d'**ancrages sémantiques résolus à runtime** (réagit au resize) :

```ts
import { edge, world } from './states';

services: {
  // Accrochée au bord droit du viewport, inset 0.35 unités, cross (Y) 0.2
  anchor: edge('right', { inset: 0.35, cross: 0.2, z: -0.3 }),
  baseRotation: [0, 0, Math.PI / 2],
  scale: 0.85,
},
contact: {
  // Position monde absolue
  anchor: world(0, -0.4, 0.4),
  baseRotation: [0, 0, 0],
  scale: 1.15,
},
```

**Anchors disponibles** :
- `world(x, y, z)` — coordonnées monde absolues
- `edge(side, { inset, cross, z })` — accrochée à un bord du viewport
  - `side` : `'right' | 'left' | 'top' | 'bottom'`
  - `inset` : distance depuis le bord vers l'intérieur (négatif = dépasse à l'extérieur)
  - `cross` : position sur l'axe perpendiculaire (Y pour right/left, X pour top/bottom)
  - `z` : profondeur (défaut 0)

Les ancrages `edge` sont **recalculés au resize** de la fenêtre — la caméra
reste accrochée au bord visuel quelle que soit la taille de viewport.

Conventions `baseRotation` :
- `[0, 0, 0]` → posée à plat (face caméra)
- `[0, 0, π/2]` → paroi droite
- `[0, 0, -π/2]` → paroi gauche
- `[π, 0, 0]` → plafond

## Comment ajouter…

### Un projet portfolio
Créer un fichier dans `src/content/portfolio/`, par ex. `05-mon-projet.md` :

```md
---
title: Mon projet
category: Production vidéo
image: /portfolio/mon-projet.jpg
order: 5
---
```

### Une section avec une pose 3D dédiée
1. Créer le composant : `src/components/sections/MaSection.astro`
2. Mettre `data-scene-state="ma-section"` sur la balise `<section>`
3. Ajouter l'entrée correspondante dans `src/lib/scene/states.ts` :
   ```ts
   'ma-section': { position: [1, 0, 0], rotation: [0, 0.4, 0], scale: 0.8 }
   ```
4. Importer le composant dans `src/pages/index.astro`

À l'entrée en viewport de la section, le logo s'animera vers cette pose
(durée 1.2s, easing `power3.out`).

### Modifier la palette / la typographie
Tout est centralisé dans `src/styles/tokens.css`.

## Accessibilité

- `prefers-reduced-motion: reduce` désactive Lenis, ScrollTrigger et le suivi
  souris du logo. Le logo reste en pose statique `hero`.
- Skip-link "Aller au contenu" dans le layout
- Focus visible sur tous les éléments interactifs
- Menu mobile clavier-accessible (Esc pour fermer, `aria-expanded`)

## Sections à migrer depuis le draft

Structure resserrée : **4 nav + 6 sections + Contact**.

Nav : Services · Réalisations · Méthode · Studio (+ CTA "Devis gratuit").

| Section | Anchor | `data-scene-state` | État |
|---|---|---|---|
| Hero | — | `hero` | ✅ |
| Services | `#services` | `services` | ✅ |
| Showreel | `#showreel` | `showreel` | ✅ |
| Réalisations | `#realisations` | `realisations` | ✅ |
| Méthode | `#methode` | `methode` | ✅ |
| Studio (trust block) | `#studio` | `studio` | ✅ |
| Contact | `#contact` | `contact` | ✅ |

**Studio** fusionne 4 sections du draft : Why + Testimonials + Clients + Stats — un seul gros bloc "trust" plutôt que 3 sections qui répètent le même message.

Le draft original est à la racine du projet : `cst_studio_draft.html`.
