import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Path, Shape, Vector2, type Group, type Points, type PointsMaterial } from "three";
import type { SceneProps, Vec3 } from "@/lib/common-room/config";
import { BookRows } from "../room-objects";
import { Arch, Box, Floor, Lantern, Motes, Sofa, Tube, useMaterials } from "./scene-primitives";
import { Banner, FloatingCandles, WizardTable } from "./wizard-props";

function TowerShelves({ at, rotation }: { at: Vec3; rotation: number }) {
  return <group position={at} rotation-y={rotation}><Box at={[0, 3.3, -.27]} size={[2.4, 6.6, .24]} material="wood" />{[-1.17, 1.17].map((x) => <Box key={x} at={[x, 3.3, .04]} size={[.17, 6.6, .7]} material="wood" />)}{Array.from({ length: 10 }, (_, i) => <Box key={i} at={[0, .36 + i * .66, .08]} size={[2.45, .09, .8]} material="wood" />)}<BookRows rows={8} /><Arch at={[0, 0, .28]} width={2.6} height={7.1} thickness={.09} depth={.08} material="metal" /></group>;
}
function Armillary({ motion }: { motion: boolean }) {
  const { materials } = useMaterials(); const globe = useRef<Group>(null); const time = useRef(0);
  useFrame((_, delta) => { if (motion && globe.current) { time.current += Math.min(delta, .05); globe.current.rotation.y = time.current * .12; } });
  return <group position={[.5, 0, -.8]}>
    <mesh position={[0, .16, 0]} material={materials.metal}><cylinderGeometry args={[.7, .85, .32, 32]} /></mesh><mesh position={[0, 1, 0]} material={materials.metal}><cylinderGeometry args={[.12, .25, 1.55, 16]} /></mesh>
    <group ref={globe} position={[0, 2.45, 0]} rotation-z={.2}><mesh><sphereGeometry args={[.87, 32, 20]} /><meshStandardMaterial color="#344d71" roughness={.55} metalness={.3} /></mesh>{[0, 1, 2].map((i) => <mesh key={i} rotation={[i * .65, i * .75, .3]} material={materials.metal}><torusGeometry args={[1.1 + i * .13, .027, 7, 72]} /></mesh>)}{[-.5, 0, .5].map((y) => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={materials.metal}><torusGeometry args={[Math.sqrt(.89 ** 2 - y ** 2), .018, 6, 64]} /></mesh>)}</group>
  </group>;
}
function Telescope() {
  const { materials } = useMaterials();
  return <group position={[3.2, 0, -3.5]} rotation-y={-.25}>
    {[0, 1, 2].map((i) => { const angle = i * Math.PI * 2 / 3; return <Tube key={i} points={[[0, 1.8, 0], [Math.cos(angle) * .85, .1, Math.sin(angle) * .85]]} radius={.055} material="wood" />; })}
    <group position={[0, 2.2, 0]} rotation-x={-1.13}><mesh material={materials.metal}><cylinderGeometry args={[.24, .15, 2.2, 24]} /></mesh>{[-.85, .85].map((y) => <mesh key={y} position={[0, y, 0]} material={materials.wood}><cylinderGeometry args={[.25, .25, .1, 24]} /></mesh>)}<mesh position={[0, 1.11, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[.225, 32]} /><meshStandardMaterial color="#829bb7" metalness={.75} roughness={.17} /></mesh><mesh position={[0, -1.18, 0]} material={materials.metal}><cylinderGeometry args={[.09, .09, .26, 16]} /></mesh></group>
  </group>;
}
function FloatingBook({ at, phase, motion }: { at: Vec3; phase: number; motion: boolean }) {
  const ref = useRef<Group>(null); const time = useRef(phase);
  useFrame((_, delta) => { if (!motion || !ref.current) return; time.current += Math.min(delta, .05); ref.current.position.y = at[1] + Math.sin(time.current * .7) * .14; ref.current.rotation.z = Math.sin(time.current * .5) * .08; });
  return <group ref={ref} position={at} rotation={[.2, .3 + phase, 0]}>{[-1, 1].map((s) => <group key={s} rotation-z={s * .2}><Box at={[s * .22, 0, 0]} size={[.46, .06, .61]} material="fabric" /><Box at={[s * .22, .045, 0]} size={[.42, .045, .56]} material="paper" /></group>)}</group>;
}
function Stars({ motion, count }: { motion: boolean; count: number }) {
  const { glow } = useMaterials(); const ref = useRef<Points>(null); const time = useRef(0);
  const positions = useMemo(() => new Float32Array(Array.from({ length: count }, (_, i) => {
    const theta = i * 2.399963, altitude = .06 + (i % 41) / 41 * 1.45;
    return i % 3 ? [Math.cos(theta) * Math.cos(altitude) * 10.5, 7 + Math.sin(altitude) * 10.5, 1 + Math.sin(theta) * Math.cos(altitude) * 10.5] : [Math.sin(i * 73.1) * 3.4, 4.3 + Math.cos(i * 27.2) * 3.3, -9.3];
  }).flat()), [count]);
  useFrame((_, delta) => { if (motion && ref.current) { time.current += Math.min(delta, .05); (ref.current.material as PointsMaterial).opacity = .6 + Math.sin(time.current * .8) * .14; } });
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#d1defb" map={glow} size={.08} transparent opacity={.7} depthWrite={false} /></points>;
}
function RavenclawScene({ quality, motion }: SceneProps) {
  const { materials } = useMaterials();
  const rear = useMemo(() => { const shape = new Shape([new Vector2(-6.2, 0), new Vector2(6.2, 0), new Vector2(6.2, 8), new Vector2(-6.2, 8)]); const hole = new Path(); hole.absarc(0, 4.3, 3.5, 0, Math.PI * 2, true); shape.holes.push(hole); return shape; }, []);
  const compass = useMemo(() => new Shape([new Vector2(0, 0), new Vector2(.18, .4), new Vector2(0, 3.1), new Vector2(-.18, .4)]), []);
  return <group name="ravenclaw-circular-observatory">
    <Floor />
    {[Math.PI / 4, Math.PI + .6].map((start) => <mesh key={start} position={[0, 3.6, 1]} receiveShadow><cylinderGeometry args={[10, 10, 7.2, 48, 1, true, start, Math.PI * .75 - .6]} /><meshStandardMaterial color="#63758c" map={materials.stone.map} roughness={.82} side={BackSide} /></mesh>)}
    <mesh position={[0, 7.2, 1]}><sphereGeometry args={[11, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#142542" roughness={.94} side={BackSide} /></mesh>
    {Array.from({ length: 8 }, (_, i) => { const angle = i * Math.PI / 4; return <Tube key={i} points={Array.from({ length: 9 }, (_, j): Vec3 => { const elevation = j * Math.PI / 16; return [Math.cos(angle) * Math.cos(elevation) * 10.85, 7.2 + Math.sin(elevation) * 10.85, 1 + Math.sin(angle) * Math.cos(elevation) * 10.85]; })} radius={.045} />; })}
    {[7.4, 10.5, 13.3].map((y) => <mesh key={y} position={[0, y, 1]} rotation-x={Math.PI / 2} material={materials.metal}><torusGeometry args={[Math.sqrt(10.8 ** 2 - (y - 7.2) ** 2), .04, 7, 80]} /></mesh>)}
    <mesh position={[0, 0, -8.55]} material={materials.stone} receiveShadow><extrudeGeometry args={[rear, { depth: .3, bevelEnabled: false }]} /></mesh>
    <mesh position={[0, 4.3, -9.7]}><circleGeometry args={[4.8, 64]} /><meshBasicMaterial color="#14274c" /></mesh>
    {[3.6, 3.8].map((r) => <mesh key={r} position={[0, 4.3, -8.1]} material={r === 3.6 ? materials.metal : materials.trim}><torusGeometry args={[r, r === 3.6 ? .05 : .19, 10, 96]} /></mesh>)}
    {Array.from({ length: 8 }, (_, i) => { const angle = i * Math.PI / 4; return <Tube key={i} points={[[Math.cos(angle) * .65, 4.3 + Math.sin(angle) * .65, -8.05], [Math.cos(angle) * 3.55, 4.3 + Math.sin(angle) * 3.55, -8.05]]} radius={.026} />; })}
    <mesh position={[0, 4.3, -8.05]} material={materials.metal}><torusGeometry args={[.65, .035, 7, 48]} /></mesh>
    <mesh position={[1.1, 5.4, -9.5]}><sphereGeometry args={[.48, 24, 16]} /><meshBasicMaterial color="#ced9ed" /></mesh>
    <Stars motion={motion} count={quality === "low" ? 80 : 170} />
    <TowerShelves at={[-7.7, 0, -3.6]} rotation={.85} /><TowerShelves at={[7.7, 0, -3.6]} rotation={-.85} />
    <TowerShelves at={[-9.1, 0, 1.5]} rotation={1.4} /><TowerShelves at={[9.1, 0, 1.5]} rotation={-1.4} />
    <mesh position={[0, -.015, -.2]} rotation-x={-Math.PI / 2}><circleGeometry args={[6.8, 96]} /><meshStandardMaterial color="#243d60" roughness={.55} metalness={.15} /></mesh>
    {[3.4, 6.5, 6.65].map((r) => <mesh key={r} position={[0, .001, -.2]} rotation-x={-Math.PI / 2} material={materials.metal}><ringGeometry args={[r, r + .025, 96]} /></mesh>)}
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, .003, -.2]} rotation={[-Math.PI / 2, 0, i * Math.PI / 4]} material={materials.metal}><shapeGeometry args={[compass]} /></mesh>)}
    <Armillary motion={motion} /><Telescope />
    <Sofa at={[-2.3, 0, 1.5]} width={2.2} rotation={.28} /><WizardTable at={[.4, 0, 2.7]} width={2.3} motion={motion} />
    {[-4.95, 4.95].map((x) => <Banner key={x} at={[x, 7.5, -8.2]} crest="/images/ravenclaw.png" width={.95} length={3.2} motion={motion} />)}
    <FloatingCandles center={[0, 8, .5]} area={[13, 1.4, 9]} count={quality === "low" ? 10 : 20} motion={motion} />
    <FloatingBook at={[-2, 3.8, -2.8]} phase={0} motion={motion} />{quality !== "low" && <><FloatingBook at={[.9, 4.7, -4.2]} phase={1} motion={motion} /><FloatingBook at={[2.6, 4.1, -.4]} phase={2} motion={motion} /></>}
    <pointLight position={[0, 5.4, -6]} color="#aac6f7" intensity={85} distance={25} decay={2} /><pointLight position={[0, 8, 2]} color="#8ba8e4" intensity={65} distance={22} decay={2} />
    <Lantern at={[-7.9, 3.9, 4]} motion={motion} /><Lantern at={[7.9, 3.9, 4]} motion={motion} /><Motes motion={motion} color="#b1c7e2" count={quality === "low" ? 18 : 38} />
  </group>;
}
export default memo(RavenclawScene);
