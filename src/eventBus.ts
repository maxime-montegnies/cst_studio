import mitt from 'mitt'
import type { Point } from './utils/utils'

type RouteChange = {
  to: string
  from: string
}
type Events = {
  introCst: undefined,
  colorChanged: number,
  cstClick: Point,
  addRipple: {x:number, y:number},
  sizeRipple: {size:number, duration:number},
  cstColorize: number,
  cstLayerUp: number,
  sceneReady: boolean,
  'route-has-changed': RouteChange,
  'route-will-change': RouteChange,
  tutoIsoCamera: boolean,
  cstRandom: undefined,
  exportUsdz: undefined,
  exportImg: undefined,
  usdzReady: string,
  imgReady: string,
  activeExport: boolean,
  saturateCst: boolean,
  resize: {width:number, height:number}
}

export const eventBus = mitt<Events>()