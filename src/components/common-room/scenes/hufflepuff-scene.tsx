import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { DoubleSide, Object3D, Path, Shape, type Group, type InstancedMesh } from "three";
import type { SceneProps, Vec3 } from "@/lib/common-room/config";
import { Box, Floor, Lantern, Motes, Orb, Tube, useMaterials } from "./scene-primitives";

function Plant({ at, scale = 1, motion, hanging = false }: { at: Vec3; scale?: number; motion: boolean; hanging?: boolean }) {
  const { materials } = useMaterials(); const leaves = useRef<InstancedMesh>(null); const canopy = useRef<Group>(null); const time = useRef(at[0]);
  const shape = useMemo(() => { const leaf = new Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(.38, .44, 0, 1); leaf.quadraticCurveTo(-.38, .44, 0, 0); return leaf; }, []);
  useLayoutEffect(() => {
    const object = new Object3D();
    for (let i = 0; i < 18; i++) { const angle = i * 2.4; object.position.set(Math.sin(angle) * .13, .06 + Math.floor(i / 6) * .28, Math.cos(angle) * .13); object.rotation.set(Math.cos(angle) * .7, angle, Math.sin(angle) * .7); object.scale.set(.75, .7 + (i % 5) * .17, 1); object.updateMatrix(); leaves.current?.setMatrixAt(i, object.matrix); }
    if (leaves.current) { leaves.current.instanceMatrix.needsUpdate = true; leaves.current.computeBoundingSphere(); }
  }, []);
  useFrame((_, delta) => { if (motion && canopy.current) { time.current += Math.min(delta, .05); canopy.current.rotation.z = Math.sin(time.current * .6) * .034; } });
  return <group position={at} scale={scale}>
    <mesh position={[0, .28, 0]} castShadow><cylinderGeometry args={[.38, .25, .55, 20]} /><meshStandardMaterial color="#a8714c" roughness={.93} /></mesh>
    <mesh position={[0, .52, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[.375, .044, 8, 32]} /><meshStandardMaterial color="#b18257" roughness={.85} /></mesh>
    <mesh position={[0, .51, 0]} rotation-x={-Math.PI / 2} material={materials.dark}><circleGeometry args={[.345, 24]} /></mesh>
    <group ref={canopy} position={[0, .52, 0]}><instancedMesh ref={leaves} args={[undefined, materials.leaf, 18]} castShadow><shapeGeometry args={[shape, 10]} /></instancedMesh></group>
    {hanging && [-1, 1].map((s) => <Tube key={s} points={[[s * .33, .5, 0], [s * .2, 1.2, 0], [0, 2.05, 0]]} radius={.015} material="wood" />)}
  </group>;
}
function GardenChair({ at, rotation }: { at: Vec3; rotation: number }) {
  const { materials } = useMaterials();
  return <group position={at} rotation-y={rotation}>
    <mesh position={[0, .68, 0]} material={materials.wood} castShadow><cylinderGeometry args={[.84, .77, .18, 32]} /></mesh>
    <Orb at={[0, .83, .03]} scale={[.75, .18, .68]} material="fabric" /><Orb at={[0, 1.25, -.56]} scale={[.67, .48, .17]} material="fabric" />
    <Tube points={[[-.8, .8, -.25], [-.6, 1.52, -.66], [0, 1.76, -.72], [.6, 1.52, -.66], [.8, .8, -.25]]} radius={.065} material="wood" />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}-${z}`} at={[x * .48, .33, z * .37]} size={[.11, .67, .11]} material="wood" />))}
    {[-1, 1].map((s) => <Tube key={s} points={[[s * .75, .75, .45], [s * .8, 1.08, .3], [s * .77, 1.1, -.35]]} radius={.055} material="wood" />)}
  </group>;
}
function TeaTable() {
  const { materials } = useMaterials();
  return <group position={[0, 0, 1]}><mesh position={[0, 1.08, 0]} material={materials.wood} castShadow receiveShadow><cylinderGeometry args={[1.35, 1.35, .16, 48]} /></mesh><mesh position={[0, .54, 0]} material={materials.wood}><cylinderGeometry args={[.16, .23, 1.02, 16]} /></mesh>{[0, 1, 2].map((i) => { const a = i * Math.PI * 2 / 3; return <Tube key={i} points={[[0, .2, 0], [Math.cos(a) * .85, .13, Math.sin(a) * .85]]} radius={.07} material="wood" />; })}<Orb at={[.15, 1.37, .05]} scale={[.24, .18, .21]} material="paper" /><Orb at={[.15, 1.57, .05]} scale={[.05, .04, .05]} material="wood" /><Tube points={[[.35, 1.34, .05], [.48, 1.44, .05], [.49, 1.51, .05]]} radius={.037} material="paper" /><mesh position={[-.06, 1.39, .05]} material={materials.paper}><torusGeometry args={[.12, .024, 7, 24]} /></mesh><mesh position={[-.43, 1.25, .24]} material={materials.paper}><cylinderGeometry args={[.085, .06, .15, 16]} /></mesh></group>;
}
function Butterfly({ at, motion, phase }: { at: Vec3; motion: boolean; phase: number }) {
  const body = useRef<Group>(null); const wings = useRef<Group>(null); const time = useRef(phase);
  useFrame((_, delta) => { if (!motion) return; time.current += Math.min(delta, .05); if (body.current) { body.current.position.x = at[0] + Math.sin(time.current * .6) * .45; body.current.position.y = at[1] + Math.sin(time.current * .8) * .23; } wings.current?.children.forEach((wing, i) => { wing.rotation.y = (i ? 1 : -1) * Math.sin(time.current * 12) * .8; }); });
  return <group ref={body} position={at} scale={.35}><Orb at={[0, 0, 0]} scale={[.016, .14, .015]} material="wood" /><group ref={wings}>{[-1, 1].map((s) => <group key={s}>{[0, 1].map((i) => <mesh key={i} position={[s * (i ? .11 : .17), i ? -.12 : .1, 0]} rotation-z={s * (i ? -.4 : .45)} scale={i ? [.14, .2, .035] : [.2, .29, .035]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={i ? "#b9934c" : "#debd67"} roughness={.85} /></mesh>)}</group>)}</group></group>;
}
function HufflepuffScene({ motion, quality }: SceneProps) {
  const { materials } = useMaterials();
  const roof = useMemo(() => { const shape = new Shape(); shape.absellipse(0, 0, 9, 6, 0, Math.PI, false, 0); shape.lineTo(-8.7, 0); shape.absellipse(0, 0, 8.7, 5.7, Math.PI, 0, true, 0); shape.closePath(); return shape; }, []);
  const back = useMemo(() => { const shape = new Shape(); shape.absellipse(0, 0, 8.8, 5.8, 0, Math.PI, false, 0); shape.closePath(); const hole = new Path(); hole.absarc(0, 2.95, 2.45, 0, Math.PI * 2, true); shape.holes.push(hole); return shape; }, []);
  return <group name="hufflepuff-earth-garden-burrow">
    <Floor wood /><mesh position={[0, 0, -9]} material={materials.trim} receiveShadow><extrudeGeometry args={[roof, { depth: 38, bevelEnabled: false, curveSegments: 40 }]} /></mesh>
    {[-6.8, 0, 6.8, 13.6, 20.4, 27.2].map((z) => <Tube key={z} points={Array.from({ length: 21 }, (_, i): Vec3 => [Math.cos(i * Math.PI / 20) * 8.67, Math.sin(i * Math.PI / 20) * 5.64 + .04, z])} radius={.14} material="wood" />)}
    <mesh position={[0, 0, -8.15]} material={materials.stone}><extrudeGeometry args={[back, { depth: .2, bevelEnabled: false, curveSegments: 48 }]} /></mesh>
    <mesh position={[0, 3, -10.5]}><planeGeometry args={[18, 9]} /><meshBasicMaterial color="#b7c995" /></mesh>
    <Plant at={[-1.9, -.2, -9.4]} scale={2.3} motion={motion} /><Plant at={[2, -.3, -9.3]} scale={2.1} motion={motion} />
    {[2.48, 2.67].map((r) => <mesh key={r} position={[0, 2.95, -7.86]} material={r === 2.48 ? materials.metal : materials.wood}><torusGeometry args={[r, r === 2.48 ? .055 : .16, 10, 80]} /></mesh>)}
    <Box at={[0, 2.95, -7.72]} size={[.085, 4.85, .12]} material="wood" /><Box at={[0, 2.95, -7.72]} size={[4.85, .085, .12]} material="wood" />
    {[-1.2, 1.2].map((x) => <Box key={x} at={[x, 2.95, -7.72]} size={[.055, 4.23, .11]} material="wood" />)}
    <RoundedBox args={[3.9, .22, 1.15]} radius={.1} smoothness={2} position={[0, .55, -5.8]} material={materials.wood} castShadow /><RoundedBox args={[3.6, .18, .97]} radius={.08} smoothness={2} position={[0, .73, -5.8]} material={materials.fabric} />
    {[-1.6, 1.6].map((x) => <Box key={x} at={[x, .27, -5.8]} size={[.18, .55, .8]} material="wood" />)}
    <Plant at={[-3.4, 0, -5.6]} scale={1.2} motion={motion} /><Plant at={[3.4, 0, -5.6]} scale={1.25} motion={motion} />
    <Plant at={[-7.1, 0, -1.1]} scale={1.55} motion={motion} /><Plant at={[7.25, 0, -3.5]} scale={1.5} motion={motion} />
    <Plant at={[-2.2, 3.5, -2.6]} scale={.75} motion={motion} hanging /><Plant at={[2.4, 3.3, -2.6]} scale={.75} motion={motion} hanging />
    <GardenChair at={[-2.25, 0, .7]} rotation={.6} /><GardenChair at={[2.1, 0, -.2]} rotation={-.7} /><TeaTable />
    <mesh position={[0, -.005, .5]} rotation-x={-Math.PI / 2}><circleGeometry args={[3.25, 72]} /><meshStandardMaterial color="#a39162" roughness={1} /></mesh>
    {[2.95, 3.05, 3.15].map((r) => <mesh key={r} position={[0, .001, .5]} rotation-x={Math.PI / 2} material={materials.wood}><torusGeometry args={[r, .018, 5, 80]} /></mesh>)}
    <Butterfly at={[1.6, 2.8, -1.3]} motion={motion} phase={0} />{quality !== "low" && <Butterfly at={[-2, 2.4, 1.4]} motion={motion} phase={2} />}
    <Lantern at={[-7.8, 2.7, 3.3]} motion={motion} /><Lantern at={[7.8, 2.7, 3.3]} motion={motion} />
    <pointLight position={[0, 4.3, -5.5]} color="#fff0bd" intensity={83} distance={20} decay={2} /><pointLight position={[2, 3.5, 3]} color="#e7c58a" intensity={36} distance={17} decay={2} />
    <mesh position={[1, 2.6, -3.4]} rotation-z={-.27}><coneGeometry args={[1.8, 5.5, 24, 1, true]} /><meshBasicMaterial color="#ffedbc" transparent opacity={.022} depthWrite={false} side={DoubleSide} /></mesh>
    <Motes color="#eddeb2" count={quality === "low" ? 24 : 52} motion={motion} />
  </group>;
}
export default memo(HufflepuffScene);
