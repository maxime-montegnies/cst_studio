// src/utils/geometry.ts
import { ShaderMaterial, Group } from "three";

export function randomId(current: number, size: number): number {
  let newValue = current;
  while (current == newValue) {
    newValue = Math.floor(Math.random() * (size + 0.999));
  }
  return newValue;
}
export function hexToVec3Srgb(hex: number): number[] {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const srgb = [r, g, b];
  return srgb;
}
export function hexToCSS(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}
export function hexToStringSrgb(hex: number): string {
  const srgb = hexToVec3Srgb(hex);
  return `(${srgb[0]},${srgb[1]},${srgb[2]})`;
}
export function hexToVec3Linear(hex: number, po:number=2.4): number[] {
  const srgb = hexToVec3Srgb(hex);
  const linear = srgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, po),
  );
  return linear;
}
export function mixHexColors(
  color1: number,
  color2: number,
  t: number,
): number[] {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;
  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  // return (r << 16) | (g << 8) | b;
  return [r / 255, g / 255, b / 255];
}
export function hexToStringLinear(hex: number, po:number=2.4): string {
  const srgb = hexToVec3Linear(hex, po);
  return `(${srgb[0]},${srgb[1]},${srgb[2]})`;
}
export type PointA = [number, number];
export interface LayerValue {
  progress: number;
  idx: number;
  max: number;
  material: ShaderMaterial | null;
  group: Group | null;
  groupOut: Group | null;
  prefix: string;
  tween: gsap.core.Tween;
}
export interface LayerValues {
  top: LayerValue;
  inner: LayerValue;
  middle: LayerValue;
  outer: LayerValue;
  bg: LayerValue;
}
export interface Layer {
  shape: number;
  depth: number;
  count: number;
  angle: number;
  path: string;
}
export interface Point {
  x: number;
  y: number;
}
export interface HistoryEntry {
  pts: string;
  color: string;
}
export interface Segment {
  0: Point;
  1: Point;
}
// --- distance helpers ---
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function saturate(a: number): number {
  return Math.min(1, Math.max(0, a));
}
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}
export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function len(v: Point): number {
  return Math.hypot(v.x, v.y);
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}
