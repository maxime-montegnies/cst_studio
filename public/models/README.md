# Logo 3D

Déposer ici `logo.glb` (et `logo.bin` / textures si non-embarquées).

Pour activer le vrai logo, voir `src/components/Scene.astro` :
remplacer `scene.loadPlaceholder()` par `await scene.loadGLB('/models/logo.glb')`.
