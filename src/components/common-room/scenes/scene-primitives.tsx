import { createContext, useContext, useMemo, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { AdditiveBlending, BoxGeometry, CanvasTexture, CatmullRomCurve3, Color, DoubleSide, InstancedMesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Path, RepeatWrapping, Shape, SphereGeometry, SRGBColorSpace, Vector3, type Material, type Group } from "three";
import type { RoomPalette, Vec3 } from "@/lib/common-room/config";

/** Deterministic hash noise so generated maps are identical between visits. */
const hash = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
let lattice: Float32Array | null = null; // Precomputed value-noise lattice: table lookups instead of per-sample trig.
function smoothNoise(x: number, y: number) {
  if (!lattice) { lattice = new Float32Array(256 * 256); for (let i = 0; i < lattice.length; i++) lattice[i] = hash(i & 255, i >> 8); }
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) << 8, y1 = ((yi + 1) & 255) << 8;
  const a = lattice[y0 + x0], b = lattice[y0 + x1], c = lattice[y1 + x0], d = lattice[y1 + x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) => smoothNoise(x, y) * .5 + smoothNoise(x * 2.1, y * 2.1) * .27 + smoothNoise(x * 4.3, y * 4.3) * .15 + smoothNoise(x * 8.7, y * 8.7) * .08;

/**
 * Generated pixels are cached per page: RoomMaterials lives inside Suspense, and React discards
 * uncommitted memo work on every suspend/retry, so regenerating here would stall the main thread.
 */
const surfaceCanvases = new Map<string, HTMLCanvasElement>();
export function cachedCanvas(key: string, draw: () => HTMLCanvasElement) {
  let canvas = surfaceCanvases.get(key);
  if (!canvas) { canvas = draw(); surfaceCanvases.set(key, canvas); }
  return canvas;
}
/** Local, generated surface maps. These are prototype materials, not licensed PBR scans. */
function surfaceTexture(kind: "stone" | "wood" | "marble" | "glow" | "cloth") {
  const texture = new CanvasTexture(cachedCanvas(kind, () => drawSurface(kind))); texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping; texture.anisotropy = 8;
  return texture;
}
function drawSurface(kind: "stone" | "wood" | "marble" | "glow" | "cloth") {
  const size = kind === "glow" ? 128 : 512;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (kind === "glow") {
    const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 63);
    gradient.addColorStop(0, "#fff"); gradient.addColorStop(.18, "#ffffffdd"); gradient.addColorStop(1, "#ffffff00");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size);
  } else {
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let value: number;
      if (kind === "stone") {
        // Ashlar courses: 4 rows, staggered blocks of varying width, recessed mortar and chipped edges.
        const row = Math.floor(y / 128), ry = y % 128, offset = row % 2 ? 96 : 0, widths = [224, 160, 192, 256];
        const blockW = widths[row % 4], bx = (x + offset + row * 37) % 512, col = Math.floor(bx / blockW) + row * 7, rx = bx % blockW;
        const edge = Math.min(ry, 128 - ry, rx, blockW - rx) + (fbm(x * .05, y * .05) - .5) * 6;
        const tone = hash(col, row) * 26 - 13, grit = fbm(x * .012 + col * 3.1, y * .012) * 34 + fbm(x * .035, y * .035) * 10;
        value = edge < 3.5 ? 78 + grit * .25 : 152 + tone + grit - Math.max(0, 8 - edge) * 4;
      } else if (kind === "wood") {
        const warp = fbm(x * .006, y * .05) * 30, ring = Math.sin((y + warp) * .31 + fbm(x * .02, y * .02) * 6);
        const plank = Math.floor(y / 128), seam = y % 128 < 2 ? -70 : 0;
        value = 150 + ring * 14 + fbm(x * .01, y * .4) * 34 + hash(plank, 3) * 22 + seam;
      } else if (kind === "cloth") {
        const weave = (Math.sin(x * 1.6) * Math.sin(y * 1.6) > 0 ? 8 : -8);
        value = 196 + weave + fbm(x * .03, y * .03) * 26 + hash(x, y) * 10;
      } else {
        const vein = Math.pow(Math.abs(Math.sin(x * .0125 + fbm(x * .008, y * .008) * 6)), 26);
        value = 190 - vein * 80 + fbm(x * .02, y * .02) * 28;
      }
      const i = (y * size + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.max(0, Math.min(255, value)); image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }
  return canvas;
}
/**
 * Projects a map in world space (triplanar) so masonry keeps a real-world scale on every stretched
 * box, arch and wall, and derives a screen-space bump from the same sample for mortar relief.
 */
function worldSpaceMasonry(material: MeshStandardMaterial, scale: number, relief: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.tpScale = { value: scale }; shader.uniforms.tpRelief = { value: relief };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTpPos;\nvarying vec3 vTpNormal;")
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
        vec4 tpWorld = vec4(transformed, 1.0); vec3 tpN = objectNormal;
        #ifdef USE_INSTANCING
          tpWorld = instanceMatrix * tpWorld; tpN = mat3(instanceMatrix) * tpN;
        #endif
        vTpPos = (modelMatrix * tpWorld).xyz; vTpNormal = normalize(mat3(modelMatrix) * tpN);`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vTpPos; varying vec3 vTpNormal; uniform float tpScale; uniform float tpRelief;
        vec4 tpSample(sampler2D tex) {
          vec3 w = pow(abs(normalize(vTpNormal)), vec3(6.0)); w /= (w.x + w.y + w.z);
          vec3 p = vTpPos * tpScale;
          return texture2D(tex, p.zy) * w.x + texture2D(tex, p.xz) * w.y + texture2D(tex, p.xy) * w.z;
        }`)
      .replace("#include <map_fragment>", `vec4 tpTexel = tpSample(map); diffuseColor *= tpTexel;`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        {
          float tpH = tpTexel.r; vec3 tpSurf = -vViewPosition;
          vec3 sx = dFdx(tpSurf), sy = dFdy(tpSurf), r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1) * faceDirection; vec2 dH = vec2(dFdx(tpH), dFdy(tpH)) * tpRelief;
          vec3 grad = sign(det) * (dH.x * r1 + dH.y * r2);
          normal = normalize(abs(det) * normal - grad);
        }`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (0.55 - tpTexel.r) * 0.35, 0.0, 1.0);`);
  };
  material.customProgramCacheKey = () => `tp-masonry-${scale}-${relief}`;
  return material;
}
function createResources(palette: RoomPalette) {
  const stone = surfaceTexture("stone"), wood = surfaceTexture("wood"), marble = surfaceTexture("marble"), glow = surfaceTexture("glow"), cloth = surfaceTexture("cloth");
  const fabricColor = new Color(palette.fabric);
  const materials = {
    stone: worldSpaceMasonry(new MeshStandardMaterial({ color: palette.stone, map: stone, roughness: .9 }), .4, .55),
    trim: worldSpaceMasonry(new MeshStandardMaterial({ color: palette.trim, map: stone, roughness: .78 }), .62, .3),
    wood: new MeshStandardMaterial({ color: palette.wood, map: wood, bumpMap: wood, bumpScale: .6, roughness: .62 }),
    metal: new MeshStandardMaterial({ color: palette.metal, metalness: .9, roughness: .32 }),
    gold: new MeshStandardMaterial({ color: "#c9a04a", metalness: 1, roughness: .28 }),
    fabric: new MeshPhysicalMaterial({ color: palette.fabric, map: cloth, roughness: .92, sheen: 1, sheenRoughness: .45, sheenColor: fabricColor.clone().offsetHSL(0, -.05, .22) }),
    floor: new MeshStandardMaterial({ color: palette.floor, map: marble, roughness: .22, metalness: .15 }),
    paper: new MeshStandardMaterial({ color: "#dccaa2", map: cloth, roughness: .95, side: DoubleSide }),
    dark: new MeshStandardMaterial({ color: "#0b100e", roughness: .95 }),
    book: new MeshStandardMaterial({ color: "#ffffff", map: cloth, roughness: .74 }),
    leaf: new MeshStandardMaterial({ color: "#5e7543", roughness: .8, side: DoubleSide }),
    wax: new MeshStandardMaterial({ color: "#d9c79f", roughness: .5, emissive: "#ff9f4a", emissiveIntensity: .06 }),
    flame: new MeshBasicMaterial({ color: "#ffd796", map: glow, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  };
  return { materials, box: new BoxGeometry(1, 1, 1), sphere: new SphereGeometry(1, 16, 10), glow, textures: [stone, wood, marble, glow, cloth] };
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
/** Small instanced spheres: Chesterfield tufting buttons, nailhead trim, rosettes. */
export function Studs({ points, radius = .03, material = "metal", flatten = 1 }: { points: Vec3[]; radius?: number; material?: MaterialName; flatten?: number }) {
  const { sphere, materials } = useMaterials(); const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return; const object = new Object3D();
    points.forEach((point, i) => { object.position.set(...point); object.scale.set(radius, radius, radius * flatten); object.updateMatrix(); ref.current!.setMatrixAt(i, object.matrix); });
    ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere();
  }, [points, radius, flatten]);
  return <instancedMesh ref={ref} args={[sphere, materials[material], points.length]} dispose={null} />;
}
/** Chesterfield: arms level with the back, rolled tops, deep diamond tufting and brass nailheads. */
export function Sofa({ at, rotation = 0, width = 4 }: { at: Vec3; rotation?: number; width?: number }) {
  const { materials } = useMaterials();
  const half = width / 2;
  const buttons = useMemo<Vec3[]>(() => [0, 1, 2].flatMap((row) => { const step = .42, n = Math.floor((width - .5) / step); return Array.from({ length: n - (row % 2) }, (_, i): Vec3 => [-(n - 1) * step / 2 + i * step + (row % 2) * step / 2, 1.02 + row * .2, -.355]); }), [width]);
  const nails = useMemo<Vec3[]>(() => [-1, 1].flatMap((side) => [
    ...Array.from({ length: 12 }, (_, i): Vec3 => [side * (half + .05) + Math.cos(i * Math.PI / 6) * .19, 1.42 + Math.sin(i * Math.PI / 6) * .19, .805]),
    ...Array.from({ length: 8 }, (_, i): Vec3 => [side * half, .6 + i * .075, .755]),
  ]).concat(Array.from({ length: Math.round(width / .11) }, (_, i): Vec3 => [-half + .05 + i * .11, .38, .755])), [width, half]);
  return <group position={at} rotation-y={rotation}>
    <Box at={[0, .24, 0]} size={[width + .3, .16, 1.5]} material="wood" />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Orb key={`${x}-${z}`} at={[x * (half), .1, z * .6]} scale={[.11, .1, .11]} material="wood" />))}
    <RoundedBox args={[width + .3, .42, 1.48]} radius={.08} smoothness={3} position={[0, .52, 0]} material={materials.fabric} castShadow receiveShadow />
    <RoundedBox args={[width - .2, 1.02, .4]} radius={.16} smoothness={3} position={[0, 1.18, -.55]} material={materials.fabric} castShadow />
    <mesh position={[0, 1.66, -.55]} rotation-z={Math.PI / 2} material={materials.fabric} castShadow><cylinderGeometry args={[.21, .21, width - .2, 20]} /></mesh>
    {[-1, 1].map((side) => <group key={side} position={[side * half, 0, 0]}>
      <RoundedBox args={[.36, .82, 1.48]} radius={.12} smoothness={3} position={[0, 1.02, 0]} material={materials.fabric} castShadow />
      <mesh position={[side * .05, 1.42, .02]} rotation-x={Math.PI / 2} material={materials.fabric} castShadow><cylinderGeometry args={[.25, .25, 1.48, 20]} /></mesh>
      {[-.76, .78].map((z) => <mesh key={z} position={[side * .05, 1.42, z]} rotation-x={Math.PI / 2} material={materials.fabric}><cylinderGeometry args={[.255, .255, .04, 20]} /></mesh>)}
    </group>)}
    {[-1, 0, 1].map((i) => <RoundedBox key={i} args={[(width - .5) / 3 - .03, .24, 1.08]} radius={.1} smoothness={3} position={[i * (width - .5) / 3, .84, .15]} material={materials.fabric} castShadow receiveShadow />)}
    <Studs points={buttons} radius={.032} material="fabric" flatten={.6} />
    <Studs points={nails} radius={.022} material="gold" flatten={.5} />
  </group>;
}
export function Table({ at = [0, 0, 1], width = 2.5 }: { at?: Vec3; width?: number }) {
  const { materials } = useMaterials();
  return <group position={at}><RoundedBox args={[width, .18, 1.35]} radius={.07} smoothness={2} position={[0, .95, 0]} material={materials.wood} castShadow receiveShadow /><Box at={[0, .8, 0]} size={[width - .3, .12, 1.1]} material="wood" />{[-1, 1].flatMap((x) => [-1, 1].map((z) => <group key={`${x}-${z}`} position={[x * (width / 2 - .23), 0, z * .45]}><mesh position={[0, .45, 0]} material={materials.wood} castShadow><cylinderGeometry args={[.055, .075, .9, 12]} /></mesh><Orb at={[0, .5, 0]} scale={[.11, .14, .11]} material="wood" /><Orb at={[0, .2, 0]} scale={[.09, .07, .09]} material="wood" /><Orb at={[0, .03, 0]} scale={[.08, .05, .08]} material="gold" /></group>))}</group>;
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
