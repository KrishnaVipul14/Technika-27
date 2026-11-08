import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, LatheGeometry, Object3D, Shape, SRGBColorSpace, Vector2, type Group, type InstancedMesh, type Mesh, type PointLight, type Points } from "three";
import type { Vec3 } from "@/lib/common-room/config";
import { Box, Orb, Studs, Table, Tube, cachedCanvas, useMaterials } from "./scene-primitives";

export { paintings } from "../room-assets";
const rand = (i: number) => { const v = Math.sin(i * 91.17 + 7.3) * 43758.5453; return v - Math.floor(v); };

/** Points-based flames: always face the camera, one draw call per set. */
function Flames({ positions, size = .6, color = "#ffb24a" }: { positions: Float32Array; size?: number; color?: string }) {
  const { glow } = useMaterials();
  return <>
    <points frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial map={glow} color={color} size={size} transparent opacity={.9} blending={AdditiveBlending} depthWrite={false} /></points>
    <points frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial map={glow} color="#fff4d6" size={size * .3} transparent blending={AdditiveBlending} depthWrite={false} /></points>
  </>;
}

/** The Great Hall's enchanted floating candles, drifting independently under the ceiling. */
export function FloatingCandles({ count = 26, center = [0, 6.6, -1], area = [12, 1.6, 10], motion }: { count?: number; center?: Vec3; area?: Vec3; motion: boolean }) {
  const { materials } = useMaterials(); const wax = useRef<InstancedMesh>(null); const flames = useRef<Group>(null); const time = useRef(0);
  const candles = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: (rand(i) - .5) * area[0], y: (rand(i + 40) - .5) * area[1], z: (rand(i + 80) - .5) * area[2], h: .32 + rand(i + 120) * .34, phase: rand(i + 160) * 6.28 })), [count, area]);
  const flamePositions = useMemo(() => new Float32Array(count * 3), [count]);
  const place = (t: number) => {
    const object = new Object3D();
    candles.forEach((c, i) => {
      const y = c.y + Math.sin(t * .55 + c.phase) * .12;
      object.position.set(c.x, y, c.z); object.rotation.set(Math.sin(t * .4 + c.phase) * .03, 0, Math.cos(t * .35 + c.phase) * .03); object.scale.set(1, c.h, 1); object.updateMatrix();
      wax.current?.setMatrixAt(i, object.matrix);
      flamePositions[i * 3] = c.x; flamePositions[i * 3 + 1] = y + c.h / 2 + .09; flamePositions[i * 3 + 2] = c.z;
    });
    if (wax.current) wax.current.instanceMatrix.needsUpdate = true;
    flames.current?.children.forEach((child) => { const attribute = (child as Points).geometry?.attributes.position; if (attribute) attribute.needsUpdate = true; });
  };
  useLayoutEffect(() => { place(0); wax.current?.computeBoundingSphere(); });
  useFrame((_, delta) => { if (!motion) return; time.current += Math.min(delta, .05); place(time.current); });
  return <group position={center}>
    <instancedMesh ref={wax} args={[undefined, materials.wax, count]} frustumCulled={false}><cylinderGeometry args={[.045, .05, 1, 10]} /></instancedMesh>
    <group ref={flames}><Flames positions={flamePositions} size={.75} /></group>
  </group>;
}

/** Oil painting in a gilded, layered frame with a brass picture light. */
export function Portrait({ at, rotation = 0, image, size = [1.6, 1.1] }: { at: Vec3; rotation?: number; image: string; size?: [number, number] }) {
  const map = useTexture(image); const [w, h] = size;
  const rosettes = useMemo<Vec3[]>(() => [-1, 1].flatMap((x) => [-1, 1].map((y): Vec3 => [x * (w / 2 + .1), y * (h / 2 + .1), .12])), [w, h]);
  return <group position={at} rotation-y={rotation}>
    <Box at={[0, 0, 0]} size={[w + .44, h + .44, .1]} material="gold" />
    {[[0, h / 2 + .13, w + .3, .1], [0, -h / 2 - .13, w + .3, .1], [w / 2 + .13, 0, .1, h + .3], [-w / 2 - .13, 0, .1, h + .3]].map(([x, y, sx, sy], i) => <Box key={i} at={[x, y, .08]} size={[sx, sy, .08]} material="gold" />)}
    <Box at={[0, 0, .06]} size={[w + .1, h + .1, .04]} material="dark" />
    <mesh position={[0, 0, .085]}><planeGeometry args={[w, h]} /><meshStandardMaterial map={map} roughness={.62} color="#efe2c8" /></mesh>
    <Studs points={rosettes} radius={.07} material="gold" flatten={.5} />
    <Orb at={[0, h / 2 + .32, .12]} scale={[.11, .09, .05]} material="gold" />
    <Box at={[0, -h / 2 - .32, .1]} size={[.42, .09, .02]} material="gold" />
    <group position={[0, h / 2 + .36, .3]}><Box at={[0, 0, 0]} size={[w * .55, .06, .1]} material="gold" /><Box at={[0, .07, -.15]} size={[.04, .14, .3]} material="gold" /><mesh position={[0, -.04, .02]} rotation-x={Math.PI / 2}><planeGeometry args={[w * .5, .03]} /><meshBasicMaterial color="#ffe2a8" /></mesh></group>
  </group>;
}

/** Swallow-tailed house banner with a gilded border, crest, finials and tassels. */
export function Banner({ at, crest, width = 1.1, length = 3.2, motion, rotation = 0 }: { at: Vec3; crest: string; width?: number; length?: number; motion: boolean; rotation?: number }) {
  const { materials } = useMaterials(); const logo = useTexture(crest); const cloth = useRef<Group>(null); const time = useRef(at[0]);
  const outline = useMemo(() => { const s = new Shape(); const hw = width / 2; s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, -length); s.lineTo(0, -length + .45); s.lineTo(-hw, -length); s.closePath(); return s; }, [width, length]);
  useFrame((_, delta) => { if (!motion || !cloth.current) return; time.current += Math.min(delta, .05); cloth.current.rotation.x = Math.sin(time.current * .7) * .025; });
  return <group position={at} rotation-y={rotation}>
    <mesh rotation-z={Math.PI / 2} material={materials.gold}><cylinderGeometry args={[.035, .035, width + .45, 10]} /></mesh>
    {[-1, 1].map((s) => <Orb key={s} at={[s * (width / 2 + .25), 0, 0]} scale={[.07, .07, .07]} material="gold" />)}
    <group ref={cloth} position={[0, -.05, 0]}>
      <mesh position={[0, .04, -.012]} scale={[1.08, 1.02, 1]} material={materials.gold}><shapeGeometry args={[outline]} /></mesh>
      <mesh material={materials.fabric} castShadow><shapeGeometry args={[outline]} /></mesh>
      <mesh position={[0, -length * .38, .012]}><planeGeometry args={[width * .68, width * .68 * 1164 / 1351]} /><meshStandardMaterial map={logo} transparent roughness={.7} /></mesh>
      {[.25, length * .7].map((y) => <Box key={y} at={[0, -y, .01]} size={[width * .9, .035, .005]} material="gold" />)}
      {[-1, 1].map((s) => <group key={s} position={[s * width / 2, -length - .02, .01]}><Orb at={[0, 0, 0]} scale={[.05, .05, .05]} material="gold" /><mesh position={[0, -.14, 0]} material={materials.gold}><coneGeometry args={[.05, .24, 8]} /></mesh></group>)}
    </group>
  </group>;
}

/** Persian-style rug, painted locally in the house palette. */
function rugTexture(round: boolean, field: string, accent: string) {
  const texture = new CanvasTexture(cachedCanvas(`rug-${round}-${field}-${accent}`, () => drawRug(round, field, accent)));
  texture.colorSpace = SRGBColorSpace; texture.anisotropy = 8; return texture;
}
function drawRug(round: boolean, field: string, accent: string) {
  const size = 512, canvas = document.createElement("canvas"); canvas.width = canvas.height = size; const ctx = canvas.getContext("2d")!;
  const deep = new Color(field).multiplyScalar(.55).getStyle(), cream = "#d8c6a0";
  ctx.fillStyle = deep; ctx.fillRect(0, 0, size, size);
  const ring = (inset: number, color: string, width: number) => { ctx.strokeStyle = color; ctx.lineWidth = width; if (round) { ctx.beginPath(); ctx.arc(256, 256, 256 - inset, 0, Math.PI * 2); ctx.stroke(); } else ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2); };
  ring(10, cream, 6); ring(22, accent, 12); ring(44, field, 26); ring(60, cream, 4);
  // Repeating border motif.
  ctx.fillStyle = accent;
  for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2; const [x, y] = round ? [256 + Math.cos(t) * 212, 256 + Math.sin(t) * 212] : [i < 12 ? 40 + i * 37 : i < 24 ? 472 : i < 36 ? 472 - (i - 24) * 37 : 40, i < 12 ? 44 : i < 24 ? 44 + (i - 12) * 37 : i < 36 ? 468 : 468 - (i - 36) * 37]; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore(); }
  // Field lattice and central medallion.
  ctx.globalAlpha = .35; ctx.strokeStyle = accent; ctx.lineWidth = 2;
  for (let i = -6; i < 7; i++) { ctx.beginPath(); ctx.moveTo(256 + i * 40 - 200, 70); ctx.lineTo(256 + i * 40 + 200, 442); ctx.stroke(); ctx.beginPath(); ctx.moveTo(256 + i * 40 + 200, 70); ctx.lineTo(256 + i * 40 - 200, 442); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (const [r, color] of [[118, cream], [104, field], [80, accent], [52, deep], [26, cream]] as const) { ctx.fillStyle = color; ctx.beginPath(); for (let i = 0; i <= 16; i++) { const t = i / 16 * Math.PI * 2, rr = r * (i % 2 ? .78 : 1); ctx.lineTo(256 + Math.cos(t) * rr, 256 + Math.sin(t) * rr * (round ? 1 : 1.25)); } ctx.fill(); }
  // Wear and pile.
  const image = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < image.data.length; i += 4) { const n = (rand(i) - .5) * 26; image.data[i] += n; image.data[i + 1] += n; image.data[i + 2] += n; }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
export function Rug({ at, size, round = false, field, accent, rotation = 0 }: { at: Vec3; size: [number, number]; round?: boolean; field: string; accent: string; rotation?: number }) {
  const map = useMemo(() => rugTexture(round, field, accent), [round, field, accent]);
  useEffect(() => () => map.dispose(), [map]);
  return <mesh position={at} rotation={[-Math.PI / 2, 0, rotation]} receiveShadow>
    {round ? <circleGeometry args={[size[0], 72]} /> : <planeGeometry args={size} />}
    <meshStandardMaterial map={map} roughness={1} />
  </mesh>;
}

/** Three-branch candelabrum with a warm, flickering local light. */
export function Candelabra({ at, motion }: { at: Vec3; motion: boolean }) {
  const { materials } = useMaterials(); const light = useRef<PointLight>(null); const time = useRef(at[0] * 10);
  const tips: Vec3[] = [[-.26, .62, 0], [0, .74, 0], [.26, .62, 0]];
  const flames = useMemo(() => new Float32Array(tips.flatMap(([x, y]) => [x, y + .26, 0])), []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, delta) => { if (motion) time.current += Math.min(delta, .05); if (light.current) light.current.intensity = 5 + (motion ? Math.sin(time.current * 11) * .5 + Math.sin(time.current * 23) * .3 : 0); });
  return <group position={at}>
    <mesh position={[0, .03, 0]} material={materials.gold}><cylinderGeometry args={[.13, .16, .06, 20]} /></mesh>
    <mesh position={[0, .36, 0]} material={materials.gold}><cylinderGeometry args={[.025, .04, .64, 10]} /></mesh>
    <Orb at={[0, .28, 0]} scale={[.06, .05, .06]} material="gold" />
    {[-1, 1].map((s) => <Tube key={s} points={[[0, .48, 0], [s * .16, .46, 0], [s * .26, .58, 0]]} radius={.016} material="gold" />)}
    {tips.map(([x, y], i) => <group key={i} position={[x, y, 0]}><mesh material={materials.gold}><cylinderGeometry args={[.05, .03, .05, 12]} /></mesh><mesh position={[0, .11, 0]} material={materials.wax}><cylinderGeometry args={[.025, .028, .2, 10]} /></mesh></group>)}
    <Flames positions={flames} size={.42} />
    <pointLight ref={light} position={[0, 1, .1]} color="#ffb35c" intensity={5} distance={5} decay={2} />
  </group>;
}

function Quill() {
  const { materials } = useMaterials();
  const vane = useMemo(() => { const s = new Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.07, .18, .02, .5); s.quadraticCurveTo(-.03, .3, 0, 0); return s; }, []);
  return <group rotation={[.15, 0, -.35]}>
    <mesh position={[0, .08, 0]}><shapeGeometry args={[vane, 10]} /><meshStandardMaterial color="#efe8da" roughness={.85} side={DoubleSide} /></mesh>
    <Tube points={[[0, 0, 0], [.012, .3, 0], [.02, .56, 0]]} radius={.004} material="paper" />
    <mesh position={[0, -.02, 0]} material={materials.dark}><coneGeometry args={[.006, .05, 5]} /></mesh>
  </group>;
}
/** Open spellbook, inkwell and quill, rolled scroll, stacked tomes and a candelabrum. */
export function TableDressing({ motion }: { motion: boolean }) {
  const { materials } = useMaterials();
  return <group position={[0, 1.04, 0]}>
    <group position={[-.15, 0, .08]} rotation-y={.2}>
      <Box at={[0, .015, 0]} size={[.86, .03, .58]} material="fabric" />
      {[-1, 1].map((s) => <group key={s} rotation-z={-s * .09}><Box at={[s * .2, .05, 0]} size={[.4, .045, .53]} material="paper" /></group>)}
      {[-1, 1].flatMap((s) => [0, 1, 2, 3].map((l) => <Box key={`${s}${l}`} at={[s * .2, .078 - Math.abs(s) * .0, -.15 + l * .09]} size={[.28, .003, .012]} material="dark" rotation={[0, 0, -s * .09]} />))}
    </group>
    <group position={[.42, 0, -.26]}>
      <mesh position={[0, .06, 0]}><cylinderGeometry args={[.07, .085, .12, 16]} /><meshStandardMaterial color="#0d1a20" roughness={.08} metalness={.2} /></mesh>
      <mesh position={[0, .13, 0]} material={materials.gold}><cylinderGeometry args={[.035, .04, .03, 12]} /></mesh>
      <group position={[0, .14, 0]}><Quill /></group>
    </group>
    <mesh position={[.55, .045, .24]} rotation={[0, .5, Math.PI / 2]} material={materials.paper} castShadow><cylinderGeometry args={[.045, .045, .5, 14]} /></mesh>
    <Box at={[.55, .045, .24]} size={[.04, .095, .095]} material="fabric" rotation={[0, .5, 0]} />
    <group position={[-.75, 0, -.25]} rotation-y={-.3}>{[0, 1, 2].map((i) => <Box key={i} at={[i * .02, .035 + i * .07, 0]} size={[.42 - i * .04, .065, .3 - i * .02]} material={i === 1 ? "fabric" : "wood"} rotation={[0, i * .2, 0]} />)}</group>
    <Candelabra at={[.05, 0, -.4]} motion={motion} />
  </group>;
}
export function WizardTable({ at, width, motion }: { at?: Vec3; width?: number; motion: boolean }) {
  return <group><Table at={at} width={width} /><group position={at || [0, 0, 1]}><TableDressing motion={motion} /></group></group>;
}

/** Iron cauldron on three legs with a softly glowing, bubbling draught. */
export function Cauldron({ at, color = "#6dff9c", motion }: { at: Vec3; color?: string; motion: boolean }) {
  const { glow } = useMaterials(); const bubbles = useRef<Group>(null); const light = useRef<PointLight>(null); const time = useRef(0);
  const pot = useMemo(() => new LatheGeometry([[.05, 0], [.38, .05], [.55, .28], [.58, .52], [.5, .74], [.47, .8], [.52, .84]].map(([x, y]) => new Vector2(x, y)), 32), []);
  useEffect(() => () => pot.dispose(), [pot]);
  useFrame((_, delta) => {
    if (!motion) return; time.current += Math.min(delta, .05);
    bubbles.current?.children.forEach((b, i) => { const t = (time.current * .6 + i * .37) % 1; b.position.y = .76 + t * .1; b.scale.setScalar(.035 * Math.sin(t * Math.PI) + .005); });
    if (light.current) light.current.intensity = 6 + Math.sin(time.current * 2.3) * 1.2;
  });
  return <group position={at}>
    {[0, 1, 2].map((i) => { const a = i * Math.PI * 2 / 3; return <Tube key={i} points={[[Math.cos(a) * .4, .45, Math.sin(a) * .4], [Math.cos(a) * .55, .2, Math.sin(a) * .55], [Math.cos(a) * .6, 0, Math.sin(a) * .6]]} radius={.035} material="dark" />; })}
    <mesh geometry={pot} position={[0, .18, 0]} castShadow><meshStandardMaterial color="#1b1c1c" metalness={.75} roughness={.5} side={DoubleSide} /></mesh>
    <mesh position={[0, 1.02, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[.52, .035, 8, 40]} /><meshStandardMaterial color="#272726" metalness={.8} roughness={.4} /></mesh>
    <mesh position={[0, .92, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[.48, 32]} /><meshBasicMaterial color={color} /></mesh>
    <group ref={bubbles} position={[0, .18, 0]}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[Math.cos(i * 2.4) * .25 * rand(i), .78, Math.sin(i * 2.4) * .25 * rand(i)]} scale={.02}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={color} /></mesh>)}</group>
    <mesh position={[0, 1.6, 0]}><planeGeometry args={[1.6, 1.6]} /><meshBasicMaterial map={glow} color={color} transparent opacity={.18} blending={AdditiveBlending} depthWrite={false} /></mesh>
    <pointLight ref={light} position={[0, 1.4, 0]} color={color} intensity={6} distance={6} decay={2} />
  </group>;
}

/** Racing broom leaning against a wall. */
export function Broomstick({ at, rotation = 0 }: { at: Vec3; rotation?: number }) {
  const { materials } = useMaterials();
  return <group position={at} rotation={[0, rotation, .22]}>
    <Tube points={[[0, .7, 0], [.01, 1.6, .01], [-.01, 2.6, 0], [.02, 3.05, .02]]} radius={.035} material="wood" />
    <mesh position={[0, .38, 0]} material={materials.wood} castShadow><cylinderGeometry args={[.06, .2, .78, 14, 1, true]} /></mesh>
    <mesh position={[0, .38, 0]} material={materials.dark}><cylinderGeometry args={[.05, .17, .74, 10]} /></mesh>
    {[.66, .74].map((y) => <mesh key={y} position={[0, y, 0]} material={materials.gold}><cylinderGeometry args={[.05, .05, .03, 12]} /></mesh>)}
  </group>;
}

/** The Golden Snitch: polished sphere and blurred silver wings, darting on a lazy path. */
export function Snitch({ at, motion }: { at: Vec3; motion: boolean }) {
  const { materials } = useMaterials(); const body = useRef<Group>(null); const wings = useRef<Group>(null); const time = useRef(0);
  const wing = useMemo(() => { const s = new Shape(); s.moveTo(0, 0); s.bezierCurveTo(.08, .06, .22, .07, .3, .02); s.bezierCurveTo(.2, -.01, .1, -.04, 0, 0); return s; }, []);
  useFrame((_, delta) => {
    if (!motion) return; time.current += Math.min(delta, .05); const t = time.current;
    if (body.current) body.current.position.set(at[0] + Math.sin(t * .5) * 1.1 + Math.sin(t * 1.7) * .15, at[1] + Math.sin(t * .9) * .35, at[2] + Math.cos(t * .4) * .7);
    wings.current?.children.forEach((w, i) => { w.rotation.x = Math.sin(t * 38) * .9 * (i ? 1 : -1); });
  });
  return <group ref={body} position={at}>
    <mesh material={materials.gold}><sphereGeometry args={[.075, 20, 14]} /></mesh>
    <mesh rotation-x={Math.PI / 2} material={materials.gold}><torusGeometry args={[.076, .006, 6, 24]} /></mesh>
    <group ref={wings}>{[-1, 1].map((s) => <group key={s} position={[s * .06, .02, 0]} scale-x={s}><mesh><shapeGeometry args={[wing, 12]} /><meshStandardMaterial color="#e9e4d4" metalness={.4} roughness={.3} side={DoubleSide} transparent opacity={.85} /></mesh></group>)}</group>
  </group>;
}

/** Wrought-iron wall sconce with a lit taper, replacing plain lantern boxes on side walls. */
export function Sconce({ at, rotation = 0, motion }: { at: Vec3; rotation?: number; motion: boolean }) {
  const flame = useMemo(() => new Float32Array([0, .48, .34]), []); const ref = useRef<Mesh>(null); const time = useRef(at[2]);
  useFrame((_, delta) => { if (!motion || !ref.current) return; time.current += Math.min(delta, .05); ref.current.scale.setScalar(1 + Math.sin(time.current * 9) * .06); });
  const { materials, glow } = useMaterials();
  return <group position={at} rotation-y={rotation}>
    <Box at={[0, 0, 0]} size={[.2, .5, .05]} material="metal" />
    <Tube points={[[0, -.12, .02], [0, -.05, .25], [0, .12, .34]]} radius={.025} material="metal" />
    <mesh position={[0, .14, .34]} material={materials.metal}><cylinderGeometry args={[.09, .05, .05, 14]} /></mesh>
    <mesh position={[0, .29, .34]} material={materials.wax}><cylinderGeometry args={[.035, .04, .26, 10]} /></mesh>
    <Flames positions={flame} size={.55} />
    <mesh ref={ref} position={[0, .45, .3]}><planeGeometry args={[1.5, 1.5]} /><meshBasicMaterial map={glow} color="#ff9e4a" transparent opacity={.16} blending={AdditiveBlending} depthWrite={false} /></mesh>
  </group>;
}
