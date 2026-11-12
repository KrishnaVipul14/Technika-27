"use client";

import { lazy, Suspense, useCallback, useRef, useState, type Dispatch, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, SoftShadows } from "@react-three/drei";
import { ACESFilmicToneMapping, PCFShadowMap } from "three";
import { roomConfigs, type Quality } from "@/lib/common-room/config";
import type { ObjectId, RoomParticipant } from "@/lib/common-room/types";
import type { RoomState, RoomAction } from "@/lib/common-room/interaction";
import { explorationView } from "@/lib/common-room/camera";
import { RoomMaterials } from "./scenes/scene-primitives";
import { RoomObjects, EntranceDoor } from "./room-objects";
import { CameraController } from "./camera-controller";
import { RenderLifecycle } from "./render-lifecycle";
import type { RoomFailure } from "./room-fallback";
import { sceneLoaders } from "./room-assets";
import styles from "./common-room.module.css";

const SlytherinScene = lazy(sceneLoaders.slytherin);
const GryffindorScene = lazy(sceneLoaders.gryffindor);
const RavenclawScene = lazy(sceneLoaders.ravenclaw);
const HufflepuffScene = lazy(sceneLoaders.hufflepuff);
function SceneReady({ onReady }: { onReady: () => void }) {
  const sent = useRef(false);
  useFrame(() => { if (!sent.current) { sent.current = true; onReady(); } });
  return null;
}
export default function RoomCanvas({ participant, quality, motion, state, dispatch, controlsLocked, entranceRef, onSelect, onReady, onFailure }: { participant: RoomParticipant; quality: Quality; motion: boolean; state: RoomState; dispatch: Dispatch<RoomAction>; controlsLocked: boolean; entranceRef: RefObject<HTMLDivElement | null>; onSelect: (id: ObjectId) => void; onReady: () => void; onFailure: (reason: RoomFailure) => void }) {
  const progress = useRef({ value: 0 });
  const { house } = participant; const config = roomConfigs[house];
  const [budgetDpr, setBudgetDpr] = useState(() => Math.min(window.devicePixelRatio || 1, 2));
  const onDecline = useCallback(() => setBudgetDpr((dpr) => Math.max(.65, dpr * .8)), []);
  const dpr = Math.min(budgetDpr, quality === "low" ? 1.5 : quality === "medium" ? 1.5 : 2);
  return <div className={styles.canvas} data-testid="room-canvas" data-hovered={state.hovered || ""}>
    <Canvas frameloop="demand" dpr={dpr} shadows={quality === "low" ? false : { type: PCFShadowMap }} camera={{ position: config.camera.position, fov: config.camera.fov, near: .08, far: 110 }} gl={{ antialias: true, powerPreference: "high-performance", alpha: false }} onCreated={({ gl, camera, size }) => {
      gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.35;
      gl.domElement.tabIndex = 0; gl.domElement.setAttribute("aria-label", "Interactive 3D common room. Use Explore the room for keyboard navigation.");
      const view = explorationView(house, size.width / size.height);
      camera.position.fromArray(view.position); if ("fov" in camera) { camera.fov = view.fov; camera.updateProjectionMatrix(); }
      camera.lookAt(...view.target);
    }}>
      <RenderLifecycle motion={motion} quality={quality} onDecline={onDecline} onFailure={onFailure} />
      {quality === "high" && <SoftShadows size={28} samples={14} focus={.85} />}
      <color attach="background" args={[config.palette.fog]} /><fog attach="fog" args={[config.palette.fog, 24, 65]} />
      <hemisphereLight args={["#c4d7cf", "#17130f", 1.5]} />
      <directionalLight position={[2, 8, 7]} color={config.palette.light} intensity={2.5} castShadow={quality !== "low"} shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={.06} />
      <Suspense fallback={null}><RoomMaterials palette={config.palette}>
        {/* Local, generated reflection environment (no HDR download) so gold, brass and glass read as metal. */}
        <Environment resolution={quality === "high" ? 128 : 64} frames={1} environmentIntensity={.45}>
          <color attach="background" args={[config.palette.fog]} />
          <Lightformer form="rect" intensity={3} color={config.palette.light} position={[0, 6, -9]} scale={[14, 6, 1]} />
          <Lightformer form="circle" intensity={4} color="#ffa253" position={[-6, 2, -4]} scale={3} />
          <Lightformer form="rect" intensity={1.2} color={config.palette.fabric} position={[0, 2, 12]} scale={[20, 4, 1]} />
        </Environment>
        <CameraController house={house} state={state} dispatch={dispatch} motion={motion} controlsLocked={controlsLocked} progress={progress} entranceRef={entranceRef} />
        {house === "slytherin" && <SlytherinScene house={house} motion={motion} quality={quality} />}
        {house === "gryffindor" && <GryffindorScene house={house} motion={motion} quality={quality} />}
        {house === "ravenclaw" && <RavenclawScene house={house} motion={motion} quality={quality} />}
        {house === "hufflepuff" && <HufflepuffScene house={house} motion={motion} quality={quality} />}
        <RoomObjects house={house} motion={motion} quality={quality} hovered={state.hovered} selected={state.selected} disabled={state.phase !== "exploring" || controlsLocked} onHover={(id) => dispatch({ type: "HOVER", id })} onSelect={onSelect} />
        <EntranceDoor house={house} progress={progress} />
        {/* Soft pooled shadows under the furniture, grounding the model in the floor. */}
        <ContactShadows position={[0, .015, 0]} scale={30} far={5} blur={2.4} opacity={quality === "low" ? .35 : .5} resolution={quality === "high" ? 512 : 256} color="#000000" />
        <SceneReady onReady={onReady} />
      </RoomMaterials></Suspense>
    </Canvas>
  </div>;
}
