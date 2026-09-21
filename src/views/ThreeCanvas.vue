<script setup lang="ts">
import type { Point } from "../utils/utils.ts";
import type { LayerValue } from "../utils/utils.ts";
import type { LayerValues } from "../utils/utils.ts";
import { randomId } from "../utils/utils.ts";
import { exportPNG } from "../utils/exportPNG.ts";
import { useAppState } from "../utils/State.ts";
import { CstMaterials } from "../utils/CstMaterials.ts";
import { CstPost } from "../utils/PostProcess.ts";
import { USDZExporter } from "../utils/USDZExporter.ts";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gltfUrl from "@/assets/cst.glb?url";
import { t } from "@/strings";
import { gsap } from "gsap";
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { COLORS, COLORS_TUTO, COLORS_BG } from "../datas.ts";
import { hexToVec3Linear, hexToVec3Srgb, mixHexColors } from "@/utils/utils.ts";
import Lenis from 'lenis'
import {
  ref,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { useRoute } from "vue-router";

import { eventBus } from "@/eventBus";
import {
  Scene,
  Group,
  Matrix4,
  MeshBasicMaterial,
  WebGLRenderer,
  // OrthographicCamera,
  PerspectiveCamera,
  Clock,
  Vector3,
  Vector2,
  SRGBColorSpace,
  NoToneMapping,
  Mesh,
  InstancedMesh,
  Object3D,
  InstancedBufferAttribute,
  ShaderMaterial,
  BufferAttribute,
  MeshStandardMaterial,
  PlaneGeometry,
  BoxGeometry,
  MathUtils,
  Raycaster,
} from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { mx_bilerp_1 } from "three/src/nodes/materialx/lib/mx_noise.js";

const canvas = ref<HTMLCanvasElement | null>(null);
  const scene = new Scene();
  const introTL = gsap.timeline();
  let backgroundPlane: Mesh;
  const cstContainer: Group = new Group();
  let cstLibrary: Group;
  const cstGroup: Group = new Group();
  const cstMaterials: CstMaterials = new CstMaterials();
  let activePost: Boolean = true;
  
  
  const lenis = new Lenis()
  


const appState = useAppState();

let renderer: WebGLRenderer;
let composer: EffectComposer;

let camera: PerspectiveCamera
const clock = new Clock();
const cstPost = new CstPost();
function getiOSVersion() {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (!match) return null;
  return [
    parseInt(match[1], 10), // major
    parseInt(match[2], 10), // minor
    parseInt(match[3] || "0", 10), // patch (optional)
  ];
}
const iosVersion = getiOSVersion();


const initScroll = () => {
  gsap.registerPlugin(ScrollTrigger)
  lenis.on('scroll', (val)=>{
    cstPost.updateScroll(val.animatedScroll);
    ScrollTrigger.update()
  })
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)








document.querySelectorAll<HTMLElement>('.horizontal-section').forEach((section) => {
  const track = section.querySelector<HTMLElement>('.horizontal-track')

  if (!track) return

  const updateHeight = () => {
    const distance =
      track.scrollWidth - document.documentElement.clientWidth

    section.style.height = `${distance + window.innerHeight}px`
  }

  updateHeight()

  gsap.to(track, {
    x: () => -(track.scrollWidth - document.documentElement.clientWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
    },
  })

  window.addEventListener('resize', updateHeight)
})

}
const initThree = () => {
  loadCstLibrary(gltfUrl, (xhr) => {
  }).then((gltf) => {
    cstLibrary = gltf.scene;
    eventBus.emit("sceneReady", true);
    initCstLibrary();
    setTimeout(()=>{
      gsap.to(Scene1.position, {
        z: -8,
        scrollTrigger: {
          trigger: '#main-hero',
          start: 'top top',
          end: 'bottom top',
          markers: false,
          scrub: 1,
          onUpdate: (cal) => {
            // BgCurve.material.uniforms.uScroll.value = 1.0 - Math.min(1.0, (-BgCurve.position.z/2))
            BgCurve.material.uniforms.uScroll.value = 1.0-Math.min(1.0, (cal.progress*9))
            cstMaterials.Projo.uniforms.uScroll.value = 1.0-Math.min(1.0, (cal.progress*9))
            }
        }
      })
      gsap.to(Logo.position, {
        z: 0,
        scrollTrigger: {
          trigger: '#footer',
          start: 'top bottom',
          end: 'bottom bottom',
          markers: false,
          scrub: 1,
          }
      })
    gsap.to(SmokeFloor.position, {
      z: 0,
      scrollTrigger: {
          trigger: '#footer',
          start: 'top bottom',
          end: 'bottom bottom',
          markers: false,
          scrub: 1,
          }
      })
    gsap.to(SmokeFloor.rotation, {
      x: 0.1,
      scrollTrigger: {
          trigger: '#footer',
          start: 'top bottom',
          end: 'bottom bottom',
          markers: false,
          scrub: 1,
          }
          })
    }, 500)


  });
};


const busy = (): boolean => {
  let flag: boolean = false;
  // flag ||= tutoSaturateTween.tween?.isActive();
  return flag;
};

function loadCstLibrary(url, onProgress) {
  const loaderGLTF = new GLTFLoader();
  return loaderGLTF.loadAsync(url, onProgress).then((gltf) => {
    return gltf;
  });
}
let SpotLeft : Mesh;
let SpotRight : Mesh;
let SmokeFloor : Mesh;
let SmokeOver : Mesh;
let Logo : Mesh;
let BgCurve : Mesh;
let iPad : Mesh;
let Projo1 : Mesh;
let Projo2 : Mesh;
let Scene1 : Group;
const initCstLibrary = () => {
  console.log(cstLibrary)
  // logo?.rotation.set(0,0,0)
  
  
  SpotLeft = cstLibrary.getObjectByName("SpotLeft")! as Mesh
  SpotLeft.material = cstMaterials.SpotLeft
  SpotLeft.position.set(-3,0,-4)
  SpotLeft.material.uniforms.uColor1.value = hexToVec3Srgb(0xc3c8db) 
  scene.add(SpotLeft);
  
  SpotRight = cstLibrary.getObjectByName("SpotRight")! as Mesh
  SpotRight.material = cstMaterials.SpotRight
  SpotRight.material.uniforms.uOffsetUV.value = 0.5
  SpotRight.material.uniforms.uColor1.value = hexToVec3Srgb(0xDD6666) 
  SpotRight.position.set(5,0,-4)
  scene.add(SpotRight);
  
  SmokeFloor = cstLibrary.getObjectByName("SmokeFloor")! as Mesh
  SmokeFloor.material = cstMaterials.Floor
  // SmokeFloor.material = cstMaterials.SmogFloor
  SmokeFloor.position.set(0,0,6.2)
  scene.add(SmokeFloor);
  
  SmokeOver = cstLibrary.getObjectByName("SmokeOver")! as Mesh
  SmokeOver.material = cstMaterials.SmogFloor
  SmokeOver.position.set(0,0,0)
  scene.add(SmokeOver);
  
  
  Logo = cstLibrary.getObjectByName("Logo")! as Mesh
  Logo.material = cstMaterials.Logo
  Logo.position.set(0,0,6.2)
  scene.add(Logo);
  


  Scene1 = new Group()
  scene.add(Scene1);
  BgCurve = cstLibrary.getObjectByName("BgCurve")! as Mesh
  BgCurve.material = cstMaterials.BgCurve
  BgCurve.position.set(0,0,0)
  Scene1.add(BgCurve);

  iPad = cstLibrary.getObjectByName("iPad")! as Mesh
  iPad.material = cstMaterials.Screen
  iPad.position.set(0,0,0)
  iPad.scale.setScalar(1.4)
  Scene1.add(iPad);
  
  Projo1 = cstLibrary.getObjectByName("Projo1")! as Mesh
  Projo1.material = cstMaterials.Projo
  Projo1.scale.setScalar(2)
  Scene1.add(Projo1);
  
  Projo2 = cstLibrary.getObjectByName("Projo2")! as Mesh
  Projo2.material = cstMaterials.Projo
  Projo2.scale.setScalar(1.8)
  Scene1.add(Projo2);
  
  SpotRight.renderOrder = 20
  SpotLeft.renderOrder = 30
  SmokeFloor.renderOrder = 4
  SmokeOver.renderOrder = 5
  Logo.renderOrder = 1
  BgCurve.renderOrder = 0
  iPad.renderOrder = 10
  Projo2.renderOrder = 11
  Projo1.renderOrder = 12
  
  appState.colorCurrent.value = Math.round(Math.random() * (COLORS.length - 1));



  
  // ScrollTrigger.create({
  //   trigger: '#section1',
  //   start: 'top top',
  //   end: 'bottom top',
    
  //   onUpdate: (self) => {
  //     const progress = self.progress
  //     console.log(progress)
      
  //     // mesh.position.y = progress * 3
  //     // mesh.rotation.z = progress * Math.PI
  //     },
  //     })

};


const placeObject = (object: Object3D, ndc:Vector3 = new Vector3(1, 1, 0)) => {
  ndc.unproject(camera);
  const direction = ndc.sub(camera.position).normalize();
  const distance = (object.position.y - camera.position.y) / direction.y;
  object.position.copy(
    camera.position.clone().add(direction.multiplyScalar(distance))
  );
};
const scaleToViewportWidth = () => {
  const distance = camera.position.y;
  const vFov = MathUtils.degToRad(camera.fov);
  const visibleHeight =
    2 * Math.tan(vFov / 2) * distance;
  const visibleWidth =
    visibleHeight * camera.aspect;
  return visibleWidth;
};
const scaleToViewportHeight = () => {
  const distance = camera.position.y;
  const vFov = MathUtils.degToRad(camera.fov);
  const visibleHeight =
    2 * Math.tan(vFov / 2) * distance;
  return visibleHeight;
};
// let height = window.innerHeight
const resize = () => {
  // const height = window.visualViewport?.height ?? window.innerHeight;
  const height = document.documentElement.clientHeight;
  const width = window.visualViewport?.width ?? window.innerWidth;
  // const height = window.innerHeight;
  // const width = window.innerWidth;
  const aspect = width / height;
  const objWidth = 10.0;
  const cameraZ = 8;
  const hFov = 2 * Math.atan((objWidth / 2) / cameraZ);
  const vFov = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
  camera.fov = MathUtils.radToDeg(vFov);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
  placeObject(SpotRight, new Vector3(1, 1, 0));
  placeObject(SpotLeft, new Vector3(-1.0, 1.0, 0));
  placeObject(Projo1, new Vector3(-1.02, -0.2, 0));
  placeObject(Projo2, new Vector3(1.03, -0.2, 0));
  
  // placeObject(SmokeFloor, new Vector3(0.0001, -1.0, 0));
  // const scaleSpot = 1/aspect * 0.5
  // const scaleSpot = height/390*aspect
  const scaleSpot = width/230
  // SmokeFloor.scale.set(scaleSpot, scaleSpot, scaleSpot)
  const viewportW = scaleToViewportWidth()
  const viewportH = scaleToViewportHeight()
  const viewportM = Math.max(viewportW, viewportH);
  SmokeFloor.scale.setScalar(viewportW*0.28);
  SpotLeft.scale.setScalar(viewportH*0.28);
  SpotRight.scale.setScalar(viewportH*0.28);
  SmokeOver.scale.setScalar(viewportM*0.1);
  // alert("resize")
  // render(true);
  eventBus.emit("resize", { width, height });
};

function render(forceRender:boolean=false) {
  if (!forceRender) {
    if (!busy()) {
        // return;
    }
  }
  if (activePost) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}
const setupThree = () => {
  const canvasEl = canvas.value!;
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  const aspect = width / height;

  const viewSize = 2;

  camera = new PerspectiveCamera(75, aspect, 0.1, 1000)
  camera.position.z = 0
  camera.position.y = 5
  const target = new Vector3(0, 0, 0);
  camera.lookAt(target);

  
  renderer = new WebGLRenderer({
    canvas: canvasEl,
    alpha: false,
    antialias: false,
    depth: false,
  });

  renderer.setSize(width, height, false);
  composer = new EffectComposer(renderer);
  composer.setSize(width, height);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  composer.addPass(cstPost.cst_post);

  window.addEventListener("resize", resize);
  renderer.setPixelRatio(1.0);
  composer.setPixelRatio(1.5);
  // renderer.setClearColor(0xf9f9fc, 1);
  renderer.setClearColor(0x080808, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;

  scene.add(cstGroup);
  scene.add(cstContainer);

  initCst();
  const light1Direction = new Vector3();
  const light2Direction = new Vector3();
  function animate(time: number) {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    iPad.rotation.z = Math.cos(elapsedTime*0.5)*0.1
    iPad.rotation.x = Math.sin(elapsedTime*0.5)*0.1
    // console.log(SpotLeft.rotation.y)
    SpotLeft.rotation.y = Math.cos(elapsedTime*0.5)*0.3+Math.PI*0.25
    SpotRight.rotation.y = Math.sin(elapsedTime*0.5)*0.3-Math.PI*0.25
    SpotLeft.getWorldDirection(light1Direction);
    SpotRight.getWorldDirection(light2Direction);
    // light1Direction.x*=-1.0;
    light1Direction.z*=-1.0;
    light1Direction.y=-0.5;
    // light2Direction.x*=-1.0;
    light2Direction.z*=-1.0;
    light2Direction.y=-0.5;
    SpotLeft.rotation.y = Math.cos(elapsedTime*0.5)*0.1+Math.PI*0.25-Math.PI*0.07
    SpotRight.rotation.y = Math.sin(elapsedTime*0.5)*0.1-Math.PI*0.25+Math.PI*0.07
    // console.log(light1Direction)
    cstMaterials.Logo.uniforms.uLightDirection1.value.copy(light1Direction);
    cstMaterials.Logo.uniforms.uLightDirection2.value.copy(light2Direction);

    cstMaterials.update(elapsedTime);
    cstPost.update(elapsedTime);
    render();
  }
  requestAnimationFrame(animate);
  setTimeout(()=>{
    resize();

  }, 100)
  // resize();
};

const startIntro = () => {
};
const stopIntro = () => {
};


const initCst = () => {
  gsap.globalTimeline.timeScale(1.15);
};

const addListeners = () => {
  eventBus.on("sceneReady", setupThree);
  eventBus.on("route-will-change", onRouteChange);
  eventBus.on("route-has-changed", onRouteChanged);
};
const removeListeners = () => {
  eventBus.off("sceneReady", setupThree);
  eventBus.off("route-will-change", onRouteChange);
  eventBus.off("route-has-changed", onRouteChanged);
};
const onRouteChanged = ({ to, from }) => {};
const onRouteChange = ({ to, from }) => {
  mainClassName.value = (() => {
    switch (to) {
      case "/":
        return "home";
      case "/tuto":
        return "tuto";
      case "/draw":
        return "draw";
      case "/save":
        return "save";
    }
    return "home";
  })();
  ariaAltText.value = (() => {
    switch (to) {
      case "/":
        return t("homeAltText");
      case "/tuto":
        return t("tutoAltText");
      case "/draw":
        return t("drawAltText");
      case "/save":
        return t("saveAltText");
    }
    return t("homeAltText");
  })();
};
onMounted(() => {
  initScroll();
  initThree();
  addListeners();
});

onBeforeUnmount(() => {
  removeListeners();
});

const mainClassName = ref<string>("home");
const ariaAltText = ref<string>(t("homeAltText"));
</script>

<template>
  <main :class="mainClassName">
  <canvas ref="canvas" role="img" :aria-label="ariaAltText"></canvas>
  </main>
  <span class="footdark"></span>
</template>

<style scoped>
main {
  inset: 0;
  position: fixed;
  /* width: 100%; */
  /* height: 100%; */
}
.footdark{
  background: linear-gradient(to bottom, #08080800, #080808FF);
  width: 100%;
  height: 50px;
  position: fixed;
  bottom: 0;
}
canvas {
  width: 100%;
  position: absolute;
  height: 100lvh;
  /* bottom: 0; */
  inset: 0;

  /* pointer-events: none; */
  /* inset: 0; */
  /* width: 100%; */
  /* height: 100%; */
  /* height: calc(var(--vh) - 170px); */
}
</style>
