import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { Vector2 } from "three";
import dust_texture_url from "@/assets/bitmap/texture/random.png?url";
// import dust_texture_url from "@/assets/bitmap/texture/dust.jpg?url";
import swirl_texture_url from "@/assets/bitmap/texture/swirl.jpg?url";

interface Ripple {
  center: Vector2;
  startTime: number;
}
export class CstPost {
  private dust_Texture?: THREE.Texture;
  public cst_post: ShaderPass;
  constructor() {
  const loader = new THREE.TextureLoader();
    Promise.all([
      loader.loadAsync(dust_texture_url),
      loader.loadAsync(swirl_texture_url),
    ]).then(([texture1, texture2]) => {
      for (const texture of [texture1, texture2]) {
        texture.colorSpace = THREE.NoColorSpace;
        texture.wrapS = THREE.MirroredRepeatWrapping;
        texture.wrapT = THREE.MirroredRepeatWrapping;
      }
      this.dust_Texture = texture1;
      this.cst_post.uniforms.tDust.value = texture1
      this.cst_post.uniforms.tSwirl.value = texture2
      console.log(this.dust_Texture)
      console.log(this.cst_post)
    });


    const MyPass = {
      uniforms: {
        tDiffuse: { value: null },
        tDust: { value: null },
        tSwirl: { value: null },
        uScroll: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDust;
        uniform sampler2D tSwirl;
        uniform float uTime;
        uniform float uScroll;
        varying vec2 vUv;

        float dither0(vec2 position) {
            return fract(
                sin(dot(position, vec2(12.9898, 78.233))) * 43758.5453
            ) - 0.5;
        }
        float dither(vec2 p) {
            return fract(
                52.9829189 *
                fract(dot(p, vec2(0.06711056, 0.00583715)))
            ) - 0.5;
        }
        vec2 rotate45(vec2 uv) {
            const float s = 0.70710678;
            return vec2(
                (uv.x - uv.y) * s,
                (uv.x + uv.y) * s
            );
        }
        void main() {
            vec2 uv = vUv;
            vec2 uv45 = rotate45(vUv);
            gl_FragColor = texture2D(tDiffuse, uv);
            vec2 flow = texture2D(tSwirl, vUv*1.0+vec2(uTime*0.005, 0.0)+vec2(0.0, -uScroll*0.0)).rg;
            vec2 uvDust = uv*1.0+flow*0.025+vec2(0.0, -uScroll);
            uvDust = rotate45(uvDust);
            vec3 dust = texture2D(tDust, uvDust).rgb;

            // gl_FragColor.rgb += step(0.98, dust)*0.25;

            float noise = dither(gl_FragCoord.xy);
            gl_FragColor.rgb += noise / 255.0;

        }
    `,
    precision: 'lowp',
    };
    this.cst_post = new ShaderPass(MyPass);
  }

  public busy: boolean = false;
  public updateScroll(scroll: number) {
    this.cst_post.uniforms.uScroll.value = scroll/500;
  }
  public update(time: number) {
    this.cst_post.uniforms.uTime.value = time;
  }
}
