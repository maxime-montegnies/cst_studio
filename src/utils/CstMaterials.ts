import * as THREE from "three";
import cloud_texture_url from "@/assets/bitmap/texture/cloud.jpg?url";
import smog_texture_url from "@/assets/bitmap/texture/smog.png?url";
import swirl_texture_url from "@/assets/bitmap/texture/swirl.jpg?url";
import projo_texture_url from "@/assets/bitmap/texture/projo.jpg?url";
import screen_texture_url from "@/assets/bitmap/texture/movie.jpg?url";

import { hexToVec3Srgb } from "@/utils/utils";
import cstMaterialVertexShader from "../shader/CstMaterial.vert?raw";
import cstMaterialFragmentShader from "../shader/CstMaterial.frag?raw";
import { hexToVec3Linear } from "./utils";

export interface CstMaterialsOpts {
  initialProgress?: number; // 0..1
}

export class CstMaterials {
  public cst_BG_Mat: THREE.ShaderMaterial;
  public SpotLeft: THREE.ShaderMaterial;
  public SpotRight: THREE.ShaderMaterial;
  public SmogFloor: THREE.ShaderMaterial;
  public Logo: THREE.ShaderMaterial;
  public Floor: THREE.ShaderMaterial;
  public BgCurve: THREE.ShaderMaterial;
  public Projo: THREE.ShaderMaterial;
  public Screen: THREE.ShaderMaterial;
  
  private cloud_Texture?: THREE.Texture;
  private smog_Texture?: THREE.Texture;
  private swirl_Texture?: THREE.Texture;
  private projo_Texture?: THREE.Texture;
  private screen_Texture?: THREE.Texture;

  constructor(opts: CstMaterialsOpts = {}) {
    this.cst_BG_Mat = this.makeSpotMaterial();
    this.SpotLeft = this.makeSpotMaterial();
    this.SpotRight = this.makeSpotMaterial();    
    this.SmogFloor = this.makeSmogMaterial();    
    this.Logo = this.makeLogoMaterial();    
    this.Floor = this.makeFloorMaterial();    
    this.BgCurve = this.makeBgCurveMaterial();    
    this.Projo = this.makeProjoMaterial();    
    this.Screen = this.makeScreenMaterial();    
    const loader = new THREE.TextureLoader();
    Promise.all([
      loader.loadAsync(cloud_texture_url),
      loader.loadAsync(smog_texture_url),
      loader.loadAsync(swirl_texture_url),
      loader.loadAsync(projo_texture_url),
      loader.loadAsync(screen_texture_url),
    ]).then(([texture1, texture2, texture3, texture4, texture5]) => {
      for (const texture of [texture1, texture2, texture3, texture4, texture5]) {
        texture.colorSpace = THREE.NoColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      }
      texture2.wrapS = THREE.ClampToEdgeWrapping;
      texture2.wrapT = THREE.ClampToEdgeWrapping;
      this.cloud_Texture = texture1;
      this.smog_Texture = texture2;
      this.swirl_Texture = texture3;
      this.projo_Texture = texture4;
      this.screen_Texture = texture5;
      this.setTextures();
    });


    
  }

  dispose() {
    // TODO : Implement
    // this.cst_LT_Mat.dispose();
    // this.cst_LI_Mat.dispose();
    // this.cst_LM_Mat.dispose();
    // this.cst_LO_Mat.dispose();
    // this.cst_LT_Mat.dispose();
  }
  public update(
    time: number
  ) {
    this.cst_BG_Mat.uniforms.uTime.value = 
    this.Floor.uniforms.uTime.value = 
    this.Logo.uniforms.uTime.value = 
    this.SmogFloor.uniforms.uTime.value = 
    this.SpotLeft.uniforms.uTime.value = 
    this.SpotRight.uniforms.uTime.value = 
    time;
  }
  public setTextures() {
    this.SpotLeft.uniforms.uCloudTexture.value =
    this.SpotRight.uniforms.uCloudTexture.value =
    this.SmogFloor.uniforms.uCloudTexture.value =
    this.cst_BG_Mat.uniforms.uCloudTexture.value =
      this.cloud_Texture;
    this.SpotLeft.uniforms.uSmogTexture.value =
    this.SpotRight.uniforms.uSmogTexture.value =
    this.SmogFloor.uniforms.uSmogTexture.value =
    this.cst_BG_Mat.uniforms.uSmogTexture.value =
      this.smog_Texture;
    this.SpotLeft.uniforms.uSwirlTexture.value =
    this.SpotRight.uniforms.uSwirlTexture.value =
    this.SmogFloor.uniforms.uSwirlTexture.value =
    this.cst_BG_Mat.uniforms.uSwirlTexture.value =
      this.swirl_Texture;
    this.Projo.uniforms.uProjoTexture.value =
      this.projo_Texture;
    this.Screen.uniforms.uTexture.value =
      this.screen_Texture;
  }
  private makeSpotMaterial(): THREE.ShaderMaterial {
    const customMaterial = new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv = 1.0-uv;
          vec3 mPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(mPosition, 1.0);
      }
      `,
      fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor1;
      uniform sampler2D uCloudTexture;
      uniform float uTime;
      uniform float uOffsetUV;
      void main() {
          float noiseValue2;
          vec3 colorOut;
          float fade = 0.0;
          {
            float x = vUv.x;
            float y = mix(0.06, 1.0, vUv.y);
            x = x-0.5;
            x = x*0.5;
            x = x / y;
            x = x+0.5;
            float y2 = vUv.y*0.01;
            fade = x -0.5;
            fade = abs(fade);
            fade = 1.0-fade;
            fade = pow(fade, 5.0);
            noiseValue2 = texture2D(uCloudTexture, vec2(x, y2-uTime*0.020+uOffsetUV)).r;
          }
          {
            float x = vUv.x;
            x -= 0.5;
            x = abs(x);
            x *= 2.0;
            x = 1.0-x;
            fade*=x;
          }
          {
            float dist0 = distance(vec2(0.5,0.0), vUv);
            dist0 = 1.0 - dist0;
            dist0 = clamp(dist0, 0.0,1.0);
            dist0 = pow(dist0, 1.6);
            fade *= dist0;
          }  
          noiseValue2 = pow(noiseValue2, 1.5);
          colorOut.rgb = uColor1*noiseValue2;
          gl_FragColor = vec4(colorOut, fade*5.0);
          // gl_FragColor = vec4(vec3(fade), 1.0);
      }
      `,
      precision: 'lowp',
      uniforms: {
        uColor1: { value: hexToVec3Srgb(0xDDDCFF) },
        uCloudTexture: { value: null },
        uSmogTexture: { value: null },
        uSwirlTexture: { value: null },
        uOffsetUV: { value: 0.0 },
        uTime: { value: 0.0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    });
    return customMaterial;
  }
  private makeSmogMaterial(): THREE.ShaderMaterial {
    const customMaterial = new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv = 1.0-uv;
          vec3 mPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(mPosition, 1.0);
      }
      `,
      fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor1;
      uniform sampler2D uCloudTexture;
      uniform sampler2D uSmogTexture;
      uniform sampler2D uSwirlTexture;
      uniform float uTime;
      uniform float uOffsetUV;
      void main() {
          float noiseValue2;
          vec3 colorOut;
          float fade = 0.0;
          {
            float x = vUv.x;
            float y = mix(0.06, 1.0, vUv.y);
            x = x-0.5;
            x = x*0.5;
            x = x / y;
            x = x+0.5;
            float y2 = vUv.y*0.01;
            fade = x -0.5;
            fade = abs(fade);
            fade = 1.0-fade;
            fade = pow(fade, 5.0);
            noiseValue2 = texture2D(uCloudTexture, vec2(x, y2-uTime*0.020+uOffsetUV)).r;
          }
          {
            float x = vUv.x;
            x -= 0.5;
            x = abs(x);
            x *= 2.0;
            x = 1.0-x;
            fade*=x;
          }
          {
            float dist0 = distance(vec2(0.5,0.0), vUv);
            dist0 = 1.0 - dist0;
            dist0 = pow(dist0, 1.6);
            fade *= dist0;
          }  
          noiseValue2 = pow(noiseValue2, 1.5);
          colorOut.rgb = uColor1*noiseValue2;
          // float noise = dither0(gl_FragCoord.xy);
          // colorOut.rgb += noise / 32.0;
          gl_FragColor = vec4(colorOut, fade);
          // gl_FragColor = texture2D(uSwirlTexture, vUv);
          vec2 flow = texture2D(uSwirlTexture, vUv+vec2(uTime*0.03, 0.0)).rg;
          vec3 smogs = texture2D(uCloudTexture, vUv+flow*0.1).rgb;
          // float smog = mix(smogs.r, smogs.b, abs(cos(uTime*0.1)));
          float smog = smogs.r*0.33+smogs.g*0.33+smogs.b*0.33;
          // gl_FragColor = vec4(vec3(smog)*0.02, 1.0);
          colorOut.rgb = uColor1*smog*0.1;
          // gl_FragColor = vec4(vec3(smog)*0.05, 1.0);
          gl_FragColor = vec4(colorOut.rgb, 1.0);
          // float noise = dither0(gl_FragCoord.xy);
          // gl_FragColor.rgb += noise / 32.0;
      }
      `,
      precision: 'lowp',
      uniforms: {
        uColor1: { value: hexToVec3Srgb(0xDDDCFF) },
        uCloudTexture: { value: null },
        uSmogTexture: { value: null },
        uSwirlTexture: { value: null },
        uOffsetUV: { value: 0.0 },
        uTime: { value: 0.0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      // premultipliedAlpha: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
      // blending: THREE.MultiplyBlending
    });
    return customMaterial;
  }
  private makeLogoMaterial(): THREE.ShaderMaterial {
    const customMaterial = new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
          vUv = 1.0-uv;
          vec3 mPosition = position;
          // vNormal = normalize(mat3(modelMatrix) * normal);
          vWorldNormal = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(mPosition, 1.0);
      }
      `,
      fragmentShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uTime;
      uniform vec3 uLightDirection1;
      uniform vec3 uLightDirection2;
      void main() {
          vec3 colorOut;
        // vec3 uLightDirection1 = (vec3(cos(uTime),-0.5,sin(uTime)));
        float light1 = max(dot(normalize(vWorldNormal), normalize(uLightDirection1)), 0.0 );
        // vec3 uLightDirection2 = (vec3(sin(uTime),-0.5,cos(uTime)));
        float light2 = max(dot(normalize(vWorldNormal), normalize(uLightDirection2)), 0.0 );
        colorOut.rgb = uColor3*0.05;
        colorOut.rgb += uColor1*light2+uColor2*light1;
        // colorOut.rgb = vec3(light1);
          gl_FragColor = vec4(colorOut.rgb, 1.0);
      }
      `,
      precision: 'lowp',
      uniforms: {
        uLightDirection1: { value: new THREE.Vector3(0,0,0) },
        uLightDirection2: { value: new THREE.Vector3(0,0,0) },
        uColor1: { value: hexToVec3Srgb(0xDDDCFF) },
        uColor2: { value: hexToVec3Srgb(0xff3b30) },
        uColor3: { value: hexToVec3Srgb(0xDDDCFF) },
        uTime: { value: 0.0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      // premultipliedAlpha: true,
      depthWrite: false,
      depthTest: false,
      // blending: THREE.AdditiveBlending
      // blending: THREE.MultiplyBlending
    });
    return customMaterial;
  }
  private makeFloorMaterial(): THREE.ShaderMaterial {
    const customMaterial = new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
          vUv = 1.0-uv;
          vec3 mPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(mPosition, 1.0);
      }
      `,
      fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uTime;
      void main() {
          vec2 grid = floor(vUv * 40.0);
        float checker = mod(grid.x + grid.y, 2.0);
        vec3 color = mix(
            vec3(0.0),
            vec3(1.0),
            checker
        );
        
        gl_FragColor = vec4(color, distance(vec2(0.5,0.0), vUv));
      }
      `,
      precision: 'lowp',
      uniforms: {
        uColor1: { value: hexToVec3Srgb(0xDDDCFF) },
        uColor2: { value: hexToVec3Srgb(0xff3b30) },
        uColor3: { value: hexToVec3Srgb(0xDDDCFF) },
        uTime: { value: 0.0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      // premultipliedAlpha: true,
      depthWrite: false,
      depthTest: false,
      // blending: THREE.AdditiveBlending
      // blending: THREE.MultiplyBlending
    });
    return customMaterial;
  }
  private makeBgCurveMaterial(): THREE.ShaderMaterial {
    const customMaterial = new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
          vUv = 1.0-uv;
          vec3 mPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(mPosition, 1.0);
      }
      `,
      fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uTime;
      uniform float uScroll;
      void main() {
          vec2 grid = floor(vUv * 40.0);
        float checker = mod(grid.x + grid.y, 2.0);
        vec3 color = mix(
            vec3(0.0),
            vec3(0.01),
            checker
        );
        
        gl_FragColor = vec4(color, distance(vec2(0.5,0.0), vUv));
        // color = mix(vec3(0.95,0.95,0.95), vec3(0.2,0.2,0.3), clamp(vUv.y*2.0-0.5, 0.0,1.0));
        // color = mix(vec3(0.1,0.1,0.1), color, clamp(vUv.y*2.0, 0.0,1.0));
        color = mix(vec3(0.0,0.95,0.95), vec3(1.0,0.2,0.3), clamp(vUv.y*2.0-0.5, 0.0,1.0));
        color = mix(vec3(0.1,0.1,1.0), color, clamp(vUv.y*2.0, 0.0,1.0));
        color *= 0.2;
        gl_FragColor = vec4(color, clamp(vUv.y-0.0, 0.0, 1.0));
        gl_FragColor = vec4(color*(0.9+0.1*checker), uScroll);
      }
      `,
      precision: 'lowp',
      uniforms: {
        uColor1: { value: hexToVec3Srgb(0xDDDCFF) },
        uColor2: { value: hexToVec3Srgb(0xff3b30) },
        uColor3: { value: hexToVec3Srgb(0xDDDCFF) },
        uTime: { value: 0.0 },
        uScroll: { value: 1.0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      // premultipliedAlpha: true,
      depthWrite: false,
      depthTest: false,
      // blending: THREE.AdditiveBlending
      // blending: THREE.MultiplyBlending
    });
    return customMaterial;
  }
  private makeScreenMaterial(): THREE.ShaderMaterial {
    const customMaterial = new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
          vUv = 1.0-uv;
          vec3 mPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(mPosition, 1.0);
      }
      `,
      fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uTime;
      uniform float uScroll;
      uniform sampler2D uTexture;
      void main() {
          vec2 grid = floor(vUv * 40.0);
        float checker = mod(grid.x + grid.y, 2.0);
        vec3 color = mix(
            vec3(0.0),
            vec3(0.01),
            checker
        );
        
        gl_FragColor = vec4(color, distance(vec2(0.5,0.0), vUv));
        // color = mix(vec3(0.95,0.95,0.95), vec3(0.2,0.2,0.3), clamp(vUv.y*2.0-0.5, 0.0,1.0));
        // color = mix(vec3(0.1,0.1,0.1), color, clamp(vUv.y*2.0, 0.0,1.0));
        // color *= 0.2;
        gl_FragColor = vec4(color, clamp(vUv.y-0.0, 0.0, 1.0));
        gl_FragColor = vec4(color, uScroll);
        gl_FragColor.rgba = texture2D(uTexture, vUv).rgba;
      }
      `,
      precision: 'lowp',
      uniforms: {
        uColor1: { value: hexToVec3Srgb(0xDDDCFF) },
        uColor2: { value: hexToVec3Srgb(0xff3b30) },
        uColor3: { value: hexToVec3Srgb(0xDDDCFF) },
        uTexture: { value: null },
        uTime: { value: 0.0 },
        uScroll: { value: 1.0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      // premultipliedAlpha: true,
      depthWrite: false,
      depthTest: false,
      // blending: THREE.AdditiveBlending
      // blending: THREE.MultiplyBlending
    });
    return customMaterial;
  }
  private makeProjoMaterial(): THREE.ShaderMaterial {
    const customMaterial = new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
          vUv = 1.0-uv;
          vec3 mPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(mPosition, 1.0);
      }
      `,
      fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uTime;
      uniform float uScroll;
      uniform sampler2D uProjoTexture;
      void main() {
          vec2 grid = floor(vUv * 40.0);
        float checker = mod(grid.x + grid.y, 2.0);
        vec3 color = mix(
            vec3(0.0),
            vec3(0.01),
            checker
        );
        
        gl_FragColor = vec4(color, distance(vec2(0.5,0.0), vUv));
        // color = mix(vec3(0.95,0.95,0.95), vec3(0.2,0.2,0.3), clamp(vUv.y*2.0-0.5, 0.0,1.0));
        // color = mix(vec3(0.1,0.1,0.1), color, clamp(vUv.y*2.0, 0.0,1.0));
        // color *= 0.2;
        gl_FragColor = vec4(color, clamp(vUv.y-0.0, 0.0, 1.0));
        gl_FragColor = vec4(color, uScroll);
        gl_FragColor = vec4(vec3(1.0), uScroll);
        gl_FragColor.rgba = texture2D(uProjoTexture, vUv).rgba;
        // gl_FragColor.rgb*=0.2;
        gl_FragColor.rgb= mix(vec3(1.0), gl_FragColor.rgb, uScroll);
        // gl_FragColor.a *= uScroll;
      }
      `,
      precision: 'lowp',
      uniforms: {
        uProjoTexture: { value: null },
        uColor1: { value: hexToVec3Srgb(0xDDDCFF) },
        uColor2: { value: hexToVec3Srgb(0xff3b30) },
        uColor3: { value: hexToVec3Srgb(0xDDDCFF) },
        uTime: { value: 0.0 },
        uScroll: { value: 1.0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      depthTest: false,
      // blending: THREE.AdditiveBlending
      blending: THREE.MultiplyBlending
    });
    return customMaterial;
  }
  private makeCstMaterial(): THREE.ShaderMaterial {
    const customMaterial = new THREE.ShaderMaterial({
      vertexShader: cstMaterialVertexShader,
      fragmentShader: cstMaterialFragmentShader,
      uniforms: {
        uTexture: { value: null },
        uTime: { value: 0.0 },
        uProgress: { value: 0.0 },
        uColorChanging: { value: false },
        uIsOutro: { value: false },
        uTotalPetals: { value: 1.0 },
        uIsCircle: { value: 0.0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    return customMaterial;
  }
}
