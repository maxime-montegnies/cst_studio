import * as THREE from "three";

type ExportOptions = {
  scale?: number; // >1 for higher resolution (e.g., 2 for 2x)
  transparent?: boolean; // true => preserves alpha
  pixelRatio?: number; // override device pixel ratio
  beforeRender?: () => void; // run just before rendering (e.g., update)
  renderFn?: () => void; // custom render (e.g., composer.render())
};

export async function exportPNG(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  {
    scale = 1,
    transparent = false,
    pixelRatio,
    beforeRender,
    renderFn,
  }: ExportOptions = {},
): Promise<Blob> {
  // Remember current renderer state
  const prev = {
    size: renderer.getSize(new THREE.Vector2()),
    pr: renderer.getPixelRatio(),
    alpha: (renderer as any).getContextAttributes?.().alpha ?? false,
    toneMapping: renderer.toneMapping,
    toneMappingExposure: renderer.toneMappingExposure,
    autoClear: renderer.autoClear,
  };

  // If you plan to read pixels after rendering, ensure the buffer is preserved
  // (best to set this when creating the renderer). If not set, toDataURL may be blank.
  // const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, alpha: transparent, antialias: true });
  // If preserveDrawingBuffer is false, consider re-creating the renderer for export, or render once and immediately call toBlob.

  // Prepare renderer for export
  if (transparent && !prev.alpha) {
    // If the renderer wasn't created with alpha:true, you won't get transparency in PNG.
    // You can still export, but background will be opaque.
    // console.warn('Renderer was not created with alpha:true; PNG will not be transparent.');
  }

  if (pixelRatio !== undefined) renderer.setPixelRatio(pixelRatio);
  const exportWidth = Math.round(prev.size.x * scale);
  const exportHeight = Math.round(prev.size.y * scale);
  renderer.setSize(exportWidth, exportHeight, false);
  renderer.autoClear = true;

  beforeRender?.();

  // Render (use composer if provided)
  if (renderFn) {
    renderFn();
  } else {
    renderer.render(scene, camera);
  }

  // Ensure GPU finished before reading
  (
    renderer.getContext() as WebGLRenderingContext | WebGL2RenderingContext
  ).finish?.();

  // Get PNG blob (preferred over dataURL for memory)
  const canvas = renderer.domElement;
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), "image/png"),
  );

  // Trigger download
  // const link = document.createElement('a');
  // link.href = URL.createObjectURL(blob);
  // link.download = filename;
  // document.body.appendChild(link);
  // link.click();
  // URL.revokeObjectURL(link.href);
  // link.remove();

  // Restore renderer state
  renderer.setSize(prev.size.x, prev.size.y, false);
  renderer.setPixelRatio(prev.pr);
  renderer.toneMapping = prev.toneMapping;
  renderer.toneMappingExposure = prev.toneMappingExposure;
  renderer.autoClear = prev.autoClear;

  return blob;
}
