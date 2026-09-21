import {
  NoColorSpace,
  DoubleSide,
  Color,
  Matrix4,
  Object3D,
  Camera,
  PerspectiveCamera,
  Box3,
  Vector3,
  OrthographicCamera,
  Mesh,
  BufferGeometry,
  Material,
  MeshStandardMaterial,
  Texture,
  CompressedTexture,
  BufferAttribute,
} from "three";

// NOTE: fflate utils are re-exported from three/addons/libs/fflate.module.js
// Types aren't bundled there, so we declare minimal signatures.
// If you have proper types, replace these with the real ones.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ZipFiles = Record<
  string,
  Uint8Array | [Uint8Array, { extra: Record<number, Uint8Array> }]
>;
import { strToU8, zipSync } from "three/addons/libs/fflate.module.js";
import { COLORS } from "../datas.ts";
import { hexToStringLinear } from "@/utils/utils.ts";
// import exrUrl from '@/assets/bitmap/texture/env/studio_1k.exr?url';
// -----------------------------
// USD Node
// -----------------------------

type USDMetadata = { key: string; value: string | string[] };
type USDProperty = { property: string; metadata: string[] };

class USDNode {
  name: string;
  type: string;
  metadata: USDMetadata[];
  properties: USDProperty[];
  children: USDNode[];

  constructor(
    name: string,
    type = "",
    metadata: USDMetadata[] = [],
    properties: USDProperty[] = [],
  ) {
    this.name = name;
    this.type = type;
    this.metadata = metadata;
    this.properties = properties;
    this.children = [];
  }

  addMetadata(key: string, value: USDMetadata["value"]): void {
    this.metadata.push({ key, value });
  }

  addProperty(property: string, metadata: string[] = []): void {
    this.properties.push({ property, metadata });
  }

  addChild(child: USDNode): void {
    this.children.push(child);
  }

  toString(indent = 0): string {
    const pad = "\t".repeat(indent);

    const formattedMetadata = this.metadata.map((item) => {
      const key = item.key;
      const value = item.value;

      if (Array.isArray(value)) {
        const lines: string[] = [];
        lines.push(`${key} = {`);
        value.forEach((line) => {
          lines.push(`${pad}\t\t${line}`);
        });
        lines.push(`${pad}\t}`);
        return lines.join("\n");
      } else {
        return `${key} = ${value}`;
      }
    });

    const meta = formattedMetadata.length
      ? ` (\n${formattedMetadata.map((l) => `${pad}\t${l}`).join("\n")}\n${pad})`
      : "";

    const properties = this.properties.map((l) => {
      const property = l.property;
      const metadata = l.metadata.length
        ? ` (\n${l.metadata.map((m) => `${pad}\t\t${m}`).join("\n")}\n${pad}\t)`
        : "";
      return `${pad}\t${property}${metadata}`;
    });

    const children = this.children.map((c) => c.toString(indent + 1));

    const bodyLines: string[] = [];

    if (properties.length > 0) bodyLines.push(...properties);

    if (children.length > 0) {
      if (properties.length > 0) bodyLines.push("");
      for (let i = 0; i < children.length; i++) {
        bodyLines.push(children[i]);
        if (i < children.length - 1) bodyLines.push("");
      }
    }

    const bodyContent = bodyLines.join("\n");
    const type = this.type ? this.type + " " : "";
    return `${pad}def ${type}"${this.name}"${meta}\n${pad}{\n${bodyContent}\n${pad}}`;
  }
}

// -----------------------------
// Exporter
// -----------------------------

type ARAnchoringOptions = {
  anchoring: { type: "plane" | "image" | string };
  planeAnchoring: { alignment: "horizontal" | "vertical" | string };
};

export type USDZExporterOptions = {
  ar?: ARAnchoringOptions;
  includeAnchoringProperties?: boolean;
  onlyVisible?: boolean;
  quickLookCompatible?: boolean;
  maxTextureSize?: number;
  colorsIdx?: number;
  texture?: Texture;
};

export type TextureUtils = {
  decompress: (texture: CompressedTexture) => Promise<Texture>;
} | null;

/**
 * An exporter for USDZ.
 *
 * ```ts
 * const exporter = new USDZExporter();
 * const arraybuffer = await exporter.parseAsync(scene);
 * ```
 */
export class USDZExporter {
  custom_mtlx: boolean;
  textureUtils: TextureUtils;

  constructor(custom_mtlx = false) {
    this.custom_mtlx = custom_mtlx;
    this.textureUtils = null;
  }

  setTextureUtils(utils: NonNullable<TextureUtils>): void {
    this.textureUtils = utils;
  }

  parse(
    scene: Object3D,
    onDone: (ab: ArrayBuffer) => void,
    onError: (err: unknown) => void,
    options?: USDZExporterOptions,
  ): void {
    this.parseAsync(scene, options).then(onDone).catch(onError);
  }

  async parseAsync(
    scene: Object3D,
    options: USDZExporterOptions = {},
  ): Promise<ArrayBuffer> {
    options = Object.assign(
      {
        ar: {
          anchoring: { type: "plane" },
          planeAnchoring: { alignment: "horizontal" },
        },
        includeAnchoringProperties: true,
        onlyVisible: true,
        quickLookCompatible: false,
        maxTextureSize: 1024,
      },
      options,
    );

    const usedNames = new Set<string>();
    const files: Record<string, any> = {};
    const modelFileName = "assets/model.usda";
    const sceneFileName = "cst.usda";

    files[sceneFileName] = null;

    const colorSpace = "lin_srgb";
    // const colorSpace ="lin_rec709_scene"
    // const colorSpace = "raw"

    const sceneStr = `#usda 1.0
(
    defaultPrim = "Root"
    doc = """Generated from Composed Stage of root layer 
"""
    endTimeCode = 717
    framesPerSecond = 60
    metersPerUnit = 1
    startTimeCode = 717
    timeCodesPerSecond = 60
    upAxis = "Y"
)
def Xform "Root"
{
    def Xform "Transform" (
        active = true
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        rel material:binding = </Root/Material_0> (
            bindMaterialAs = "weakerThanDescendants"
        )
        quatf xformOp:orient = (0.70710677, 0, 0.7071067, 0)
        float3 xformOp:scale = (4, 4, 4)
        uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:orient", "xformOp:scale"]

        def "Cst" (
            prepend apiSchemas = ["MaterialBindingAPI"]
            references = @assets/model.usda@
        )
        {
            quatf xformOp:orient = (1, 0, 0, 0)
            float3 xformOp:scale = (1, 1, 1)
            float3 xformOp:translate = (0, 0, 0)
            uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:orient", "xformOp:scale"]
        }
    }










def Material "Material_0"
    {
        reorder nameChildren = ["PreviewSurface", "CstGraph"]
        color3f inputs:ColorDark = ${hexToStringLinear(COLORS[options.colorsIdx][0].dark, 1.9)} (
            colorSpace = "${colorSpace}"
            customData = {
                dictionary realitykit = {
                    float2 positionInSubgraph = (-361.4082, -30.808594)
                    int stackingOrderInSubgraph = 15
                }
            }
        )
        color3f inputs:ColorPale = ${hexToStringLinear(COLORS[options.colorsIdx][0].pale, 1.9)} (
            colorSpace = "${colorSpace}"
            customData = {
                dictionary realitykit = {
                    float2 positionInSubgraph = (-352.7832, 38.585938)
                    int stackingOrderInSubgraph = 17
                }
            }
        )
        token outputs:mtlx:surface.connect = </Root/Material_0/PreviewSurface.outputs:out>
        token outputs:realitykit:vertex
        float2 ui:nodegraph:realitykit:subgraphOutputs:pos = (365.5, 130.5)

        def NodeGraph "CstGraph" (
            active = true
        )
        {
            color3f inputs:ColorDark = (0, 0, 1) (
                colorSpace = "lin_srgb"
                customData = {
                    dictionary realitykit = {
                        float2 positionInSubgraph = (220.80078, -74.04321)
                        int stackingOrderInSubgraph = 4462
                    }
                }
            )
            color3f inputs:ColorDark.connect = </Root/Material_0.inputs:ColorDark>
            color3f inputs:ColorPale = (1, 0, 0) (
                colorSpace = "lin_srgb"
                customData = {
                    dictionary realitykit = {
                        float2 positionInSubgraph = (234.1875, 4.488037)
                        int stackingOrderInSubgraph = 4462
                    }
                }
            )
            color3f inputs:ColorPale.connect = </Root/Material_0.inputs:ColorPale>
            color3f outputs:Color (
                customData = {
                    dictionary realitykit = {
                        float2 positionInSubgraph = (3453, -947.5)
                        int stackingOrderInSubgraph = 4463
                    }
                }
            )
            color3f outputs:Color.connect = </Root/Material_0/CstGraph/Add_6.outputs:out>
            float outputs:Noise.connect = </Root/Material_0/CstGraph/Mix_Noise.outputs:out>
            float outputs:OpacityThreshold (
                customData = {
                    dictionary realitykit = {
                        float2 positionInSubgraph = (3453, -947.5)
                        int stackingOrderInSubgraph = 4464
                    }
                }
            )
            float outputs:OpacityThreshold.connect = </Root/Material_0/CstGraph/Dot_6.outputs:out>
            float2 ui:nodegraph:node:pos = (-118.48828, 10.613281)
            int ui:nodegraph:node:stackingOrder = 13
            float2 ui:nodegraph:realitykit:subgraphOutputs:pos = (3679.0469, -1017.1328)
            int ui:nodegraph:realitykit:subgraphOutputs:stackingOrder = 4471

            def Shader "Add_10"
            {
                uniform token info:id = "ND_add_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Add_7.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/marginGrainIn.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (713.5947, -903.2538)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Mix_2"
            {
                uniform token info:id = "ND_mix_color3"
                color3f inputs:bg.connect = </Root/Material_0/CstGraph.inputs:ColorPale>
                color3f inputs:fg.connect = </Root/Material_0/CstGraph.inputs:ColorDark>
                float inputs:mix.connect = </Root/Material_0/CstGraph/Multiply_IsCircle_03.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (739.1255, 34.85388)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Mix"
            {
                uniform token info:id = "ND_mix_vector3"
                float3 inputs:bg = (1, 0, 0)
                float3 inputs:bg.connect = </Root/Material_0/CstGraph/Bitangent.outputs:out>
                float3 inputs:fg = (1, 0, 0)
                float3 inputs:fg.connect = None
                float inputs:mix.connect = </Root/Material_0/CstGraph/Step_3.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1544.9817, 2341.1077)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Subtract_6"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1 = 1
                float inputs:in1.connect = None
                float inputs:in2.connect = </Root/Material_0/CstGraph/Separate2_1.outputs:outy>
                float outputs:out
                float2 ui:nodegraph:node:pos = (20.19629, -1281.0116)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_2"
            {
                uniform token info:id = "ND_multiply_vector3"
                float3 inputs:in1.connect = </Root/Material_0/CstGraph/Combine3.outputs:out>
                float3 inputs:in2 = (2, 2, 2)
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-2764.7625, 2221.833)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Mix_6"
            {
                uniform token info:id = "ND_mix_color3"
                color3f inputs:bg = (0.75, 0.75, 0.75) (
                    colorSpace = "lin_srgb"
                )
                color3f inputs:bg.connect = </Root/Material_0/CstGraph/Dot_14.outputs:out>
                color3f inputs:fg.connect = </Root/Material_0/CstGraph/innerColor.outputs:out>
                float inputs:mix.connect = </Root/Material_0/CstGraph/Dot_10.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (2259.3184, -848.4779)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_12"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Subtract.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/Range_1.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-3202.3506, 1873.8126)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Convert_4"
            {
                uniform token info:id = "ND_convert_float_color3"
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot_10.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (2524.1943, -1175.1311)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_1"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/Divide.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2401.0867, 1601.7994)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Power_1"
            {
                uniform token info:id = "ND_power_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Subtract_1.outputs:out>
                float inputs:in2 = 0.5
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2719.463, 1687.262)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Max"
            {
                uniform token info:id = "ND_max_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Add_8.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1365.8901, -1477.142)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Subtract_7"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1 = 1
                float inputs:in1.connect = None
                float inputs:in2.connect = </Root/Material_0/CstGraph/Range_1.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-3096.1045, 1385.7892)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Convert_2"
            {
                uniform token info:id = "ND_convert_float_color3"
                float inputs:in.connect = </Root/Material_0/CstGraph/innershadow.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (2159.1099, -1376.0697)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_13"
            {
                uniform token info:id = "ND_dot_vector3"
                float3 inputs:in.connect = </Root/Material_0/CstGraph/Combine3.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-2074.0725, 2046.4585)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Combine3_3"
            {
                uniform token info:id = "ND_combine3_vector3"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Separate3_1.outputs:outz>
                float inputs:in2
                float inputs:in3.connect = </Root/Material_0/CstGraph/Multiply_15.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1915.0542, 2181.1055)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_5"
            {
                uniform token info:id = "ND_dot_color3"
                color3f inputs:in.connect = </Root/Material_0/CstGraph/Mix_7.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (3303.2744, -781.844)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Separate2_1"
            {
                uniform token info:id = "ND_separate2_vector2"
                float2 inputs:in.connect = </Root/Material_0/CstGraph/TextureCoordinates_3.outputs:out>
                float outputs:outx
                float outputs:outy
                float2 ui:nodegraph:node:pos = (-234.30762, -1236.7108)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Divide"
            {
                uniform token info:id = "ND_divide_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Subtract_7.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/Dot.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2495.5068, 1601.368)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Separate3_1"
            {
                uniform token info:id = "ND_separate3_vector3"
                float3 inputs:in.connect = </Root/Material_0/CstGraph/Tangent.outputs:out>
                float outputs:outx
                float outputs:outy
                float outputs:outz
                float2 ui:nodegraph:node:pos = (-2248.5544, 2152.67)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Convert_1"
            {
                uniform token info:id = "ND_convert_float_color3"
                float inputs:in.connect = </Root/Material_0/CstGraph/Multiply_11.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (162.78516, -701.64905)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Grad"
            {
                uniform token info:id = "ND_subtract_vector2"
                float2 inputs:in1.connect = </Root/Material_0/CstGraph/TextureCoordinates_1.outputs:out>
                float2 inputs:in2 = (0.5, 0)
                float2 inputs:in2.connect = </Root/Material_0/CstGraph/Combine2.outputs:out>
                float2 outputs:out
                float2 ui:nodegraph:node:pos = (-631.083, 69.93268)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Combine3"
            {
                uniform token info:id = "ND_combine3_vector3"
                float inputs:in2 = 1
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-3013.0747, 2174.7842)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_7"
            {
                uniform token info:id = "ND_multiply_color3"
                color3f inputs:in1.connect = </Root/Material_0/CstGraph.inputs:ColorDark>
                color3f inputs:in2.connect = </Root/Material_0/CstGraph/Convert_3.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (621.5703, -348.1277)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_12"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot_9.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-4074.8901, 1235.2118)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Height_V3"
            {
                uniform token info:id = "ND_convert_float_vector3"
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1668.2031, 2001.0774)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "D2"
            {
                uniform token info:id = "ND_constant_float"
                float inputs:value = 0.15
                float outputs:out
                float2 ui:nodegraph:node:pos = (-1335.4773, -1088.5992)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Subtract_3"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Magnitude.outputs:out>
                float inputs:in2 = 0.35
                float inputs:in2.connect = None
                float outputs:out
                float2 ui:nodegraph:node:pos = (-261.792, 134.57043)
                int ui:nodegraph:node:stackingOrder = 4762
            }

            def Shader "DotProduct"
            {
                uniform token info:id = "ND_dotproduct_vector3"
                float3 inputs:in1.connect = </Root/Material_0/CstGraph/Dot_2.outputs:out>
                float3 inputs:in2.connect = </Root/Material_0/CstGraph/Combine3_1.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-699.1177, 1981.3602)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_9"
            {
                uniform token info:id = "ND_multiply_vector2"
                float2 inputs:in1.connect = </Root/Material_0/CstGraph/Combine2_5.outputs:out>
                float2 inputs:in2.connect = </Root/Material_0/CstGraph/Combine2_1.outputs:out>
                float2 outputs:out
                float2 ui:nodegraph:node:pos = (-868.52563, -627.2396)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Subtract_4"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1 = 1
                float inputs:in1.connect = None
                float inputs:in2.connect = </Root/Material_0/CstGraph/Multiply_13.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (2594.8213, -2370)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "ConstantFloat"
            {
                uniform token info:id = "ND_constant_float"
                float inputs:value = 0.8
                float outputs:out
                float2 ui:nodegraph:node:pos = (157.83008, -376.06873)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_15"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/D2.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-4360.7183, 1234.1533)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Add_7"
            {
                uniform token info:id = "ND_add_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/D1.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/D2.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-287.57812, -1080.4706)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_14"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/CellNoise2D.outputs:out>
                float inputs:in2 = 1
                float outputs:out
                float2 ui:nodegraph:node:pos = (988.72363, -751.3905)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Combine2"
            {
                uniform token info:id = "ND_combine2_vector2"
                float inputs:in1 = 0.5
                float inputs:in2.connect = None
                float2 outputs:out
                float2 ui:nodegraph:node:pos = (-783.29785, 108.15521)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "shadowsStep"
            {
                uniform token info:id = "ND_realitykit_step_float"
                float inputs:edge.connect = </Root/Material_0/CstGraph/Dot_9.outputs:out>
                float inputs:in.connect = </Root/Material_0/CstGraph/D1.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1939.2964, -2351.83)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Convert_6"
            {
                uniform token info:id = "ND_convert_float_color3"
                float inputs:in.connect = </Root/Material_0/CstGraph/Range.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (-111.75, 1977.9634)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "marginGrainOut"
            {
                uniform token info:id = "ND_constant_float"
                float inputs:value = 0.15
                float outputs:out
                float2 ui:nodegraph:node:pos = (-348.36768, -2381.4688)
                int ui:nodegraph:node:stackingOrder = 4462
            }
            def Shader "marginGrainIn"
            {
                uniform token info:id = "ND_constant_float"
                float inputs:value = 0.07
                float outputs:out
                float2 ui:nodegraph:node:pos = (-348.36768, -2381.4688)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Add_6"
            {
                uniform token info:id = "ND_add_color3"
                color3f inputs:in1.connect = </Root/Material_0/CstGraph/Dot_5.outputs:out>
                color3f inputs:in2.connect = </Root/Material_0/CstGraph/Convert_1.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (3404.1572, -707.23364)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_Noise"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/WorleyNoise2D_Noise.outputs:out>
                float inputs:in2 = 2
                float outputs:out
                float2 ui:nodegraph:node:pos = (-425.08743, -69.86575)
                int ui:nodegraph:node:stackingOrder = 4753
            }

            def Shader "Mix_Noise"
            {
                uniform token info:id = "ND_mix_float"
                float inputs:bg = 0.5
                float inputs:fg.connect = </Root/Material_0/CstGraph/Noise2D_Noise.outputs:out>
                float inputs:mix.connect = </Root/Material_0/CstGraph/Clamp_Noise.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-47.884594, -165.62248)
                int ui:nodegraph:node:stackingOrder = 4713
            }

            def Shader "Clamp_Noise"
            {
                uniform token info:id = "ND_clamp_float"
                float inputs:high
                float inputs:in.connect = </Root/Material_0/CstGraph/Multiply_Noise.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-239.86888, -57.356842)
                int ui:nodegraph:node:stackingOrder = 4747
            }

            def Shader "Noise2D_Noise"
            {
                uniform token info:id = "ND_noise2d_float"
                float inputs:amplitude = 0.5
                float inputs:pivot = 0
                float2 inputs:texcoord.connect = </Root/Material_0/CstGraph/Multiply_9.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-708.8152, -303.745)
                int ui:nodegraph:node:stackingOrder = 4759
                string[] ui:nodegraph:realitykit:node:attributesShowingChildren = ["outputs:out", "outputs:out"]
            }

            def Shader "WorleyNoise2D_Noise"
            {
                uniform token info:id = "ND_worleynoise2d_float"
                float inputs:jitter = 1
                float inputs:jitter.connect = None
                float2 inputs:texcoord.connect = </Root/Material_0/CstGraph/Multiply_9.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-696.8103, -139.88809)
                int ui:nodegraph:node:stackingOrder = 4757
                string[] ui:nodegraph:realitykit:node:attributesShowingChildren = ["outputs:out"]
            }

            

            def Shader "CellNoise2D"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Mix_Noise.outputs:out>
                float inputs:in2 = 0.0
                float inputs:in2.connect = None
                float outputs:out
                float2 ui:nodegraph:node:pos = (99.90234, -124.875)
                int ui:nodegraph:node:stackingOrder = 4714
            }

            def Shader "innerColor_1"
            {
                uniform token info:id = "ND_dot_color3"
                color3f inputs:in.connect = </Root/Material_0/CstGraph/Mix_2.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (858.2666, -481.87695)
                int ui:nodegraph:node:stackingOrder = 4462
                string[] ui:nodegraph:realitykit:node:attributesShowingChildren = ["outputs:out"]
            }

            def Shader "Mix_5"
            {
                uniform token info:id = "ND_mix_color3"
                color3f inputs:bg = (0.5882353, 0.5411765, 1) (
                    colorSpace = "srgb_texture"
                )
                color3f inputs:bg.connect = </Root/Material_0/CstGraph/Multiply_7.outputs:out>
                color3f inputs:fg.connect = </Root/Material_0/CstGraph/innerColor_1.outputs:out>
                float inputs:mix = 1
                float inputs:mix.connect = </Root/Material_0/CstGraph/Mix_1.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (1249.6533, -524.803)
                int ui:nodegraph:node:stackingOrder = 4737
            }

            def Shader "Subtract_1"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1 = 1
                float inputs:in1.connect = None
                float inputs:in2.connect = </Root/Material_0/CstGraph/Power.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2845.2583, 1676.8618)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_13"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Subtract_8.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/Mix_8.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (2443.3394, -2441.3374)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "TextureCoordinates_3"
            {
                uniform token info:id = "ND_texcoord_vector2"
                int inputs:index = 0
                float2 outputs:out
                float2 ui:nodegraph:node:pos = (-514.11523, -1258.1962)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Subtract_9"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/D1.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/marginGrainOut.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-331.26904, -2124.0156)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Step_6"
            {
                uniform token info:id = "ND_realitykit_step_float"
                float inputs:edge.connect = </Root/Material_0/CstGraph/CellNoise2D.outputs:out>
                float inputs:in.connect = </Root/Material_0/CstGraph/Range_5.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1054.1729, -3045.5889)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_10"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/Step_5.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1534.7349, -1070.075)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Combine2_5"
            {
                uniform token info:id = "ND_combine2_vector2"
                float inputs:in1 = 10000
                float inputs:in1.connect = None
                float inputs:in2 = 10000
                float inputs:in2.connect = None
                float2 outputs:out
                float2 ui:nodegraph:node:pos = (-1056.3953, -664.0265)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_3"
            {
                uniform token info:id = "ND_multiply_vector3"
                float3 inputs:in1.connect = </Root/Material_0/CstGraph/Height_V3.outputs:out>
                float3 inputs:in2.connect = </Root/Material_0/CstGraph/Dot_13.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1453.9636, 2018.8021)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Clamp"
            {
                uniform token info:id = "ND_clamp_float"
                float inputs:high
                float inputs:in.connect = </Root/Material_0/CstGraph/Range_2.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (597.55176, -1463.5194)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Subtract"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1 = 2
                float inputs:in1.connect = None
                float inputs:in2.connect = </Root/Material_0/CstGraph/Range_1.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-3353.8584, 1928.2462)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Tangent"
            {
                uniform token info:id = "ND_tangent_vector3"
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-2393.6711, 2265.0952)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Combine3_1"
            {
                uniform token info:id = "ND_combine3_vector3"
                float inputs:in1 = 0
                float inputs:in2 = 0.70710677
                float inputs:in3 = 0.70710677
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1171.7383, 1793.83)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Mix_7"
            {
                uniform token info:id = "ND_mix_color3"
                color3f inputs:bg.connect = </Root/Material_0/CstGraph.inputs:ColorDark>
                color3f inputs:fg.connect = </Root/Material_0/CstGraph/Mix_6.outputs:out>
                float inputs:mix.connect = </Root/Material_0/CstGraph/emojiColor.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (2482.859, -859.4558)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Slope_V3"
            {
                uniform token info:id = "ND_convert_float_vector3"
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot_1.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1668.812, 2103.9595)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "D1"
            {
                uniform token info:id = "ND_constant_float"
                float inputs:value = 0.43
                float outputs:out
                float2 ui:nodegraph:node:pos = (-1305.6172, -1166.6555)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Convert_3"
            {
                uniform token info:id = "ND_convert_float_color3"
                float inputs:in.connect = </Root/Material_0/CstGraph/ConstantFloat.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (365.96973, -363.3423)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dist"
            {
                uniform token info:id = "ND_clamp_float"
                float inputs:high
                float inputs:in.connect = </Root/Material_0/CstGraph/Multiply.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-47.444336, 112.2345)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "TextureCoordinates_1"
            {
                uniform token info:id = "ND_texcoord_vector2"
                int inputs:index = 1
                float2 outputs:out
                float2 ui:nodegraph:node:pos = (-818.583, 28.086426)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Step_3"
            {
                uniform token info:id = "ND_realitykit_step_float"
                float inputs:edge = 0.99
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot_12.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2179.2168, 2403.6333)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Range_1"
            {
                uniform token info:id = "ND_range_float"
                bool inputs:doclamp = 1
                float inputs:gamma
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot_12.outputs:out>
                float inputs:inhigh.connect = </Root/Material_0/CstGraph/Add_3.outputs:out>
                float inputs:inlow.connect = </Root/Material_0/CstGraph/Dot_16.outputs:out>
                float inputs:outhigh = 2
                float inputs:outlow = 0
                float outputs:out
                float2 ui:nodegraph:node:pos = (-3896.8691, 1329.5803)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Step_5"
            {
                uniform token info:id = "ND_realitykit_step_float"
                float inputs:edge.connect = </Root/Material_0/CstGraph/Multiply_14.outputs:out>
                float inputs:in.connect = </Root/Material_0/CstGraph/Range_4.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1192.3423, -844.56714)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Power_2"
            {
                uniform token info:id = "ND_power_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Multiply_12.outputs:out>
                float inputs:in2 = 0.5
                float outputs:out
                float2 ui:nodegraph:node:pos = (-3019.8037, 1868.0782)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Add_3"
            {
                uniform token info:id = "ND_add_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Dot_16.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/Dot_15.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-4180.6313, 1397.9019)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Magnitude"
            {
                uniform token info:id = "ND_magnitude_vector2"
                float2 inputs:in.connect = </Root/Material_0/CstGraph/Grad.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-445.10986, 70.000854)
                int ui:nodegraph:node:stackingOrder = 4763
            }

            def Shader "Power"
            {
                uniform token info:id = "ND_power_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Range_1.outputs:out>
                float inputs:in2 = 2
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2961.5583, 1686.1315)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_6"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/Subtract_4.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (2805.7866, -2476.31)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_4"
            {
                uniform token info:id = "ND_multiply_vector3"
                float3 inputs:in1.connect = </Root/Material_0/CstGraph/Slope_V3.outputs:out>
                float3 inputs:in2.connect = </Root/Material_0/CstGraph/Mix.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1451.5691, 2132.0327)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Range_5"
            {
                uniform token info:id = "ND_range_float"
                bool inputs:doclamp = 0
                float inputs:gamma
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot_9.outputs:out>
                float inputs:inhigh.connect = </Root/Material_0/CstGraph/Subtract_9.outputs:out>
                float inputs:inlow.connect = </Root/Material_0/CstGraph/D1.outputs:out>
                float inputs:outhigh
                float inputs:outlow
                float outputs:out
                float2 ui:nodegraph:node:pos = (816.92236, -3060.8643)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_15"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Separate3_1.outputs:outx>
                float inputs:in2 = -1
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2105.5537, 2206.8828)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Subtract_5"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Multiply_10.outputs:out>
                float inputs:in2 = 1
                float outputs:out
                float2 ui:nodegraph:node:pos = (-384.65918, -705.78894)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Max_1"
            {
                uniform token info:id = "ND_max_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Power_2.outputs:out>
                float inputs:in2 = 0.0001
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2835.1553, 1872.1056)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_10"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/CellNoise2D.outputs:out>
                float inputs:in2 = 2
                float outputs:out
                float2 ui:nodegraph:node:pos = (-465.94434, -715.0897)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Mix_8"
            {
                uniform token info:id = "ND_mix_float"
                float inputs:bg = 1
                float inputs:fg = 0.8
                float inputs:fg.connect = None
                float inputs:mix.connect = </Root/Material_0/CstGraph/shadowsStep.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (2215.8574, -2280.2422)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "NormalMap"
            {
                uniform token info:id = "ND_normalmap"
                float3 inputs:in.connect = </Root/Material_0/CstGraph/Normalize.outputs:out>
                float3 inputs:normal
                float inputs:scale
                string inputs:space = "tangent"
                float3 inputs:tangent
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-989.1133, 2091.229)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_7"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/Max.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1555.8105, -1477.5514)
                int ui:nodegraph:node:stackingOrder = 4462
            }


            def Shader "Range"
            {
                uniform token info:id = "ND_range_float"
                bool inputs:doclamp
                float inputs:in.connect = </Root/Material_0/CstGraph/DotProduct.outputs:out>
                float inputs:inlow = -1
                float inputs:outhigh = 1
                float inputs:outlow = 0.2
                float outputs:out
                float2 ui:nodegraph:node:pos = (-375.08203, 2030.2891)
                int ui:nodegraph:node:stackingOrder = 4848
            }


            def Shader "emojiColor"
            {
                uniform token info:id = "ND_realitykit_step_float"
                float inputs:edge = -1
                float inputs:in.connect = </Root/Material_0/CstGraph/Separate2_1.outputs:outy>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1026.8159, -2070.5796)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Mix_3"
            {
                uniform token info:id = "ND_mix_float"
                float inputs:bg = 0.4
                float inputs:fg = 0
                float inputs:mix.connect = </Root/Material_0/CstGraph/Clamp.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1043.8887, -1523.3219)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Bitangent"
            {
                uniform token info:id = "ND_crossproduct_vector3"
                float3 inputs:in1.connect = </Root/Material_0/CstGraph/Dot_13.outputs:out>
                float3 inputs:in2.connect = </Root/Material_0/CstGraph/Combine3_3.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1672.9207, 2192.4663)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_2"
            {
                uniform token info:id = "ND_dot_vector3"
                float3 inputs:in.connect = </Root/Material_0/CstGraph/Normalize.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-832.2688, 2134.2173)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/Max_1.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-2592.8455, 1687.711)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Subtract_3.outputs:out>
                float inputs:in2 = 1.8
                float outputs:out
                float2 ui:nodegraph:node:pos = (-155.35059, 110.76575)
                int ui:nodegraph:node:stackingOrder = 4760
            }

            def Shader "Subtract_2"
            {
                uniform token info:id = "ND_subtract_vector3"
                float3 inputs:in1.connect = </Root/Material_0/CstGraph/Multiply_3.outputs:out>
                float3 inputs:in2.connect = </Root/Material_0/CstGraph/Multiply_4.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1333.6812, 2074.7505)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Range_2"
            {
                uniform token info:id = "ND_range_float"
                bool inputs:doclamp = 1
                float inputs:gamma
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot_9.outputs:out>
                float inputs:inhigh.connect = None
                float inputs:inlow.connect = </Root/Material_0/CstGraph/Add_7.outputs:out>
                float inputs:outhigh
                float inputs:outlow
                float outputs:out
                float2 ui:nodegraph:node:pos = (367.34033, -1204.0167)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Normalize"
            {
                uniform token info:id = "ND_normalize_vector3"
                float3 inputs:in.connect = </Root/Material_0/CstGraph/Subtract_2.outputs:out>
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1204.564, 2071.434)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Multiply_11"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Dot_8.outputs:out>
                float inputs:in2 = 0.15
                float outputs:out
                float2 ui:nodegraph:node:pos = (11.09082, -706.5858)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Add_4"
            {
                uniform token info:id = "ND_add_vector3"
                float3 inputs:in1.connect = </Root/Material_0/CstGraph/Multiply_2.outputs:out>
                float3 inputs:in2 = (-1, -1, -1)
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-2649.102, 2220.8953)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Clamp_1"
            {
                uniform token info:id = "ND_clamp_float"
                float inputs:high
                float inputs:in.connect = </Root/Material_0/CstGraph/innershadow.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (802.3965, -587.34094)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_9"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/Subtract_6.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (123.61621, -1286.8048)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_14"
            {
                uniform token info:id = "ND_dot_color3"
                color3f inputs:in.connect = </Root/Material_0/CstGraph/Convert_6.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (1982.2915, -625.3749)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_8"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/Subtract_5.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-244.80322, -760.08545)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Dot_16"
            {
                uniform token info:id = "ND_dot_float"
                float inputs:in.connect = </Root/Material_0/CstGraph/D1.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (-4240.2285, 1260.8064)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Add_8"
            {
                uniform token info:id = "ND_add_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Mix_3.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/Clamp.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1224.7041, -1469.4259)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "innershadow"
            {
                uniform token info:id = "ND_mix_float"
                float inputs:bg = 1
                float inputs:bg.connect = None
                float inputs:fg = 1
                float inputs:fg.connect = </Root/Material_0/CstGraph/Dot_7.outputs:out>
                float inputs:mix.connect = </Root/Material_0/CstGraph/Dot_10.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1892.5049, -1432.2811)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "innerColor"
            {
                uniform token info:id = "ND_dot_color3"
                color3f inputs:in.connect = </Root/Material_0/CstGraph/Mix_5.outputs:out>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (2090.9028, -785.06177)
                int ui:nodegraph:node:stackingOrder = 4462
                string[] ui:nodegraph:realitykit:node:attributesShowingChildren = ["outputs:out"]
            }

            def Shader "Range_4"
            {
                uniform token info:id = "ND_range_float"
                bool inputs:doclamp = 0
                float inputs:gamma
                float inputs:in.connect = </Root/Material_0/CstGraph/Dot_9.outputs:out>
                float inputs:inhigh.connect = </Root/Material_0/CstGraph/Add_10.outputs:out>
                float inputs:inlow.connect = </Root/Material_0/CstGraph/Add_7.outputs:out>
                float inputs:outhigh
                float inputs:outlow
                float outputs:out
                float2 ui:nodegraph:node:pos = (964.4839, -943.9059)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Subtract_8"
            {
                uniform token info:id = "ND_subtract_float"
                float inputs:in1 = 1
                float inputs:in1.connect = None
                float inputs:in2.connect = </Root/Material_0/CstGraph/Step_6.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1272.6694, -2967.667)
                int ui:nodegraph:node:stackingOrder = 4462
            }

            def Shader "Position"
            {
                uniform token info:id = "ND_position_vector3"
                string inputs:space = "model"
                float3 outputs:out
                float2 ui:nodegraph:node:pos = (-1578.3828, -556.1992)
                int ui:nodegraph:node:stackingOrder = 4476
            }

            def Shader "Separate3"
            {
                uniform token info:id = "ND_separate3_vector3"
                float3 inputs:in.connect = </Root/Material_0/CstGraph/Position.outputs:out>
                float outputs:outx
                float outputs:outy
                float outputs:outz
                float2 ui:nodegraph:node:pos = (-1366.4766, -529.83984)
                int ui:nodegraph:node:stackingOrder = 4468
            }

            def Shader "Combine2_1"
            {
                uniform token info:id = "ND_combine2_vector2"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Separate3.outputs:outx>
                float inputs:in2.connect = </Root/Material_0/CstGraph/Separate3.outputs:outz>
                float2 outputs:out
                float2 ui:nodegraph:node:pos = (-1101.3906, -523.8633)
                int ui:nodegraph:node:stackingOrder = 4479
            }

            def Shader "TextureCoordinates"
            {
                uniform token info:id = "ND_texcoord_vector2"
                int inputs:index = 2
                float2 outputs:out
                float2 ui:nodegraph:node:pos = (1013.8633, -177.97656)
                int ui:nodegraph:node:stackingOrder = 4721
            }

            def Shader "Separate2"
            {
                uniform token info:id = "ND_separate2_vector2"
                float2 inputs:in.connect = </Root/Material_0/CstGraph/TextureCoordinates.outputs:out>
                float outputs:outx
                float outputs:outy
                float2 ui:nodegraph:node:pos = (993.0625, -256.71484)
                int ui:nodegraph:node:stackingOrder = 4723
            }

            def Shader "Mix_1"
            {
                uniform token info:id = "ND_mix_float"
                float inputs:bg = 0
                float inputs:bg.connect = </Root/Material_0/CstGraph/Clamp_1.outputs:out>
                float inputs:fg = 1
                float inputs:fg.connect = None
                float inputs:mix = 1
                float inputs:mix.connect = </Root/Material_0/CstGraph/Separate2.outputs:outx>
                float outputs:out
                float2 ui:nodegraph:node:pos = (1191.5156, -327.52344)
                int ui:nodegraph:node:stackingOrder = 4745
            }

            def Shader "Convert"
            {
                uniform token info:id = "ND_convert_float_color3"
                float inputs:in.connect = </Root/Material_0/CstGraph/Separate2.outputs:outx>
                color3f outputs:out
                float2 ui:nodegraph:node:pos = (3365.9487, -913.763)
                int ui:nodegraph:node:stackingOrder = 4743
            }

            def Shader "Multiply_1"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Magnitude.outputs:out>
                float inputs:in2 = 2
                float outputs:out
                float2 ui:nodegraph:node:pos = (47, 403.3672)
                int ui:nodegraph:node:stackingOrder = 4765
            }

            def Shader "Mix_4"
            {
                uniform token info:id = "ND_mix_float"
                float inputs:bg.connect = </Root/Material_0/CstGraph/Dist.outputs:out>
                float inputs:fg.connect = </Root/Material_0/CstGraph/Multiply_1.outputs:out>
                float inputs:mix.connect = </Root/Material_0/CstGraph/Separate2.outputs:outx>
                float outputs:out
                float2 ui:nodegraph:node:pos = (335.58984, 294.96094)
                int ui:nodegraph:node:stackingOrder = 4766
            }



            def Shader "Multiply_IsCircle_02"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Separate2.outputs:outx>
                float inputs:in2 = 0.2
                float outputs:out
                float2 ui:nodegraph:node:pos = (47, 403.3672)
                int ui:nodegraph:node:stackingOrder = 4765
            }
            def Shader "Add_Circle_1"
            {
                uniform token info:id = "ND_add_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Multiply_IsCircle_02.outputs:out>
                float inputs:in2 = 1.0
                float outputs:out
                float2 ui:nodegraph:node:pos = (713.5947, -903.2538)
                int ui:nodegraph:node:stackingOrder = 4462
            }
            def Shader "Multiply_IsCircle_03"
            {
                uniform token info:id = "ND_multiply_float"
                float inputs:in1.connect = </Root/Material_0/CstGraph/Mix_4.outputs:out>
                float inputs:in2.connect = </Root/Material_0/CstGraph/Add_Circle_1.outputs:out>
                float outputs:out
                float2 ui:nodegraph:node:pos = (47, 403.3672)
                int ui:nodegraph:node:stackingOrder = 4765
            }

            







            
        }

        def Shader "UnlitSurface"
        {
            uniform token info:id = "ND_realitykit_unlit_surfaceshader"
            bool inputs:applyPostProcessToneMap = 0
            color3f inputs:color.connect = </Root/Material_0/CstGraph.outputs:Color>
            bool inputs:hasPremultipliedAlpha
            float inputs:opacity = 0.5
            float inputs:opacityThreshold.connect = </Root/Material_0/CstGraph.outputs:OpacityThreshold>
            token outputs:out
            float2 ui:nodegraph:node:pos = (171.79688, -79.89844)
            int ui:nodegraph:node:stackingOrder = 11
        }


        def Shader "PreviewSurface"
        {
            uniform token info:id = "ND_UsdPreviewSurface_surfaceshader"
            float inputs:clearcoat
            float inputs:clearcoatRoughness
            color3f inputs:diffuseColor.connect = </Root/Material_0/CstGraph.outputs:Color>
            color3f inputs:emissiveColor
            float inputs:metallic
            float3 inputs:normal
            float inputs:occlusion
            float inputs:opacity = 0.5
            float inputs:opacityThreshold.connect = </Root/Material_0/CstGraph.outputs:OpacityThreshold>
            float inputs:roughness.connect = </Root/Material_0/Subtract.outputs:out>
            token outputs:out
            float2 ui:nodegraph:node:pos = (70.10547, -379.21484)
            int ui:nodegraph:node:stackingOrder = 20
            string[] ui:nodegraph:realitykit:node:attributesShowingChildren = ["Advanced"]
        }

        def Shader "Subtract"
        {
            uniform token info:id = "ND_subtract_float"
            float inputs:in1 = 1
            float inputs:in1.connect = None
            float inputs:in2.connect = </Root/Material_0/Range.outputs:out>
            float outputs:out
            float2 ui:nodegraph:node:pos = (-223.3125, -415.2578)
            int ui:nodegraph:node:stackingOrder = 50
        }
        def Shader "Range"
        {
            uniform token info:id = "ND_range_float"
            bool inputs:doclamp = 0
            float inputs:in.connect = </Root/Material_0/CstGraph.outputs:Noise>
            float inputs:inhigh = 0.5
            float inputs:inlow = 0.2
            float inputs:outhigh = 1
            float inputs:outlow = 0
            float outputs:out
            float2 ui:nodegraph:node:pos = (-266.45703, -67.16016)
            int ui:nodegraph:node:stackingOrder = 97
        }
    }

























    def Material "Material_1" (
        references = </Root/Material_0>
    )
    {
        color3f inputs:ColorDark = ${hexToStringLinear(COLORS[options.colorsIdx][1].dark, 1.9)} (
            colorSpace = "${colorSpace}"
        )
        color3f inputs:ColorPale = ${hexToStringLinear(COLORS[options.colorsIdx][1].pale, 1.9)} (
            colorSpace = "${colorSpace}"
        )
        token outputs:mtlx:surface.connect = </Root/Material_1/PreviewSurface.outputs:out>
        token outputs:realitykit:vertex
        float2 ui:nodegraph:realitykit:subgraphOutputs:pos = (365.5, 130.5)
    }

    def Material "Material_2" (
        references = </Root/Material_0>
    )
    {
        color3f inputs:ColorDark = ${hexToStringLinear(COLORS[options.colorsIdx][2].dark, 1.9)} (
            colorSpace = "${colorSpace}"
        )
        color3f inputs:ColorPale = ${hexToStringLinear(COLORS[options.colorsIdx][2].pale, 1.9)} (
            colorSpace = "${colorSpace}"
        )
        token outputs:mtlx:surface.connect = </Root/Material_2/PreviewSurface.outputs:out>
        token outputs:realitykit:vertex
        float2 ui:nodegraph:realitykit:subgraphOutputs:pos = (365.5, 130.5)
    }

    def Material "Material_3" (
        references = </Root/Material_0>
    )
    {
        color3f inputs:ColorDark = ${hexToStringLinear(COLORS[options.colorsIdx][3].dark, 1.9)} (
            colorSpace = "${colorSpace}"
        )
        color3f inputs:ColorPale = ${hexToStringLinear(COLORS[options.colorsIdx][3].pale, 1.9)} (
            colorSpace = "${colorSpace}"
        )
        token outputs:mtlx:surface.connect = </Root/Material_3/PreviewSurface.outputs:out>
        token outputs:realitykit:vertex
        float2 ui:nodegraph:node:pos = (266, 154.5)
        int ui:nodegraph:node:stackingOrder = 2
        float2 ui:nodegraph:realitykit:subgraphOutputs:pos = (365.5, 130.5)
    }


}           

`;
    files[sceneFileName] = strToU8(sceneStr);
    // model file should be first in USDZ archive so we init it here
    files[modelFileName] = null;

    const root = new USDNode("Root", "Xform");
    const scenesNode = new USDNode("Scenes", "Scope");
    scenesNode.addMetadata("kind", '"sceneLibrary"');
    root.addChild(scenesNode);

    const sceneName = "Scene";
    const sceneNode = new USDNode(sceneName, "Xform");
    sceneNode.addMetadata("customData", [
      "bool preliminary_collidesWithEnvironment = 0",
      `string sceneName = "${sceneName}"`,
    ]);
    sceneNode.addMetadata("sceneName", `"${sceneName}"`);

    if (options.includeAnchoringProperties && options.ar) {
      sceneNode.addProperty(
        `token preliminary:anchoring:type = "${options.ar.anchoring.type}"`,
      );
      sceneNode.addProperty(
        `token preliminary:planeAnchoring:alignment = "${options.ar.planeAnchoring.alignment}"`,
      );
    }

    scenesNode.addChild(sceneNode);

    let output: string | null;

    const materials: Record<string, MeshStandardMaterial> = {};
    const textures: Record<string, Texture> = {};

    buildHierarchy(scene, sceneNode, materials, usedNames, files, options);
    const materialsNode = buildMaterials(
      materials,
      textures,
      !!options.quickLookCompatible,
      this.custom_mtlx,
    );
    root.addChild(materialsNode);
    // output = buildHeader() + '\n' + root.toString() + '\n\n' + materialsNode.toString();

    output = buildHeader() + "\n" + root.toString();

    files[modelFileName] = strToU8(output);
    output = null;
    textures["0"] = options.texture!;

    for (const id in textures) {
      let texture = textures[id];

      if ((texture as CompressedTexture).isCompressedTexture === true) {
        if (this.textureUtils === null) {
          throw new Error(
            "THREE.USDZExporter: setTextureUtils() must be called to process compressed textures.",
          );
        } else {
          texture = await this.textureUtils.decompress(
            texture as CompressedTexture,
          );
        }
      }

      const canvas = imageToCanvas(
        texture.image as any,
        (texture as any).flipY,
        options.maxTextureSize!,
      );
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob(resolve as BlobCallback, "image/png", 1),
      );
      files[`assets/textures/Texture_${id}.png`] = new Uint8Array(
        await blob.arrayBuffer(),
      );
    }

    async function addEXRToZip(
      url: string,
      destPath = "assets/textures/env.exr",
    ) {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok)
        throw new Error(`Failed to fetch EXR: ${res.status} ${res.statusText}`);
      const ab = await res.arrayBuffer();
      files[destPath] = new Uint8Array(ab);
    }

    // Example usage:
    // await addEXRToZip(exrUrl);

    // 64 byte alignment
    // https://github.com/101arrowz/fflate/issues/39#issuecomment-777263109

    let offset = 0;

    for (const filename in files) {
      const file: Uint8Array =
        files[filename] instanceof Array ? files[filename][0] : files[filename];
      const headerSize = 34 + filename.length;

      offset += headerSize;
      const offsetMod64 = offset & 63;

      if (offsetMod64 !== 4) {
        const padLength = 64 - offsetMod64;
        const padding = new Uint8Array(padLength);
        files[filename] = [file, { extra: { 12345: padding } }];
      }

      offset = file.length;
    }

    return zipSync(files, { level: 0 }) as ArrayBuffer;
  }
}

// -----------------------------
// Helpers
// -----------------------------

function getName(object: Object3D, namesSet: Set<string>): string {
  let name = object.name;
  name = name.replace(/[^A-Za-z0-9_]/g, "");
  if (/^[0-9]/.test(name)) name = "_" + name;

  if (name === "") name = object.type === "Camera" ? "Camera" : "Object";
  if (namesSet.has(name)) name = name + "_" + (object as any).id;
  namesSet.add(name);
  return name;
}

function imageToCanvas(
  image: HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap,
  flipY: boolean,
  maxTextureSize: number,
): HTMLCanvasElement {
  const width = (image as any).width as number;
  const height = (image as any).height as number;

  if (typeof width !== "number" || typeof height !== "number") {
    throw new Error(
      "THREE.USDZExporter: No valid image data found. Unable to process texture.",
    );
  }

  const scale = maxTextureSize / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width * Math.min(1, scale);
  canvas.height = height * Math.min(1, scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context not available");

  if (flipY === true) {
    context.translate(0, canvas.height);
    context.scale(1, -1);
  }

  (context as CanvasRenderingContext2D).drawImage(
    image as any,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

const PRECISION = 7;

function buildHeader(): string {
  return `#usda 1.0
(
    customLayerData = {
        string creator = "Reality Composer Pro Version 2.0 (448.100.13)"
    }
    defaultPrim = "Root"
    endTimeCode = 400
    framesPerSecond = 60
    metersPerUnit = 1
    startTimeCode = 1
    timeCodesPerSecond = 60
    upAxis = "Y"
)
`;
}

function buildHierarchy(
  object: Object3D,
  parentNode: USDNode,
  materials: Record<string, MeshStandardMaterial>,
  usedNames: Set<string>,
  files: Record<string, any>,
  options: USDZExporterOptions,
): void {
  for (let i = 0, l = object.children.length; i < l; i++) {
    const child = object.children[i];
    if ((child as any).visible === false && options.onlyVisible) continue;

    let childNode: USDNode | undefined;

    if ((child as Mesh).isMesh) {
      const mesh = child as Mesh;
      const geometry = mesh.geometry as BufferGeometry;
      const material = mesh.material as Material;

      if ((material as MeshStandardMaterial).isMeshStandardMaterial) {
        const geometryFileName =
          "assets/geometries/Geometry_" + (geometry as any).id + ".usda";

        if (!(geometryFileName in files)) {
          const meshObject = buildMeshObject(geometry);
          files[geometryFileName] = strToU8(
            buildHeader() + "\n" + meshObject.toString(),
          );
        }

        const stdMat = material as MeshStandardMaterial;
        if (!(stdMat.uuid in materials)) materials[stdMat.uuid] = stdMat;
        childNode = buildMesh(
          mesh,
          geometry,
          materials[stdMat.uuid],
          usedNames,
        );
      } else {
        console.warn(
          "USDZExporter: Unsupported material type (USDZ only supports MeshStandardMaterial)",
          child,
        );
      }
    } else if ((child as Camera).isCamera) {
      childNode = buildCamera(child as Camera, usedNames);
    } else {
      childNode = buildXform(child, usedNames);
    }

    if (childNode) {
      parentNode.addChild(childNode);
      buildHierarchy(child, childNode, materials, usedNames, files, options);
    }
  }
}

function buildXform(object: Object3D, usedNames: Set<string>): USDNode {
  const name = getName(object, usedNames);
  const transform = buildMatrix(object.matrix);

  if (object.matrix.determinant() < 0) {
    console.warn("USDZExporter: USDZ does not support negative scales", object);
  }

  const node = new USDNode(name, "Xform");
  node.addProperty(`matrix4d xformOp:transform = ${transform}`);
  node.addProperty('uniform token[] xformOpOrder = ["xformOp:transform"]');
  return node;
}

function sanitazeUUID(uuid: string): string {
  return uuid.split("-").join("_");
}
function buildMesh(
  object: Object3D,
  geometry: BufferGeometry,
  material: MeshStandardMaterial,
  usedNames: Set<string>,
): USDNode {
  const node = buildXform(object, usedNames);
  node.addMetadata(
    "prepend references",
    `@./geometries/Geometry_${(geometry as any).id}.usda@</Geometry>`,
  );
  node.addMetadata("prepend apiSchemas", '["MaterialBindingAPI"]');
  node.addProperty(
    `rel material:binding = </Root/Materials/Material_${object.userData.idxColor}>(bindMaterialAs = "strongerThanDescendants")`,
  );
  return node;
}

function buildMatrix(matrix: Matrix4): string {
  const array = matrix.elements;
  return `( ${buildMatrixRow(array, 0)}, ${buildMatrixRow(array, 4)}, ${buildMatrixRow(array, 8)}, ${buildMatrixRow(array, 12)} )`;
}

function buildMatrixRow(array: number[], offset: number): string {
  return `(${array[offset + 0]}, ${array[offset + 1]}, ${array[offset + 2]}, ${array[offset + 3]})`;
}

function buildMeshObject(geometry: BufferGeometry): USDNode {
  const node = new USDNode("Geometry");
  const meshNode = buildMeshNode(geometry);
  node.addChild(meshNode);
  return node;
}

function buildMeshNode(geometry: BufferGeometry): USDNode {
  const name = "Geometry";
  const attributes = geometry.attributes as Record<string, BufferAttribute> & {
    position: BufferAttribute;
    normal?: BufferAttribute;
  };
  const count = attributes.position.count;

  const node = new USDNode(name, "Mesh");
  node.addProperty(
    `int[] faceVertexCounts = [${buildMeshVertexCount(geometry)}]`,
  );
  node.addProperty(
    `int[] faceVertexIndices = [${buildMeshVertexIndices(geometry)}]`,
  );
  node.addProperty(
    `normal3f[] normals = [${buildVector3Array(attributes.normal, count)}]`,
    ['interpolation = "vertex"'],
  );
  node.addProperty(
    `point3f[] points = [${buildVector3Array(attributes.position, count)}]`,
  );

  for (let i = 0; i < 4; i++) {
    const id = i > 0 ? (i as any as string) : "";
    const attribute = (attributes as any)["uv" + id] as
      | BufferAttribute
      | undefined;
    if (attribute !== undefined) {
      node.addProperty(
        `texCoord2f[] primvars:st${id} = [${buildVector2Array(attribute)}]`,
        ['interpolation = "vertex"'],
      );
    }
  }
  const attributeCircle = geometry.getAttribute('aIsCircle')
  if(attributeCircle){
    node.addProperty(
      `texCoord2f[] primvars:st2 = [${Array.from( attributeCircle.array, value => `(${value},0)` ).join(',')}]`,
      ['interpolation = "vertex"'],
    );
  }

  const colorAttribute = (attributes as any).color as
    | BufferAttribute
    | undefined;
  if (colorAttribute !== undefined) {
    node.addProperty(
      `color3f[] primvars:displayColor = [${buildVector3Array(colorAttribute, count)}]`,
      ['interpolation = "vertex"'],
    );
  }

  node.addProperty('uniform token subdivisionScheme = "none"');
  return node;
}

function buildMeshVertexCount(geometry: BufferGeometry): string {
  const count =
    geometry.index !== null
      ? geometry.index.count
      : (geometry.attributes.position as BufferAttribute).count;
  return Array(count / 3)
    .fill(3)
    .join(", ");
}

function buildMeshVertexIndices(geometry: BufferGeometry): string {
  const index = geometry.index as BufferAttribute | null;
  const array: number[] = [];

  if (index !== null) {
    for (let i = 0; i < index.count; i++) array.push(index.getX(i));
  } else {
    const length = (geometry.attributes.position as BufferAttribute).count;
    for (let i = 0; i < length; i++) array.push(i);
  }

  return array.join(", ");
}

function buildVector3Array(
  attribute: BufferAttribute | undefined,
  count: number,
): string {
  if (attribute === undefined) {
    console.warn("USDZExporter: Normals missing.");
    return Array(count).fill("(0, 0, 0)").join(", ");
  }

  const array: string[] = [];
  for (let i = 0; i < attribute.count; i++) {
    const x = attribute.getX(i);
    const y = attribute.getY(i);
    const z = attribute.getZ(i);
    array.push(
      `(${x.toPrecision(PRECISION)}, ${y.toPrecision(PRECISION)}, ${z.toPrecision(PRECISION)})`,
    );
  }
  return array.join(", ");
}

function buildVector2Array(attribute: BufferAttribute): string {
  const array: string[] = [];
  for (let i = 0; i < attribute.count; i++) {
    const x = attribute.getX(i);
    const y = attribute.getY(i);
    array.push(
      `(${x.toPrecision(PRECISION)}, ${1 - Number(y.toPrecision(PRECISION))})`,
    );
  }
  return array.join(", ");
}

function buildMaterials(
  materials: Record<string, MeshStandardMaterial>,
  textures: Record<string, Texture>,
  quickLookCompatible = false,
  custom_mtlx = false,
): USDNode {
  const materialsNode = new USDNode("Materials");
  for (const uuid in materials) {
    const material = materials[uuid];
    console.warn("Build material", material.userData);
    materialsNode.addChild(referencedMaterial(material));
    // if (custom_mtlx) {
    //     materialsNode.addChild(buildMaterialX(material, textures, quickLookCompatible, custom_mtlx));
    // } else {
    //     materialsNode.addChild(buildMaterial(material, textures, quickLookCompatible, custom_mtlx));
    // }
  }
  return materialsNode;
}

function buildMaterialX(
  material: MeshStandardMaterial,
  textures: Record<string, Texture>,
  _quickLookCompatible = false,
  custom_mtlx = false,
): USDNode {
  const materialName = `Material_${sanitazeUUID(material.uuid)}`;
  const materialPath = `Root/Materials/${materialName}`;
  const materialNode = new USDNode(materialName, "Material");
  materialNode.addProperty(
    `prepend token outputs:mtlx:surface.connect = </${materialPath}/PreviewSurface.outputs:out>`,
  );
  materialNode.addProperty(`token outputs:realitykit:vertex`);

  // Helper: add a texture node
  function buildTextureNodes(
    texture: Texture,
    mapType: string,
    infoId: string = "ND_image_color3",
    out: string = "color3f",
  ): USDNode[] {
    const id = (texture as any).source.id + "_" + (texture as any).flipY;
    textures[id] = texture;
    const textureNode = new USDNode(`${mapType}`, "Shader");
    textureNode.addProperty(`uniform token info:id = "${infoId}"`);
    textureNode.addProperty(`asset inputs:file = @textures/Texture_${id}.png@`);
    textureNode.addProperty(`string inputs:filtertype`);
    textureNode.addProperty(`${out} outputs:out`);
    return [textureNode];
  }

  if (material.side === DoubleSide) {
    console.warn(
      "USDZExporter: USDZ does not support double sided materials",
      material,
    );
  }

  // PreviewSurface
  const previewSurfaceNode = new USDNode("PreviewSurface", "Shader");
  previewSurfaceNode.addProperty(
    'uniform token info:id = "ND_UsdPreviewSurface_surfaceshader"',
  );
  previewSurfaceNode.addProperty(
    `color3f inputs:diffuseColor.connect = </${materialPath}/Multiply.outputs:out>`,
  );
  previewSurfaceNode.addProperty(
    `float inputs:roughness = ${material.roughness}`,
  );
  previewSurfaceNode.addProperty(
    `float inputs:metallic = ${material.metalness}`,
  );
  previewSurfaceNode.addProperty(
    `float3 inputs:normal.connect = </${materialPath}/NormalMapDecode.outputs:out>`,
  );
  previewSurfaceNode.addProperty(
    `float inputs:occlusion.connect = </${materialPath}/Subtract.outputs:out>`,
  );
  previewSurfaceNode.addProperty("token outputs:out");
  materialNode.addChild(previewSurfaceNode);

  //NormalMapDecode
  const normalMapDecodeNode = new USDNode("NormalMapDecode", "Shader");
  normalMapDecodeNode.addProperty(
    `uniform token info:id = "ND_normal_map_decode"`,
  );
  normalMapDecodeNode.addProperty(`float3 outputs:out`);
  normalMapDecodeNode.addProperty(
    `float3 inputs:in.connect = </${materialPath}/Image_Normal.outputs:out>`,
  );
  materialNode.addChild(normalMapDecodeNode);

  // Image
  if (material.map) {
    const textureNodes = buildTextureNodes(material.map, "Image");
    textureNodes.forEach((node) => materialNode.addChild(node));
  }

  // Normal
  // const normalNode = new USDNode('Normal', 'Shader');
  // normalNode.addProperty(`uniform token info:id = "ND_normal_vector3"`);
  // normalNode.addProperty(`string inputs:space = "tangent"`);
  // normalNode.addProperty(`float3 outputs:out`);
  // materialNode.addChild(normalNode);

  // Texcoord
  const texcoordNode = new USDNode("Texcoord", "Shader");
  texcoordNode.addProperty(`uniform token info:id = "ND_texcoord_vector2"`);
  texcoordNode.addProperty(`float2 outputs:out`);
  materialNode.addChild(texcoordNode);

  // Image_Normal
  const normalTextureNode = buildTextureNodes(
    material.normalMap!,
    "Image_Normal",
    "ND_image_vector3",
    "float3",
  )[0];
  normalTextureNode.addProperty(
    `prepend float2 inputs:texcoord.connect = </${materialPath}/Place2D.outputs:out>`,
  );
  normalTextureNode.addProperty(`string inputs:uaddressmode`);
  normalTextureNode.addProperty(
    `string[] ui:nodegraph:realitykit:node:attributesShowingChildren = ["inputs:texcoord"]`,
  );
  materialNode.addChild(normalTextureNode);

  // Place2D
  const repeat = material.normalMap!.repeat.clone();
  const place2DNode = new USDNode("Place2D", "Shader");
  place2DNode.addProperty(`uniform token info:id = "ND_place2d_vector2"`);
  place2DNode.addProperty(`float2 inputs:offset`);
  place2DNode.addProperty(`float2 inputs:pivot`);
  place2DNode.addProperty(`float inputs:rotate`);
  place2DNode.addProperty(
    `float2 inputs:scale = (${1 / repeat.x}, ${1 / repeat.y})`,
  );
  place2DNode.addProperty(
    `float2 inputs:texcoord.connect = </${materialPath}/Texcoord.outputs:out>`,
  );
  place2DNode.addProperty(`float2 outputs:out`);
  materialNode.addChild(place2DNode);

  //NormalMap
  // const normalMapNode = new USDNode('NormalMap', 'Shader');
  // normalMapNode.addProperty(`uniform token info:id = "ND_normalmap"`);
  // normalMapNode.addProperty(`float3 inputs:in.connect = </${materialPath}/Image_Normal.outputs:out>`);
  // normalMapNode.addProperty(`float3 inputs:normal.connect = </${materialPath}/Normal.outputs:out>`);
  // normalMapNode.addProperty(`float3 outputs:out`);
  // materialNode.addChild(normalMapNode);

  // Texcoord_1
  const texcoord2Node = new USDNode("Texcoord_1", "Shader");
  texcoord2Node.addProperty(`uniform token info:id = "ND_texcoord_vector2"`);
  texcoord2Node.addProperty(`int inputs:index = 2`);
  texcoord2Node.addProperty(`float2 outputs:out`);
  materialNode.addChild(texcoord2Node);

  const separate2Node = new USDNode("Separate2", "Shader");
  separate2Node.addProperty(`uniform token info:id = "ND_separate2_vector2"`);
  separate2Node.addProperty(
    `float2 inputs:in.connect = </${materialPath}/Texcoord_1.outputs:out>`,
  );
  separate2Node.addProperty(`float outputs:outx`);
  separate2Node.addProperty(`float outputs:outy`);
  materialNode.addChild(separate2Node);

  const subtractNode = new USDNode("Subtract", "Shader");
  subtractNode.addProperty(`uniform token info:id = "ND_subtract_float"`);
  subtractNode.addProperty(`float inputs:in1 = 1`);
  subtractNode.addProperty(
    `float inputs:in2.connect = </${materialPath}/Separate2.outputs:outx>`,
  );
  subtractNode.addProperty(`float outputs:out`);
  materialNode.addChild(subtractNode);

  const convertNode = new USDNode("Convert", "Shader");
  convertNode.addProperty(`uniform token info:id = "ND_convert_float_color3"`);
  convertNode.addProperty(
    `float inputs:in.connect = </${materialPath}/Subtract.outputs:out>`,
  );
  convertNode.addProperty(`color3f outputs:out`);
  materialNode.addChild(convertNode);

  const multiplyNode = new USDNode("Multiply", "Shader");
  multiplyNode.addProperty(`uniform token info:id = "ND_multiply_color3"`);
  multiplyNode.addProperty(
    `color3f inputs:in1.connect = </${materialPath}/CellNoise2D.outputs:out>`,
  );
  multiplyNode.addProperty(
    `color3f inputs:in2.connect = </${materialPath}/Convert.outputs:out>`,
  );
  multiplyNode.addProperty(`color3f outputs:out`);
  materialNode.addChild(multiplyNode);

  return materialNode;
}

function referencedMaterial(material: MeshStandardMaterial): USDNode {
  const materialNode = new USDNode(
    `Material_${material.userData.idxColor}`,
    "Material",
  );
  materialNode.addMetadata(
    "prepend references",
    `@cst.usda@</Root/Material_${material.userData.idxColor}>`,
  );
  return materialNode;
}
function buildMaterial(
  material: MeshStandardMaterial,
  textures: Record<string, Texture>,
  quickLookCompatible = false,
  _custom_mtlx = false,
): USDNode {
  const materialNode = new USDNode(
    `Material_${sanitazeUUID(material.uuid)}`,
    "Material",
  );

  function buildTextureNodes(
    texture: Texture,
    mapType: string,
    color?: Color,
  ): USDNode[] {
    const id = (texture as any).source.id + "_" + (texture as any).flipY;
    textures[id] = texture;

    const uv =
      (texture as any).channel > 0 ? "st" + (texture as any).channel : "st";

    const WRAPPINGS: Record<number, "repeat" | "clamp" | "mirror"> = {
      1000: "repeat",
      1001: "clamp",
      1002: "mirror",
    };

    const repeat = (texture as any).repeat.clone();
    const offset = (texture as any).offset.clone();
    const rotation: number = (texture as any).rotation;

    const xRotationOffset = Math.sin(rotation);
    const yRotationOffset = Math.cos(rotation);

    offset.y = 1 - offset.y - repeat.y;

    if (quickLookCompatible) {
      offset.x = offset.x / repeat.x;
      offset.y = offset.y / repeat.y;
      offset.x += xRotationOffset / repeat.x;
      offset.y += yRotationOffset - 1;
    } else {
      offset.x += xRotationOffset * repeat.x;
      offset.y += (1 - yRotationOffset) * repeat.y;
    }

    const primvarReaderNode = new USDNode(`PrimvarReader_${mapType}`, "Shader");
    primvarReaderNode.addProperty(
      'uniform token info:id = "UsdPrimvarReader_float2"',
    );
    primvarReaderNode.addProperty("float2 inputs:fallback = (0.0, 0.0)");
    primvarReaderNode.addProperty(`token inputs:varname = "${uv}"`);
    primvarReaderNode.addProperty("float2 outputs:result");

    const transform2dNode = new USDNode(`Transform2d_${mapType}`, "Shader");
    transform2dNode.addProperty('uniform token info:id = "UsdTransform2d"');
    transform2dNode.addProperty(
      `token inputs:in.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/PrimvarReader_${mapType}.outputs:result>`,
    );
    transform2dNode.addProperty(
      `float inputs:rotation = ${(rotation * (180 / Math.PI)).toFixed(PRECISION)}`,
    );
    transform2dNode.addProperty(
      `float2 inputs:scale = ${buildVector2(repeat)}`,
    );
    transform2dNode.addProperty(
      `float2 inputs:translation = ${buildVector2(offset)}`,
    );
    transform2dNode.addProperty("float2 outputs:result");

    const textureNode = new USDNode(
      `Texture_${(texture as any).id}_${mapType}`,
      "Shader",
    );
    textureNode.addProperty('uniform token info:id = "UsdUVTexture"');
    textureNode.addProperty(`asset inputs:file = @textures/Texture_${id}.png@`);
    textureNode.addProperty(
      `float2 inputs:st.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Transform2d_${mapType}.outputs:result>`,
    );

    if (color !== undefined) {
      textureNode.addProperty(`float4 inputs:scale = ${buildColor4(color)}`);
    }

    textureNode.addProperty(
      `token inputs:sourceColorSpace = "${(texture as any).colorSpace === NoColorSpace ? "raw" : "sRGB"}"`,
    );
    textureNode.addProperty(
      `token inputs:wrapS = "${WRAPPINGS[(texture as any).wrapS]}"`,
    );
    textureNode.addProperty(
      `token inputs:wrapT = "${WRAPPINGS[(texture as any).wrapT]}"`,
    );
    textureNode.addProperty("float outputs:r");
    textureNode.addProperty("float outputs:g");
    textureNode.addProperty("float outputs:b");
    textureNode.addProperty("float3 outputs:rgb");

    if ((material as any).transparent || (material as any).alphaTest > 0.0) {
      textureNode.addProperty("float outputs:a");
    }

    return [primvarReaderNode, transform2dNode, textureNode];
  }

  if (material.side === DoubleSide) {
    console.warn(
      "USDZExporter: USDZ does not support double sided materials",
      material,
    );
  }

  const previewSurfaceNode = new USDNode("PreviewSurface", "Shader");
  previewSurfaceNode.addProperty('uniform token info:id = "UsdPreviewSurface"');

  if (material.map !== null) {
    previewSurfaceNode.addProperty(
      `color3f inputs:diffuseColor.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.map as any).id}_diffuse.outputs:rgb>`,
    );

    if ((material as any).transparent) {
      previewSurfaceNode.addProperty(
        `float inputs:opacity.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.map as any).id}_diffuse.outputs:a>`,
      );
    } else if ((material as any).alphaTest > 0.0) {
      previewSurfaceNode.addProperty(
        `float inputs:opacity.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.map as any).id}_diffuse.outputs:a>`,
      );
      previewSurfaceNode.addProperty(
        `float inputs:opacityThreshold = ${(material as any).alphaTest}`,
      );
    }

    const textureNodes = buildTextureNodes(
      material.map!,
      "diffuse",
      material.color,
    );
    textureNodes.forEach((node) => materialNode.addChild(node));
  } else {
    previewSurfaceNode.addProperty(
      `color3f inputs:diffuseColor = ${buildColor(material.color)}`,
    );
  }

  if (material.emissiveMap !== null) {
    previewSurfaceNode.addProperty(
      `color3f inputs:emissiveColor.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.emissiveMap as any).id}_emissive.outputs:rgb>`,
    );
    const emissiveColor = new Color(
      material.emissive.r * material.emissiveIntensity,
      material.emissive.g * material.emissiveIntensity,
      material.emissive.b * material.emissiveIntensity,
    );
    const textureNodes = buildTextureNodes(
      material.emissiveMap!,
      "emissive",
      emissiveColor,
    );
    textureNodes.forEach((node) => materialNode.addChild(node));
  } else if (material.emissive.getHex() > 0) {
    previewSurfaceNode.addProperty(
      `color3f inputs:emissiveColor = ${buildColor(material.emissive)}`,
    );
  }

  if (material.normalMap !== null) {
    previewSurfaceNode.addProperty(
      `normal3f inputs:normal.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.normalMap as any).id}_normal.outputs:rgb>`,
    );
    const textureNodes = buildTextureNodes(material.normalMap!, "normal");
    textureNodes.forEach((node) => materialNode.addChild(node));
  }

  if (material.aoMap !== null) {
    previewSurfaceNode.addProperty(
      `float inputs:occlusion.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.aoMap as any).id}_occlusion.outputs:r>`,
    );
    const aoColor = new Color(
      (material as any).aoMapIntensity,
      (material as any).aoMapIntensity,
      (material as any).aoMapIntensity,
    );
    const textureNodes = buildTextureNodes(
      material.aoMap!,
      "occlusion",
      aoColor,
    );
    textureNodes.forEach((node) => materialNode.addChild(node));
  }

  if (material.roughnessMap !== null) {
    previewSurfaceNode.addProperty(
      `float inputs:roughness.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.roughnessMap as any).id}_roughness.outputs:g>`,
    );
    const roughnessColor = new Color(
      material.roughness,
      material.roughness,
      material.roughness,
    );
    const textureNodes = buildTextureNodes(
      material.roughnessMap!,
      "roughness",
      roughnessColor,
    );
    textureNodes.forEach((node) => materialNode.addChild(node));
  } else {
    previewSurfaceNode.addProperty(
      `float inputs:roughness = ${material.roughness}`,
    );
  }

  if (material.metalnessMap !== null) {
    previewSurfaceNode.addProperty(
      `float inputs:metallic.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.metalnessMap as any).id}_metallic.outputs:b>`,
    );
    const metalnessColor = new Color(
      material.metalness,
      material.metalness,
      material.metalness,
    );
    const textureNodes = buildTextureNodes(
      material.metalnessMap!,
      "metallic",
      metalnessColor,
    );
    textureNodes.forEach((node) => materialNode.addChild(node));
  } else {
    previewSurfaceNode.addProperty(
      `float inputs:metallic = ${material.metalness}`,
    );
  }

  if (material.alphaMap !== null) {
    previewSurfaceNode.addProperty(
      `float inputs:opacity.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${(material.alphaMap as any).id}_opacity.outputs:r>`,
    );
    previewSurfaceNode.addProperty("float inputs:opacityThreshold = 0.0001");
    const textureNodes = buildTextureNodes(material.alphaMap!, "opacity");
    textureNodes.forEach((node) => materialNode.addChild(node));
  } else {
    previewSurfaceNode.addProperty(
      `float inputs:opacity = ${material.opacity}`,
    );
  }

  if ((material as any).isMeshPhysicalMaterial) {
    const phys = material as any;

    if (phys.clearcoatMap !== null) {
      previewSurfaceNode.addProperty(
        `float inputs:clearcoat.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${phys.clearcoatMap.id}_clearcoat.outputs:r>`,
      );
      const clearcoatColor = new Color(
        phys.clearcoat,
        phys.clearcoat,
        phys.clearcoat,
      );
      const textureNodes = buildTextureNodes(
        phys.clearcoatMap,
        "clearcoat",
        clearcoatColor,
      );
      textureNodes.forEach((node) => materialNode.addChild(node));
    } else {
      previewSurfaceNode.addProperty(
        `float inputs:clearcoat = ${phys.clearcoat}`,
      );
    }

    if (phys.clearcoatRoughnessMap !== null) {
      previewSurfaceNode.addProperty(
        `float inputs:clearcoatRoughness.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/Texture_${phys.clearcoatRoughnessMap.id}_clearcoatRoughness.outputs:g>`,
      );
      const clearcoatRoughnessColor = new Color(
        phys.clearcoatRoughness,
        phys.clearcoatRoughness,
        phys.clearcoatRoughness,
      );
      const textureNodes = buildTextureNodes(
        phys.clearcoatRoughnessMap,
        "clearcoatRoughness",
        clearcoatRoughnessColor,
      );
      textureNodes.forEach((node) => materialNode.addChild(node));
    } else {
      previewSurfaceNode.addProperty(
        `float inputs:clearcoatRoughness = ${phys.clearcoatRoughness}`,
      );
    }

    previewSurfaceNode.addProperty(`float inputs:ior = ${phys.ior}`);
  }

  previewSurfaceNode.addProperty("int inputs:useSpecularWorkflow = 0");
  previewSurfaceNode.addProperty("token outputs:surface");
  materialNode.addChild(previewSurfaceNode);
  materialNode.addProperty(
    `token outputs:surface.connect = </Root/Materials/Material_${sanitazeUUID(material.uuid)}/PreviewSurface.outputs:surface>`,
  );

  return materialNode;
}

function buildColor(color: Color): string {
  return `(${color.r}, ${color.g}, ${color.b})`;
}

function buildColor4(color: Color): string {
  return `(${color.r}, ${color.g}, ${color.b}, 1.0)`;
}

function buildVector2(vector: { x: number; y: number }): string {
  return `(${vector.x}, ${vector.y})`;
}

function buildCamera(camera: Camera, usedNames: Set<string>): USDNode {
  const name = getName(camera as unknown as Object3D, usedNames);
  const transform = buildMatrix((camera as any).matrix as Matrix4);

  if ((camera as any).matrix.determinant() < 0) {
    console.warn("USDZExporter: USDZ does not support negative scales", camera);
  }

  const node = new USDNode(name, "Camera");
  node.addProperty(`matrix4d xformOp:transform = ${transform}`);
  node.addProperty('uniform token[] xformOpOrder = ["xformOp:transform"]');

  const projection = (camera as OrthographicCamera).isOrthographicCamera
    ? "orthographic"
    : "perspective";
  node.addProperty(`token projection = "${projection}"`);

  const clippingRange = `(${(camera as any).near.toPrecision(PRECISION)}, ${(camera as any).far.toPrecision(PRECISION)})`;
  node.addProperty(`float2 clippingRange = ${clippingRange}`);

  let horizontalAperture: string;
  if ((camera as OrthographicCamera).isOrthographicCamera) {
    horizontalAperture = (
      (Math.abs((camera as any).left) + Math.abs((camera as any).right)) *
      10
    ).toPrecision(PRECISION);
  } else {
    horizontalAperture = (camera as PerspectiveCamera)
      .getFilmWidth()
      .toPrecision(PRECISION);
  }
  node.addProperty(`float horizontalAperture = ${horizontalAperture}`);

  let verticalAperture: string;
  if ((camera as OrthographicCamera).isOrthographicCamera) {
    verticalAperture = (
      (Math.abs((camera as any).top) + Math.abs((camera as any).bottom)) *
      10
    ).toPrecision(PRECISION);
  } else {
    verticalAperture = (camera as PerspectiveCamera)
      .getFilmHeight()
      .toPrecision(PRECISION);
  }
  node.addProperty(`float verticalAperture = ${verticalAperture}`);

  if ((camera as PerspectiveCamera).isPerspectiveCamera) {
    const focalLength = (camera as PerspectiveCamera)
      .getFocalLength()
      .toPrecision(PRECISION);
    node.addProperty(`float focalLength = ${focalLength}`);
    const focusDistance = (camera as any).focus.toPrecision(PRECISION);
    node.addProperty(`float focusDistance = ${focusDistance}`);
  }

  return node;
}

export default USDZExporter;
