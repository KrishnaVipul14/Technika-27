import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Path, Shape, Vector2, type Mesh, type PointLight } from "three";
import type { SceneProps, Vec3 } from "@/lib/common-room/config";
import { Arch, Box, Blocks, Floor, Lantern, Motes, Sofa, Table, Tube, archShape, useMaterials, type Block } from "./scene-primitives";

function Tapestry({ at, motion }: { at: Vec3; motion: boolean }) {
  const { materials } = useMaterials(); const cloth = useRef<Mesh>(null); const time = useRef(0);
  const crest = useTexture("/images/gryffindor.png");
  useFrame((_, delta) => {
    if (!cloth.current) return; if (motion) time.current += Math.min(delta, .05);
    const position = cloth.current.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getX(i) * 7) * .055 + (motion ? Math.sin(time.current + position.getY(i) * 1.1) * .035 : 0));
    position.needsUpdate = true; cloth.current.geometry.computeVertexNormals();
  });
  return <group position={at}><Box at={[0, 1.65, .04]} size={[2.1, .085, .12]} material="metal" /><mesh ref={cloth} material={materials.fabric} castShadow><planeGeometry args={[1.8, 3.2, 14, 18]} /></mesh><mesh position={[0, .38, .16]}><planeGeometry args={[1.04, 1.23]} /><meshStandardMaterial map={crest} transparent /></mesh>{[-.82, .82].map((x) => <Box key={x} at={[x, -.02, .12]} size={[.035, 3.15, .014]} material="metal" />)}<Box at={[0, -1.55, .1]} size={[1.77, .075, .04]} material="metal" /></group>;
}
function Swords() {
  const { materials } = useMaterials();
  return <group position={[0, 8, -7.7]}>
    <mesh rotation-x={Math.PI / 2} material={materials.wood}><cylinderGeometry args={[.8, .8, .18, 40]} /></mesh>
    {[-1, 1].map((s) => <group key={s} rotation-z={s * .55}><Box at={[0, .35, .22]} size={[.13, 1.95, .045]} material="metal" /><mesh position={[0, 1.4, .22]}><coneGeometry args={[.093, .3, 4]} /><meshStandardMaterial color="#c5ba98" metalness={.75} roughness={.3} /></mesh><Box at={[0, -.67, .23]} size={[.63, .085, .08]} material="metal" /><Box at={[0, -.96, .24]} size={[.1, .5, .085]} material="wood" /></group>)}
  </group>;
}
function Chandelier({ motion }: { motion: boolean }) {
  const { materials } = useMaterials(); const light = useRef<PointLight>(null); const time = useRef(0);
  useFrame((_, delta) => { if (motion) time.current += Math.min(delta, .05); if (light.current) light.current.intensity = 44 + (motion ? Math.sin(time.current * 5) * 2 : 0); });
  return <group position={[0, 6.5, -.8]}>
    <Tube points={[[0, 3.5, 0], [0, 1.5, 0]]} radius={.025} />
    <mesh rotation-x={Math.PI / 2} material={materials.metal}><torusGeometry args={[1.4, .065, 8, 56]} /></mesh>
    {Array.from({ length: 8 }, (_, i) => { const angle = i * Math.PI / 4, x = Math.cos(angle) * 1.4, z = Math.sin(angle) * 1.4; return <group key={i} position={[x, 0, z]}><Box at={[0, .2, 0]} size={[.09, .45, .09]} material="paper" /><mesh position={[0, .49, 0]}><sphereGeometry args={[.05, 8, 6]} /><meshBasicMaterial color="#ffe1a5" /></mesh>{i % 2 === 0 && <Tube points={[[0, 0, 0], [-x, 1.5, -z]]} radius={.018} />}</group>; })}
    <pointLight ref={light} position={[0, -.4, 0]} color="#ffbc76" intensity={44} distance={24} decay={2} />
  </group>;
}
function GryffindorScene({ quality, motion }: SceneProps) {
  const { materials } = useMaterials();
  const wall = useMemo(() => {
    const shape = new Shape([new Vector2(-9, 0), new Vector2(9, 0), new Vector2(9, 10.6), new Vector2(-9, 10.6)]);
    for (const x of [-6.3, 6.3]) shape.holes.push(new Path(archShape(2.6, 5.6).getPoints(24).map((point) => point.add(new Vector2(x, 1.1)))));
    return shape;
  }, []);
  const timber = useMemo<Block[]>(() => [-6.7, 1.4, 9.5, 17.5, 25.5].flatMap((z): Block[] => [
    { at: [-8.55, 3.7, z], size: [.42, 7.4, .5] }, { at: [8.55, 3.7, z], size: [.42, 7.4, .5] },
    { at: [0, 7.3, z], size: [17.6, .32, .44] }, { at: [-4.3, 8.85, z], size: [9.2, .32, .44], rotation: [0, 0, .35] }, { at: [4.3, 8.85, z], size: [9.2, .32, .44], rotation: [0, 0, -.35] }, { at: [0, 8.9, z], size: [.25, 3.2, .3] },
  ]), []);
  return <group name="gryffindor-timber-hearth-hall">
    <Floor wood />
    <Box at={[-9, 4.2, 9]} size={[.6, 8.5, 38]} /><Box at={[9, 4.2, 9]} size={[.6, 8.5, 38]} />
    <Box at={[-4.5, 9, 9]} size={[9.8, .22, 38]} material="wood" rotation={[0, 0, .35]} /><Box at={[4.5, 9, 9]} size={[9.8, .22, 38]} material="wood" rotation={[0, 0, -.35]} />
    <Blocks blocks={timber} material="wood" />
    {[-8.6, 8.6].map((x) => <group key={x}><Box at={[x, .85, 9]} size={[.12, 1.7, 38]} material="wood" /><Box at={[x, 1.76, 9]} size={[.17, .09, 38]} material="metal" /></group>)}
    <mesh position={[0, 0, -8.1]} material={materials.stone} receiveShadow><extrudeGeometry args={[wall, { depth: .3, bevelEnabled: false }]} /></mesh>
    {[-6.3, 6.3].map((x) => <group key={x} position={[x, 1.1, -7.9]}><Arch width={3.05} height={5.95} thickness={.23} depth={.3} /><mesh position={[0, 0, -.25]}><shapeGeometry args={[archShape(2.6, 5.6)]} /><meshBasicMaterial color="#c9a36a" /></mesh>{[-.6, 0, .6].map((m) => <Box key={m} at={[m, 2.25, .16]} size={[.048, 4.5, .08]} material="metal" />)}{[1.5, 3.2, 4.4].map((y) => <Box key={y} at={[0, y, .16]} size={[2.52, .045, .08]} material="metal" />)}<Box at={[0, -.06, .15]} size={[3.2, .18, .85]} material="trim" /></group>)}
    <Tapestry at={[-3.55, 5.8, -7.7]} motion={motion} /><Tapestry at={[3.55, 5.8, -7.7]} motion={motion} /><Swords />
    <Chandelier motion={motion} />
    <pointLight position={[-5.5, 4.8, -5.2]} color="#ffd5a0" intensity={62} distance={18} decay={2} />
    <pointLight position={[5.7, 3.8, -4.8]} color="#e7b277" intensity={42} distance={16} decay={2} />
    <Box at={[0, .05, -5]} size={[5.7, .16, 3.2]} material="trim" />
    <Box at={[0, -.015, .55]} size={[7.4, .025, 7.6]} material="fabric" />
    <Box at={[-3.45, .003, .55]} size={[.045, .015, 7.3]} material="metal" /><Box at={[3.45, .003, .55]} size={[.045, .015, 7.3]} material="metal" />
    <Sofa at={[-2.5, 0, -.7]} rotation={.42} width={3.7} /><Sofa at={[2.5, 0, .8]} rotation={-.6} width={2.2} /><Table at={[-.3, 0, 2.1]} width={3.3} />
    <Lantern at={[-7.9, 4.1, 2]} motion={motion} /><Lantern at={[7.9, 4.1, 2]} motion={motion} />
    <Motes motion={motion} color="#e9bc7c" count={quality === "low" ? 22 : 48} speed={.09} />
  </group>;
}
export default memo(GryffindorScene);
