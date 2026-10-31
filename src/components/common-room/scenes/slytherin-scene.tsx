import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Path, RepeatWrapping, Shape, SRGBColorSpace, Vector2, type Group, type PointLight } from "three";
import type { SceneProps, Vec3 } from "@/lib/common-room/config";
import { Arch, Box, Blocks, Floor, Lantern, Motes, Orb, Sofa, Table, Tube, archShape, useMaterials, type Block } from "./scene-primitives";

function waterTexture() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 60, 512); gradient.addColorStop(0, "#4d8d73"); gradient.addColorStop(.4, "#1e574c"); gradient.addColorStop(1, "#092723");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#a4c4a44a"; ctx.lineWidth = 1.5;
  for (let i = -12; i < 30; i++) { ctx.beginPath(); for (let y = 0; y < 512; y += 4) { const x = i * 38 + Math.sin(y * .018 + i) * 28 + Math.sin(y * .043) * 11; if (!y) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.wrapS = texture.wrapT = RepeatWrapping; return texture;
}
function Serpent({ at, mirror = 1, motion }: { at: Vec3; mirror?: number; motion: boolean }) {
  const head = useRef<Group>(null); const time = useRef(0);
  const points = useMemo<Vec3[]>(() => Array.from({ length: 30 }, (_, i) => { const t = i / 29; return [Math.sin(t * Math.PI * 4) * (.46 - t * .27), .45 + t * 1.9, Math.cos(t * Math.PI * 4) * (.36 - t * .18)]; }), []);
  useFrame((_, delta) => { if (motion && head.current) { time.current += Math.min(delta, .05); head.current.rotation.z = Math.sin(time.current * .3) * .018; } });
  return <group position={at} scale-x={mirror}><Box at={[0, .25, 0]} size={[.95, .5, .85]} material="trim" /><Tube points={points} radius={.105} material="metal" /><group ref={head} position={[0, 2.35, .16]}><Orb at={[.04, 0, .08]} scale={[.2, .17, .32]} /><Orb at={[.13, .045, .22]} scale={[.027, .027, .025]} material="dark" /></group></group>;
}
function SlytherinScene({ quality, motion }: SceneProps) {
  const water = useMemo(() => waterTexture(), []); const pane = useMemo(() => archShape(4, 6), []);
  const { materials } = useMaterials();
  const backWall = useMemo(() => {
    const wall = new Shape([new Vector2(-9, 0), new Vector2(9, 0), new Vector2(9, 10), new Vector2(-9, 10)]);
    for (const x of [-5.1, 0, 5.1]) wall.holes.push(new Path(archShape(4, 6).getPoints(32).map((point) => point.add(new Vector2(x, 1.03)))));
    return wall;
  }, []);
  const waterRef = useRef<CanvasTexture | null>(null);
  const creature = useRef<Group>(null); const lakeLight = useRef<PointLight>(null); const time = useRef(0);
  useEffect(() => { waterRef.current = water; return () => water.dispose(); }, [water]);
  useFrame((_, delta) => {
    if (!motion) return; time.current += Math.min(delta, .05);
    if (waterRef.current) { waterRef.current.offset.x = Math.sin(time.current * .08) * .05; waterRef.current.offset.y = time.current * .003; }
    if (creature.current) { creature.current.position.x = Math.sin(time.current * .065) * 9; creature.current.position.y = 4.2 + Math.sin(time.current * .13) * .6; }
    if (lakeLight.current) lakeLight.current.intensity = 52 + Math.sin(time.current * .4) * 6;
  });
  const columns = useMemo<Block[]>(() => [-8.45, 8.45].flatMap((x) => [-6.8, 1.2, 9, 17, 25].flatMap((z): Block[] => [
    { at: [x, 3.1, z], size: [.48, 6.2, .55] }, { at: [x, .22, z], size: [.88, .44, .9] }, { at: [x, 6.1, z], size: [.84, .28, .85] },
  ])), []);
  return <group name="slytherin-underwater-vault">
    <Floor />
    <Box at={[-9, 4.4, 9]} size={[.7, 9, 38]} /><Box at={[9, 4.4, 9]} size={[.7, 9, 38]} />
    <Box at={[-4.55, 9.25, 9]} size={[9.6, .4, 38]} rotation={[0, 0, .24]} /><Box at={[4.55, 9.25, 9]} size={[9.6, .4, 38]} rotation={[0, 0, -.24]} />
    <Blocks blocks={columns} material="trim" />
    {[-6.8, 1.2, 9, 17, 25].map((z) => <Tube key={z} points={[[-8.45, 6, z], [-6.4, 8.25, z], [0, 10.4, z], [6.4, 8.25, z], [8.45, 6, z]]} radius={.14} material="trim" />)}
    {[-8.6, 8.6].map((x) => <group key={x}><Box at={[x, 1.1, 9]} size={[.15, .14, 38]} material="trim" /><Box at={[x, .23, 9]} size={[.18, .18, 38]} material="trim" /></group>)}
    <mesh position={[0, 0, -7.95]} material={materials.stone} receiveShadow><extrudeGeometry args={[backWall, { depth: .15, bevelEnabled: false, curveSegments: 32 }]} /></mesh>
    <Box at={[0, .48, -8.1]} size={[18, .95, .8]} /><Box at={[0, 8.65, -8.1]} size={[18, 3.4, .8]} />
    {[-8.2, -2.55, 2.55, 8.2].map((x) => <Box key={x} at={[x, 4, -8.1]} size={[1.1, 7.8, .9]} />)}
    <mesh position={[0, 5, -10.3]}><planeGeometry args={[28, 15]} /><meshBasicMaterial color="#285b50" /></mesh>
    <group ref={creature} position={[1, 4.2, -9.3]}>
      <mesh scale={[2.2, .4, .2]}><sphereGeometry args={[1, 20, 12]} /><meshBasicMaterial color="#0e302a" /></mesh>
      <mesh position={[-2, 0, 0]} rotation-z={Math.PI / 2} scale={[1, 1, .2]}><coneGeometry args={[.7, 1.1, 3]} /><meshBasicMaterial color="#0e302a" /></mesh>
      <mesh position={[.2, .38, 0]} rotation-z={-.3} scale={[1.1, .55, .13]}><coneGeometry args={[.55, 1.2, 3]} /><meshBasicMaterial color="#0e302a" /></mesh>
    </group>
    {[-5.1, 0, 5.1].map((x) => <group key={x} position={[x, 1.03, -7.8]}>
      <mesh position={[0, 0, -.1]}><shapeGeometry args={[pane, 30]} /><meshBasicMaterial map={water} transparent opacity={.6} depthWrite={false} /></mesh>
      <Arch width={4.45} height={6.3} thickness={.23} depth={.48} />
      <Arch at={[0, .18, .49]} width={3.98} height={5.85} thickness={.055} depth={.025} material="metal" />
      {[-.91, .91].map((m) => <Box key={m} at={[m, 2.15, .22]} size={[.075, 4.3, .13]} material="trim" />)}
      <Box at={[0, 2.82, .22]} size={[3.78, .075, .13]} material="trim" />
      <mesh position={[0, 4.92, .23]}><torusGeometry args={[.47, .049, 7, 40]} /><meshStandardMaterial color="#93ab9b" roughness={.7} /></mesh>
      <Box at={[0, .025, .22]} size={[4.65, .22, .95]} material="trim" />
    </group>)}
    <pointLight ref={lakeLight} position={[0, 5.2, -5.6]} color="#73cbb0" intensity={52} distance={22} decay={2} />
    <pointLight position={[6, 4, -4]} color="#75b597" intensity={28} distance={13} decay={2} />
    <Serpent at={[-7.8, 0, -5.3]} motion={motion} /><Serpent at={[7.8, 0, -5.3]} mirror={-1} motion={motion} />
    <Sofa at={[0, 0, -1.8]} width={4.6} /><Sofa at={[-2.9, 0, .65]} rotation={.8} width={2.2} />
    <Table at={[0, 0, 1.3]} />
    <mesh rotation-x={-Math.PI / 2} position={[0, -.015, .1]}><circleGeometry args={[3.6, 64]} /><meshStandardMaterial color="#152f25" roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, -.009, .1]}><ringGeometry args={[3.4, 3.44, 64]} /><meshStandardMaterial color="#89947a" roughness={.8} /></mesh>
    <Lantern at={[-7.9, 4.2, 2.1]} motion={motion} /><Lantern at={[7.9, 4.2, 2.1]} motion={motion} />
    <Motes motion={motion} count={quality === "low" ? 30 : 65} />
  </group>;
}
export default memo(SlytherinScene);
