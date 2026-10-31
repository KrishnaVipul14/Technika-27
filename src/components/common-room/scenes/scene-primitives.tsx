import { createContext, useContext, useMemo, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { AdditiveBlending, BoxGeometry, CanvasTexture, CatmullRomCurve3, Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, Path, RepeatWrapping, Shape, SphereGeometry, SRGBColorSpace, Vector3, type Material, type Group } from "three";
import type { RoomPalette, Vec3 } from "@/lib/common-room/config";

/** Local, generated surface maps. These are prototype materials, not licensed PBR scans. */
function surfaceTexture(kind: "stone" | "wood" | "marble" | "glow") {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  if (kind === "glow") {
    const gradient = ctx.createRadialGradient(128, 128, 2, 128, 128, 126);
    gradient.addColorStop(0, "#fff"); gradient.addColorStop(.18, "#ffffffdd"); gradient.addColorStop(1, "#ffffff00");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
  } else {
    const image = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const noise = Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1;
      const grain = Math.sin(x * .2 + Math.sin(y * .016) * 4) * 13 + Math.sin(x * 1.5 + y * .01) * 5;
      const vein = Math.pow(Math.abs(Math.sin(x * .025 + Math.sin(y * .025) * 2.1 + Math.sin((x + y) * .046))), 28);
      const value = kind === "wood" ? 170 + grain + noise * 15 : kind === "marble" ? 180 - vein * 74 + noise * 8 : 170 + noise * 29;
      const i = (y * 256 + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value; image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping; texture.anisotropy = 4;
  return texture;
}
function createResources(palette: RoomPalette) {
  const stone = surfaceTexture("stone"), wood = surfaceTexture("wood"), marble = surfaceTexture("marble"), glow = surfaceTexture("glow");
  const materials = {
    stone: new MeshStandardMaterial({ color: palette.stone, map: stone, bumpMap: stone, bumpScale: .075, roughness: .93 }),
    trim: new MeshStandardMaterial({ color: palette.trim, map: stone, bumpMap: stone, bumpScale: .035, roughness: .78 }),
    wood: new MeshStandardMaterial({ color: palette.wood, map: wood, bumpMap: wood, bumpScale: .03, roughness: .68 }),
    metal: new MeshStandardMaterial({ color: palette.metal, metalness: .62, roughness: .36 }),
    fabric: new MeshStandardMaterial({ color: palette.fabric, map: stone, roughness: .98 }),
    floor: new MeshStandardMaterial({ color: palette.floor, map: marble, roughness: .29, metalness: .2 }),
    paper: new MeshStandardMaterial({ color: "#d9c49d", map: stone, roughness: .95, side: DoubleSide }),
    dark: new MeshStandardMaterial({ color: "#0b100e", roughness: .95 }),
    book: new MeshStandardMaterial({ color: "#ffffff", roughness: .81 }),
    leaf: new MeshStandardMaterial({ color: "#5e7543", roughness: .8, side: DoubleSide }),
  };
  return { materials, box: new BoxGeometry(1, 1, 1), sphere: new SphereGeometry(1, 16, 10), glow, textures: [stone, wood, marble, glow] };
}
type Resources = ReturnType<typeof createResources>;
const MaterialContext = createContext<Resources | null>(null);
export function RoomMaterials({ palette, children }: { palette: RoomPalette; children: ReactNode }) {
  const resources = useMemo(() => createResources(palette), [palette]);
  useEffect(() => () => { Object.values(resources.materials).forEach((material) => material.dispose()); resources.textures.forEach((texture) => texture.dispose()); resources.box.dispose(); resources.sphere.dispose(); }, [resources]);
  return <MaterialContext.Provider value={resources}>{children}</MaterialContext.Provider>;
}
export function useMaterials() { const resources = useContext(MaterialContext); if (!resources) throw new Error("Room materials are not mounted"); return resources; }
export type MaterialName = keyof Resources["materials"];
export function Box({ at, size, material = "stone", rotation = [0, 0, 0] }: { at: Vec3; size: Vec3; material?: MaterialName; rotation?: Vec3 }) {
  const { materials, box } = useMaterials();
  return <mesh geometry={box} material={materials[material]} position={at} scale={size} rotation={rotation} castShadow receiveShadow dispose={null} />;
}
export type Block = { at: Vec3; size: Vec3; color?: string; rotation?: Vec3 };
export function Blocks({ blocks, material = "stone" }: { blocks: Block[]; material?: MaterialName }) {
  const { box, materials } = useMaterials(); const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new Object3D(); const color = new Color();
    blocks.forEach((block, i) => { object.position.set(...block.at); object.scale.set(...block.size); object.rotation.set(...(block.rotation || [0, 0, 0])); object.updateMatrix(); ref.current!.setMatrixAt(i, object.matrix); ref.current!.setColorAt(i, color.set(block.color || "#ffffff")); });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [blocks]);
  return <instancedMesh ref={ref} args={[box, materials[material], blocks.length]} castShadow receiveShadow dispose={null} />;
}
export function archShape(width: number, height: number, base = 0, pointed = true) {
  const shape = new Shape(); const half = width / 2;
  shape.moveTo(-half, base); shape.lineTo(-half, height * .62);
  if (pointed) { shape.quadraticCurveTo(-half, height * .84, 0, height); shape.quadraticCurveTo(half, height * .84, half, height * .62); }
  else shape.absarc(0, height - half, half, Math.PI, 0, true);
  shape.lineTo(half, base); shape.closePath(); return shape;
}
export function Arch({ at = [0, 0, 0], width = 3, height = 5, thickness = .22, depth = .35, material = "trim", pointed = true }: { at?: Vec3; width?: number; height?: number; thickness?: number; depth?: number; material?: MaterialName; pointed?: boolean }) {
  const { materials } = useMaterials();
  const shape = useMemo(() => { const result = archShape(width, height, 0, pointed); result.holes.push(new Path(archShape(width - thickness * 2, height - thickness, .12, pointed).getPoints(32))); return result; }, [width, height, thickness, pointed]);
  return <mesh position={at} material={materials[material]} castShadow receiveShadow><extrudeGeometry args={[shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .035, bevelThickness: .035, curveSegments: 16 }]} /></mesh>;
}
export function Tube({ points, radius = .07, material = "metal" }: { points: Vec3[]; radius?: number; material?: MaterialName }) {
  const { materials } = useMaterials(); const curve = useMemo(() => new CatmullRomCurve3(points.map((point) => new Vector3(...point))), [points]);
  return <mesh material={materials[material]} castShadow><tubeGeometry args={[curve, 40, radius, 7, false]} /></mesh>;
}
export function Floor({ wood = false }: { wood?: boolean }) {
  const blocks = useMemo<Block[]>(() => Array.from({ length: 18 * 35 }, (_, i) => { const x = i % 18, z = Math.floor(i / 18); return { at: [x - 8.5, -.11, z - 8], size: [.985, .16, .985], color: (x + z) % 2 ? "#bcc3b3" : "#e0dfcf" }; }), []);
  return <><Box at={[0, -.26, 9]} size={[20, .14, 38]} material="dark" /><Blocks blocks={blocks} material={wood ? "wood" : "floor"} /></>;
}
export function Sofa({ at, rotation = 0, width = 4 }: { at: Vec3; rotation?: number; width?: number }) {
  const { materials } = useMaterials();
  return <group position={at} rotation-y={rotation}>
    <Box at={[0, .43, 0]} size={[width, .5, 1.5]} material="wood" />
    <RoundedBox args={[width - .12, 1.15, .43]} radius={.12} smoothness={2} position={[0, 1.25, -.55]} material={materials.fabric} castShadow />
    {[-1, 1].map((side) => <group key={side}><RoundedBox args={[.36, .7, 1.5]} radius={.12} smoothness={2} position={[side * width / 2, .98, 0]} material={materials.fabric} castShadow />{[-.48, .48].map((z) => <Box key={z} at={[side * (width / 2 - .3), .2, z]} size={[.15, .4, .15]} material="wood" />)}</group>)}
    {[-1, 0, 1].map((i) => <RoundedBox key={i} args={[(width - .6) / 3 - .025, .27, 1.12]} radius={.065} smoothness={2} position={[i * (width - .6) / 3, .82, .13]} material={materials.fabric} castShadow />)}
    <Box at={[0, 1.84, -.57]} size={[width, .095, .2]} material="wood" />
  </group>;
}
export function Table({ at = [0, 0, 1], width = 2.5 }: { at?: Vec3; width?: number }) {
  const { materials } = useMaterials();
  return <group position={at}><RoundedBox args={[width, .18, 1.35]} radius={.07} smoothness={2} position={[0, .95, 0]} material={materials.wood} castShadow receiveShadow />{[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}-${z}`} at={[x * (width / 2 - .23), .46, z * .45]} size={[.13, .95, .13]} material="wood" />))}<Box at={[0, 1.1, 0]} size={[.5, .12, .37]} material="paper" /><Box at={[.12, 1.18, .07]} size={[.58, .075, .41]} material="wood" /></group>;
}
export function Motes({ color = "#cfdcbd", count = 50, size = .045, at = [0, 3, 0], area = [13, 7, 12], speed = .1, motion = true }: { color?: string; count?: number; size?: number; at?: Vec3; area?: Vec3; speed?: number; motion?: boolean }) {
  const { glow } = useMaterials();
  const positions = useMemo(() => new Float32Array(Array.from({ length: count * 3 }, (_, i) => (Math.sin(i * 73.79 + 1) * 43758.54 % 1) * area[i % 3] / 2)), [count, area]);
  const ref = useRef<import("three").Points>(null);
  useFrame((_, delta) => { if (!motion || !ref.current) return; const attribute = ref.current.geometry.attributes.position; for (let i = 0; i < count; i++) { let y = attribute.getY(i) + Math.min(delta, .05) * speed * (1 + i % 4 * .1); if (y > area[1] / 2) y = -area[1] / 2; attribute.setY(i, y); } attribute.needsUpdate = true; });
  return <points ref={ref} position={at}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color={color} map={glow} size={size} transparent opacity={.55} blending={AdditiveBlending} depthWrite={false} /></points>;
}
export function Lantern({ at, motion = true }: { at: Vec3; motion?: boolean }) {
  const { glow } = useMaterials(); const group = useRef<Group>(null); const time = useRef(0);
  useFrame((_, delta) => { if (!motion || !group.current) return; time.current += Math.min(delta, .05); group.current.scale.y = 1 + Math.sin(time.current * 6) * .025; });
  return <group position={at}><Box at={[0, -.2, 0]} size={[.36, .08, .36]} material="metal" /><Box at={[0, .4, 0]} size={[.36, .08, .36]} material="metal" />{[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}-${z}`} at={[x * .15, .1, z * .15]} size={[.035, .6, .035]} material="metal" />))}<group ref={group}><mesh position={[0, .1, 0]}><cylinderGeometry args={[.09, .07, .4, 10]} /><meshBasicMaterial color="#ffe7a9" /></mesh><mesh position={[0, .1, .2]}><planeGeometry args={[1.4, 1.7]} /><meshBasicMaterial map={glow} color="#ffac55" transparent opacity={.2} blending={AdditiveBlending} depthWrite={false} /></mesh></group></group>;
}
export function Orb({ at, scale = [1, 1, 1], material = "metal" }: { at: Vec3; scale?: Vec3; material?: MaterialName }) {
  const { sphere, materials } = useMaterials(); return <mesh geometry={sphere} material={materials[material] as Material} position={at} scale={scale} dispose={null} castShadow />;
}
