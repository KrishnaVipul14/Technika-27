import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { AdditiveBlending, MathUtils, type Group, type PointLight } from "three";
import { houseLogoFor } from "@/lib/houses";
import { type SceneProps } from "@/lib/common-room/config";
import type { ObjectId } from "@/lib/common-room/types";
import { explorationView } from "@/lib/common-room/camera";
import { InteractiveObject } from "./interactive-object";
import { roomObjects } from "@/lib/common-room/content";
import { Arch, Box, Blocks, Motes, Orb, Lantern, archShape, useMaterials, type Block } from "./scenes/scene-primitives";

function Fire({ motion, active }: { motion: boolean; active: boolean }) {
  const { glow } = useMaterials(); const flames = useRef<Group>(null); const light = useRef<PointLight>(null); const time = useRef(0);
  useFrame((_, delta) => { if (motion) time.current += Math.min(delta, .05); if (flames.current) flames.current.children.forEach((child, i) => { child.scale.y = motion ? .9 + Math.sin(time.current * (5 + i) + i * 3) * .13 + (active ? .15 : 0) : 1; }); if (light.current) light.current.intensity = (active ? 34 : 22) + (motion ? Math.sin(time.current * 9) * 2 + Math.sin(time.current * 17) : 0); });
  return <group position={[0, .65, .4]}>
    {[-.38, .38].map((x) => <Box key={x} at={[x, -.28, 0]} size={[.72, .18, .3]} material="wood" rotation={[0, x, .1]} />)}
    <group ref={flames}>{[-.42, -.2, 0, .2, .42].map((x, i) => <mesh key={x} position={[x, .33 + (i % 2) * .11, .04 * i]}><planeGeometry args={[.58, 1.3 - Math.abs(x)]} /><meshBasicMaterial map={glow} color={i % 2 ? "#ffb14a" : "#ffe1a0"} transparent opacity={.86} blending={AdditiveBlending} depthWrite={false} /></mesh>)}</group>
    <pointLight ref={light} position={[0, .3, .5]} color="#ff994e" intensity={22} distance={12} decay={2} />
    <Motes color="#ffb869" count={18} size={.037} at={[0, 1.2, 0]} area={[1.5, 2.7, .55]} speed={.3} motion={motion} />
  </group>;
}
function Fireplace({ house, motion, active }: SceneProps & { active: boolean }) {
  const crest = useTexture(houseLogoFor(house)); const scale = house === "gryffindor" ? 1.35 : house === "hufflepuff" ? .86 : 1;
  return <group scale={scale}>
    <Box at={[0, .13, .15]} size={[3.55, .26, 1.75]} material="trim" />
    <Box at={[0, 2.68, -.19]} size={[2.9, 4.9, .8]} />
    <Box at={[0, 1.38, .24]} size={[2.05, 2.2, .16]} material="dark" />
    <Arch at={[0, .24, .3]} width={2.8} height={2.8} thickness={.39} depth={.52} pointed={house !== "hufflepuff"} />
    <Box at={[0, 3.16, .15]} size={[3.45, .22, 1.3]} material="trim" />
    <Box at={[0, 3.36, -.12]} size={[3.06, .13, .96]} material="metal" />
    <Box at={[0, 5.17, -.16]} size={[3.19, .22, 1]} material="trim" />
    <mesh position={[0, 4.15, .24]}><planeGeometry args={[1.13, 1.38]} /><meshStandardMaterial map={crest} transparent roughness={.8} /></mesh>
    <Fire motion={motion} active={active} />
    <Lantern at={[-1.33, 3.55, .1]} motion={motion} /><Lantern at={[1.33, 3.55, .1]} motion={motion} />
  </group>;
}
export function BookRows({ width = 2.12, rows = 4, active, motion = true }: { width?: number; rows?: number; active?: boolean; motion?: boolean }) {
  const volume = useRef<Group>(null);
  useFrame((_, delta) => { if (volume.current) volume.current.position.z = motion ? MathUtils.damp(volume.current.position.z, active ? .27 : 0, 8, Math.min(delta, .05)) : active ? .27 : 0; });
  const covers = useMemo<Block[]>(() => Array.from({ length: rows * 10 }, (_, i) => { const col = i % 10, row = Math.floor(i / 10); const h = .37 + (i * 7 % 5) * .04; return { at: [-width / 2 + .12 + col * (width / 10), .51 + row * .66 + h / 2, .02], size: [.14 + (i % 3) * .025, h, .42], rotation: [0, 0, i % 8 === 0 ? .08 : 0], color: ["#57382d", "#4b5840", "#455061", "#785644", "#9c8259"][i % 5] }; }), [width, rows]);
  const bands = useMemo<Block[]>(() => covers.flatMap((book) => [0, 1].map((i) => ({ at: [book.at[0], book.at[1] + (i ? .12 : -.12), .235] as [number, number, number], size: [book.size[0] * .82, .018, .013] as [number, number, number] }))), [covers]);
  return active === undefined ? <><Blocks blocks={covers} material="book" /><Blocks blocks={bands} material="metal" /></> : <><Blocks blocks={covers.filter((_, i) => i !== 15)} material="book" /><Blocks blocks={bands.filter((_, i) => Math.floor(i / 2) !== 15)} material="metal" /><group ref={volume}><Blocks blocks={[covers[15]]} material="book" /><Blocks blocks={bands.slice(30, 32)} material="metal" /></group></>;
}
function Bookshelf({ active, motion }: { active: boolean; motion: boolean }) {
  return <group>
    <Box at={[0, 1.9, -.27]} size={[2.5, 3.8, .22]} material="wood" />
    {[-1, 1].map((s) => <Box key={s} at={[s * 1.2, 1.9, .1]} size={[.2, 3.8, .75]} material="wood" />)}
    {[.36, 1.02, 1.68, 2.34, 3, 3.8].map((y) => <Box key={y} at={[0, y, .09]} size={[2.6, .13, .83]} material="wood" />)}
    <Box at={[0, 3.91, .05]} size={[2.8, .15, .92]} material="metal" />
    <BookRows active={active} motion={motion} />
    <Box at={[.45, 3.33, -.02]} size={[.75, .22, .48]} material="paper" /><Box at={[.43, 3.49, -.02]} size={[.83, .1, .5]} material="wood" />
  </group>;
}
function NoticeBoard({ active, motion }: { active: boolean; motion: boolean }) {
  const parchment = useRef<Group>(null); const time = useRef(0);
  useFrame((_, delta) => { if (motion) time.current += Math.min(delta, .05); if (parchment.current) parchment.current.rotation.x = motion && active ? Math.sin(time.current * 4) * .09 : 0; });
  return <group>
    <Box at={[0, 2.3, 0]} size={[2.35, 2.65, .18]} material="wood" />
    <Box at={[0, 2.3, .11]} size={[2.05, 2.37, .025]} material="fabric" />
    {[-1, 1].map((s) => <group key={s}><Box at={[s * 1.15, 1.8, 0]} size={[.14, 3.6, .24]} material="wood" /><Box at={[s * 1.15, .12, 0]} size={[.6, .24, .75]} material="wood" /></group>)}
    {[1.02, 3.62].map((y) => <Box key={y} at={[0, y, .07]} size={[2.56, .13, .3]} material="metal" />)}
    {[[-.53, 2.79, -.08], [.48, 2.9, .08], [-.42, 1.76, .05], [.52, 1.81, -.1]].map(([x, y, r], index) => <group ref={index === 0 ? parchment : undefined} key={index} position={[x, y, .18]} rotation-z={r}>
      <Box at={[0, 0, 0]} size={[.77, .88, .025]} material="paper" />
      <Box at={[0, .23, .018]} size={[.5, .035, .009]} material="wood" />
      {[0, 1, 2, 3].map((line) => <Box key={line} at={[0, .09 - line * .1, .018]} size={[line % 2 ? .5 : .56, .012, .009]} material="wood" />)}
      <Orb at={[.02, .35, .04]} scale={[.04, .04, .02]} />
    </group>)}
  </group>;
}
function Chest({ open, hovered, motion }: { open: boolean; hovered: boolean; motion: boolean }) {
  const { materials } = useMaterials(); const lid = useRef<Group>(null);
  useFrame((_, delta) => { if (lid.current) { const angle = open ? -1.15 : hovered ? -.15 : 0; lid.current.rotation.x = motion ? MathUtils.damp(lid.current.rotation.x, angle, 8, Math.min(delta, .05)) : angle; } });
  return <group>
    {[-1, 1].map((s) => <group key={s}><Box at={[0, .59, s * .47]} size={[2.12, .94, .1]} material="wood" /><Box at={[s * 1.01, .59, 0]} size={[.1, .94, .94]} material="wood" /></group>)}
    <Box at={[0, .23, 0]} size={[1.94, .1, .9]} material="dark" /><Box at={[.2, .34, 0]} size={[.85, .08, .5]} material="paper" rotation={[0, .15, 0]} />
    <Box at={[0, .12, 0]} size={[2.22, .16, 1.12]} material="metal" />
    <group ref={lid} position={[0, 1.07, -.52]}><group position={[0, 0, .52]}>
      <mesh rotation-z={Math.PI / 2} material={materials.wood} castShadow><cylinderGeometry args={[.52, .52, 2.12, 24, 1, false, 0, Math.PI]} /></mesh>
      {[-.77, .77].map((x) => <mesh key={x} position={[x, 0, 0]} rotation-y={Math.PI / 2} material={materials.metal}><torusGeometry args={[.535, .037, 7, 32, Math.PI]} /></mesh>)}
    </group></group>
    {[-.77, .77].map((x) => <Box key={x} at={[x, .6, .535]} size={[.1, .92, .04]} material="metal" />)}
    <Box at={[0, .92, .562]} size={[.28, .36, .07]} material="metal" />
    <Orb at={[0, .91, .613]} scale={[.041, .07, .015]} material="dark" />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Orb key={`${x}-${z}`} at={[x, .23, z * .51]} scale={[.07, .07, .045]} />))}
  </group>;
}
function SecretDoor({ motion, open, hovered }: { motion: boolean; open: boolean; hovered: boolean }) {
  const { materials } = useMaterials(); const shape = useMemo(() => archShape(1.78, 3.8), []);
  const door = useRef<Group>(null); const light = useRef<PointLight>(null);
  useFrame((_, delta) => { if (door.current) { const angle = open ? -1.37 : hovered ? -.035 : 0; door.current.rotation.y = motion ? MathUtils.damp(door.current.rotation.y, angle, 6, Math.min(delta, .05)) : angle; } if (light.current) light.current.intensity = open ? 13 : hovered ? 5 : 0; });
  const runes = useMemo<Block[]>(() => Array.from({ length: 5 }, (_, i) => (i - 2) * .3).flatMap((x): Block[] => [ { at: [x, 3.22 - Math.abs(x) * .24, .26], size: [.025, .3, .02] }, { at: [x + .045, 3.25 - Math.abs(x) * .24, .26], size: [.021, .18, .02], rotation: [0, 0, .7] } ]), []);
  return <group>
    <Box at={[-1.07, 2, -1.8]} size={[.24, 4, 4]} /><Box at={[1.07, 2, -1.8]} size={[.24, 4, 4]} /><Box at={[0, .035, -1.8]} size={[2.2, .09, 4]} material="floor" /><Box at={[0, 2, -3.9]} size={[2.2, 4, .2]} material="dark" />
    <Lantern at={[0, 1.7, -3.5]} motion={motion} />
    <Arch width={2.3} height={4.12} thickness={.26} depth={.4} material="trim" />
    <pointLight ref={light} position={[0, 2, -1.6]} color="#dfdcaa" intensity={0} distance={6} decay={2} />
    <group ref={door} position={[-.89, .05, .06]}><group position={[.89, 0, 0]}>
      <mesh material={materials.wood} castShadow><extrudeGeometry args={[shape, { depth: .15, bevelEnabled: false, curveSegments: 22 }]} /></mesh>
      <Blocks blocks={runes} material="metal" />
      {[.6, 2.55].map((y) => <Box key={y} at={[0, y, .19]} size={[1.6, .07, .04]} material="metal" />)}
      <mesh position={[.48, 1.45, .24]} material={materials.metal}><torusGeometry args={[.12, .025, 7, 24]} /></mesh>
    </group></group>
  </group>;
}

export function RoomObjects({ house, quality, motion, hovered, selected, disabled, onHover, onSelect }: SceneProps & { hovered: ObjectId | null; selected: ObjectId | null; disabled: boolean; onHover: (id: ObjectId | null) => void; onSelect: (id: ObjectId) => void }) {
  return <>{roomObjects.map(({ id }) => <InteractiveObject key={id} id={id} house={house} hovered={hovered === id} disabled={disabled} onHover={onHover} onSelect={onSelect}>
    {id === "archives" && <Fireplace house={house} motion={motion} quality={quality} active={hovered === id || selected === id} />}
    {id === "notices" && <NoticeBoard motion={motion} active={hovered === id || selected === id} />}
    {id === "members" && <Bookshelf motion={motion} active={hovered === id || selected === id} />}
    {id === "profile" && <Chest motion={motion} open={selected === id} hovered={hovered === id} />}
    {id === "secret" && <SecretDoor motion={motion} open={selected === id} hovered={hovered === id} />}
  </InteractiveObject>)}</>;
}

export function EntranceDoor({ house, progress }: { house: SceneProps["house"]; progress: RefObject<{ value: number }> }) {
  const size = useThree((state) => state.size); const left = useRef<Group>(null); const right = useRef<Group>(null);
  const z = explorationView(house, size.width / size.height).position[2] + 3;
  const { materials } = useMaterials();
  useFrame(() => { const t = Math.max(0, Math.min(1, (progress.current.value - .06) / .35)); const angle = t * t * (3 - 2 * t) * 1.53; if (left.current) left.current.rotation.y = angle; if (right.current) right.current.rotation.y = -angle; });
  return <group position={[0, 0, z]}>
    {house === "hufflepuff" ? <>
      <mesh position={[0, 3.7, .05]} material={materials.wood}><torusGeometry args={[3.8, .25, 10, 64]} /></mesh>
      <group ref={left} position={[-3.7, 3.7, 0]}><mesh position={[3.7, 0, 0]} rotation-x={Math.PI / 2} material={materials.wood}><cylinderGeometry args={[3.7, 3.7, .16, 64]} /></mesh><Orb at={[5.9, 0, .15]} scale={[.13, .13, .09]} /></group>
    </> : <>
      <Arch width={7.7} height={8.1} thickness={.3} depth={.4} material={house === "ravenclaw" ? "metal" : "trim"} />
      {[-1, 1].map((s) => <group key={s} ref={s === -1 ? left : right} position={[s * 3.6, 0, .05]}><group position={[-s * 1.8, 0, 0]}>
        <Box at={[0, 3.7, 0]} size={[3.59, 7.4, .24]} material="wood" />
        {[1.1, 3.7, 6.3].map((y) => <group key={y}><Box at={[0, y, .14]} size={[2.95, 2.03, .1]} material="fabric" /><Box at={[0, y, .22]} size={[2.67, 1.8, .08]} material="wood" /></group>)}
        <Box at={[-s * 1.45, 3.5, .26]} size={[.07, 1.1, .08]} material="metal" />
        <mesh position={[0, 3.7, .25]} material={materials.metal}><torusGeometry args={[.58, .055, 8, 40]} /></mesh>
      </group></group>)}
    </>}
  </group>;
}
