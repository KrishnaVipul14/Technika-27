"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LetterFx } from "./letter-timeline";

export type Tier = "desktop" | "tablet" | "mobile";

/** Deterministic PRNG so procedural textures look identical on every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!, rng(seed));
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const woodTexture = () => canvasTexture(1024, 512, (g, r) => {
  g.fillStyle = "#3b2313"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 280; i++) {
    const y = r() * 512, amp = 2 + r() * 7, freq = 0.003 + r() * 0.01, ph = r() * 6;
    g.strokeStyle = `hsla(${20 + r() * 12}, 48%, ${14 + r() * 24}%, ${0.05 + r() * 0.13})`;
    g.lineWidth = 0.6 + r() * 2.4;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 16) { const yy = y + Math.sin(x * freq + ph) * amp; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
    g.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const x = r() * 1024, y = r() * 512, grd = g.createRadialGradient(x, y, 1, x, y, 30);
    grd.addColorStop(0, "rgba(18,9,3,.55)"); grd.addColorStop(1, "rgba(18,9,3,0)");
    g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, 36, 12, 0, 0, Math.PI * 2); g.fill();
  }
  const v = g.createLinearGradient(0, 0, 0, 512);
  v.addColorStop(0, "rgba(0,0,0,.28)"); v.addColorStop(0.5, "rgba(255,200,140,.04)"); v.addColorStop(1, "rgba(0,0,0,.32)");
  g.fillStyle = v; g.fillRect(0, 0, 1024, 512);
}, 11);

const stoneTexture = () => {
  const t = canvasTexture(512, 512, (g, r) => {
    g.fillStyle = "#121116"; g.fillRect(0, 0, 512, 512);
    const rows = 8, bh = 512 / rows;
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -46 : 0;
      while (x < 512) {
        const bw = 72 + r() * 64;
        g.fillStyle = `hsl(${28 + r() * 22}, 7%, ${8 + r() * 7}%)`;
        g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
        for (let s = 0; s < 36; s++) { g.fillStyle = `rgba(255,255,255,${r() * 0.035})`; g.fillRect(x + r() * bw, row * bh + r() * bh, 2, 2); }
        x += bw;
      }
    }
  }, 5);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 2.5);
  return t;
};

const glowTexture = (inner: string) => canvasTexture(64, 64, (g) => {
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, inner); grd.addColorStop(0.35, "rgba(255,190,110,.45)"); grd.addColorStop(1, "rgba(255,160,80,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
}, 1);

const beamAlpha = () => canvasTexture(4, 128, (g) => {
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, "#000"); grd.addColorStop(0.15, "#777"); grd.addColorStop(0.7, "#333"); grd.addColorStop(1, "#000");
  g.fillStyle = grd; g.fillRect(0, 0, 4, 128);
}, 1, false);

const STARS = Array.from({ length: 40 }, (_, i) => { const r = rng(i + 90); return [r() * 256, r() * 300, 0.3 + r() * 0.9] as const; });

function drawSky(g: CanvasRenderingContext2D, owl: number, wing: number) {
  const sky = g.createLinearGradient(0, 0, 0, 384);
  sky.addColorStop(0, "#050a1a"); sky.addColorStop(0.6, "#0e1b3c"); sky.addColorStop(1, "#1a2b55");
  g.fillStyle = sky; g.fillRect(0, 0, 256, 384);
  for (const [x, y, s] of STARS) { g.fillStyle = `rgba(220,230,255,${0.25 + s * 0.4})`; g.fillRect(x, y, s * 1.6, s * 1.6); }
  const halo = g.createRadialGradient(172, 104, 10, 172, 104, 110);
  halo.addColorStop(0, "rgba(190,205,255,.45)"); halo.addColorStop(1, "rgba(190,205,255,0)");
  g.fillStyle = halo; g.fillRect(0, 0, 256, 384);
  g.fillStyle = "#e8edfb"; g.beginPath(); g.arc(172, 104, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(150,160,190,.25)";
  for (const [x, y, r] of [[164, 96, 7], [182, 114, 5], [176, 92, 3.5]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "rgba(120,140,200,.09)";
  g.beginPath(); g.ellipse(90, 180, 110, 16, -0.08, 0, Math.PI * 2); g.fill();
  if (owl <= 0 || owl >= 1) return;
  // A silhouette crossing the moonlit window: body, head, two beating wings.
  const x = -50 + owl * 360, y = 210 - Math.sin(owl * Math.PI) * 80, w = wing * 15;
  g.fillStyle = "rgba(3,4,10,.93)";
  g.beginPath(); g.ellipse(x, y, 12, 7, -0.15, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x + 11, y - 4, 5.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(x - 5, y - 2); g.quadraticCurveTo(x - 1, y - 14 - w, x + 9, y - 24 - w * 1.2); g.quadraticCurveTo(x + 4, y - 8, x + 6, y); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x - 3, y); g.quadraticCurveTo(x - 14, y - 10 - w * 0.7, x - 26, y - 17 - w); g.quadraticCurveTo(x - 10, y - 4, x - 1, y + 2); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x - 11, y); g.lineTo(x - 19, y + 5); g.lineTo(x - 10, y + 4); g.closePath(); g.fill();
}

function archGeometry(w: number, h: number) {
  const s = new THREE.Shape(), hs = h - w * 0.62;
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hs);
  s.quadraticCurveTo(w / 2, h * 0.93, 0, h); s.quadraticCurveTo(-w / 2, h * 0.93, -w / 2, hs); s.closePath();
  const geo = new THREE.ShapeGeometry(s, 24);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, pos.getY(i) / h);
  geo.translate(0, -h / 2, 0);
  return geo;
}

function Window({ fx, x }: { fx: LetterFx; x: number }) {
  const sky = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 384;
    drawSky(c.getContext("2d")!, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const glass = useMemo(() => archGeometry(1.5, 2.3), []);
  const frame = useMemo(() => archGeometry(1.78, 2.5), []);
  const drawn = useRef(-1), material = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => () => { sky.dispose(); glass.dispose(); frame.dispose(); }, [sky, glass, frame]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // the scripted pass during arrival, then an occasional quiet pass every 30s
    const idle = t > 30 ? ((t - 30) % 30) / 3.2 : 2;
    const owl = fx.owl > 0 && fx.owl < 1 ? fx.owl : idle;
    const map = material.current?.map; if (!map) return;
    const active = owl > 0 && owl < 1;
    if (!active && drawn.current === 0) return;
    drawSky((map.image as HTMLCanvasElement).getContext("2d")!, active ? owl : 0, Math.sin(t * 15));
    map.needsUpdate = true; drawn.current = active ? 1 : 0;
  });
  return (
    <group position={[x, 2.3, -3.17]}>
      <mesh geometry={frame} position={[0, -0.1, -0.02]}><meshStandardMaterial color="#25222a" roughness={0.92} /></mesh>
      <mesh geometry={glass}><meshBasicMaterial ref={material} map={sky} toneMapped={false} /></mesh>
      <mesh position={[0, -0.08, 0.02]}><boxGeometry args={[0.05, 2.2, 0.05]} /><meshStandardMaterial color="#0d0c10" roughness={0.8} /></mesh>
      <mesh position={[0, -0.25, 0.02]}><boxGeometry args={[1.5, 0.05, 0.05]} /><meshStandardMaterial color="#0d0c10" roughness={0.8} /></mesh>
      <mesh position={[0, -1.2, 0.08]}><boxGeometry args={[1.9, 0.1, 0.22]} /><meshStandardMaterial color="#2c2930" roughness={0.9} /></mesh>
    </group>
  );
}

function Moonbeam({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const alpha = useMemo(() => beamAlpha(), []);
  const { geo, position, quaternion } = useMemo(() => {
    const dir = to.clone().sub(from), length = dir.length();
    const g = new THREE.CylinderGeometry(0.5, 1.25, length, 24, 1, true);
    return { geo: g, position: from.clone().add(to).multiplyScalar(0.5), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize()) };
  }, [from, to]);
  useEffect(() => () => { alpha.dispose(); geo.dispose(); }, [alpha, geo]);
  return (
    <mesh geometry={geo} position={position} quaternion={quaternion}>
      <meshBasicMaterial color="#9fb6ff" alphaMap={alpha} transparent opacity={0.075} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Candle({ position, height, seed }: { position: [number, number, number]; height: number; seed: number }) {
  const flame = useMemo(() => glowTexture("rgba(255,244,214,1)"), []);
  const light = useRef<THREE.PointLight>(null), sprite = useRef<THREE.Sprite>(null);
  useEffect(() => () => flame.dispose(), [flame]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 3.1;
    const n = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1) * 0.3 + Math.sin(t * 23.7) * 0.2;
    if (light.current) light.current.intensity = 3.6 * (1 + n * 0.12);
    if (sprite.current) sprite.current.scale.set(0.13 + n * 0.008, 0.26 + n * 0.03, 1);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.16, 0.19, 0.06, 24]} /><meshStandardMaterial color="#7a5a2c" metalness={0.75} roughness={0.35} /></mesh>
      <mesh position={[0, height / 2 + 0.06, 0]} castShadow><cylinderGeometry args={[0.07, 0.075, height, 20]} /><meshStandardMaterial color="#e6dac0" roughness={0.6} emissive="#3a2208" emissiveIntensity={0.25} /></mesh>
      <sprite ref={sprite} position={[0, height + 0.18, 0]}><spriteMaterial map={flame} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
      <pointLight ref={light} position={[0, height + 0.2, 0]} color="#ffb05a" distance={7} decay={1.6} />
    </group>
  );
}

function Dust({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const map = useMemo(() => glowTexture("rgba(255,250,235,1)"), []);
  const geometry = useMemo(() => {
    const r = rng(3), base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { base[i * 3] = (r() - 0.5) * 6.5; base[i * 3 + 1] = 0.95 + r() * 3.3; base[i * 3 + 2] = -2.6 + r() * 4.6; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
    g.userData.base = base;
    return g;
  }, [count]);
  useEffect(() => () => { map.dispose(); geometry.dispose(); }, [map, geometry]);
  useFrame(({ clock }) => {
    const g = points.current?.geometry; if (!g) return;
    const base = g.userData.base as Float32Array, pos = g.attributes.position.array as Float32Array, t = clock.elapsedTime * 0.16;
    for (let i = 0; i < pos.length; i += 3) {
      const s = i * 0.37;
      pos[i] = base[i] + Math.sin(t + s) * 0.14;
      pos[i + 1] = base[i + 1] + Math.sin(t * 0.7 + s * 1.7) * 0.2;
      pos[i + 2] = base[i + 2] + Math.cos(t * 0.5 + s) * 0.1;
    }
    g.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial map={map} size={0.035} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} color="#f6dfb4" opacity={0.6} />
    </points>
  );
}

function CameraRig({ fx }: { fx: LetterFx }) {
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock, size }) => {
    const d = fx.dolly, t = clock.elapsedTime;
    camera.position.set(Math.sin(t * 0.21) * 0.04, 3.2 - 0.8 * d + Math.sin(t * 0.17) * 0.02, 8.6 - 3.3 * d);
    look.set(0, 1.25 - 0.3 * d, 0.2 * d);
    camera.lookAt(look);
    const aspect = size.width / size.height, fov = aspect < 0.8 ? 56 : aspect < 1.2 ? 47 : 40;
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  });
  return null;
}

function Scene({ fx, tier }: { fx: LetterFx; tier: Tier }) {
  const wood = useMemo(() => woodTexture(), []), stone = useMemo(() => stoneTexture(), []);
  const glow = useRef<THREE.PointLight>(null), moon = useRef<THREE.DirectionalLight>(null);
  const { size } = useThree();
  const shadows = tier === "desktop";
  // Keep the window inside the frame on portrait screens.
  const aspect = size.width / size.height, vfov = aspect < 0.8 ? 56 : aspect < 1.2 ? 47 : 40;
  const halfWidth = Math.tan((vfov * Math.PI) / 360) * aspect * 8.8;
  const windowX = -Math.min(2.7, halfWidth * 0.55);
  const beam = useMemo(() => ({ from: new THREE.Vector3(windowX, 2.5, -3.1), to: new THREE.Vector3(-0.2, 0.86, 0.7) }), [windowX]);
  useEffect(() => () => { wood.dispose(); stone.dispose(); }, [wood, stone]);
  useEffect(() => {
    const light = moon.current; if (!light) return;
    light.target.position.set(0, 0.86, 0.5); light.target.updateMatrixWorld();
  }, []);
  useFrame(() => { if (glow.current) glow.current.intensity = fx.glow * 6; });
  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 8, 18]} />
      <CameraRig fx={fx} />
      <ambientLight intensity={0.3} color="#4f5c86" />
      <hemisphereLight args={["#34436e", "#1a0f08", 0.35]} />
      <directionalLight ref={moon} position={[windowX - 1.6, 5.5, -6]} intensity={2.1} color="#a9bcff" castShadow={shadows}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.0004} />
      <pointLight ref={glow} position={[0, 1.7, 0.9]} color="#ffc777" distance={5} decay={1.5} intensity={0} />

      <mesh position={[0, 3, -3.25]} receiveShadow><planeGeometry args={[20, 10]} /><meshStandardMaterial map={stone} roughness={0.95} /></mesh>
      <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[20, 20]} /><meshStandardMaterial color="#0b0807" roughness={1} /></mesh>
      <Window fx={fx} x={windowX} />
      <Moonbeam from={beam.from} to={beam.to} />

      <mesh position={[0, 0.78, 1.2]} receiveShadow castShadow><boxGeometry args={[7.6, 0.16, 5.4]} /><meshStandardMaterial map={wood} roughness={0.62} metalness={0.02} /></mesh>
      <Candle position={[2.25, 0.86, -0.75]} height={0.55} seed={1} />
      {tier !== "mobile" && <Candle position={[2.62, 0.86, -0.3]} height={0.36} seed={2} />}
      <mesh position={[-1.75, 0.99, 1.15]} castShadow><cylinderGeometry args={[0.13, 0.15, 0.24, 24]} /><meshStandardMaterial color="#0c0f15" roughness={0.12} metalness={0.4} /></mesh>
      <group position={[-2.55, 0.86, -0.55]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 0.07, 0]} castShadow receiveShadow><boxGeometry args={[1.1, 0.14, 0.8]} /><meshStandardMaterial color="#4a1b1d" roughness={0.75} /></mesh>
        <mesh position={[0.04, 0.2, 0.02]} rotation={[0, -0.12, 0]} castShadow><boxGeometry args={[1, 0.12, 0.74]} /><meshStandardMaterial color="#1e2c22" roughness={0.8} /></mesh>
        <mesh position={[0.02, 0.07, 0.402]}><boxGeometry args={[1.04, 0.1, 0.01]} /><meshStandardMaterial color="#d6c49b" roughness={0.9} /></mesh>
      </group>
      <Dust count={tier === "desktop" ? 220 : tier === "tablet" ? 130 : 60} />
    </>
  );
}

/** Rendered only during the letter phase; unmounting releases the WebGL context before /account boots its own. */
export default function LetterRoom({ fx, tier }: { fx: LetterFx; tier: Tier }) {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0 }}
      dpr={tier === "desktop" ? [1, 2] : [1, 1.5]}
      shadows={tier === "desktop" ? { type: THREE.PCFShadowMap } : false}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0, 3.2, 8.6], fov: 40, near: 0.1, far: 40 }}
    >
      <Scene fx={fx} tier={tier} />
    </Canvas>
  );
}
