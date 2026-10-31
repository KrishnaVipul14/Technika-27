"use client";

import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ACESFilmicToneMapping, PCFShadowMap } from "three";
import { roomConfigs, type Quality } from "@/lib/common-room/config";
import type { RoomParticipant } from "@/lib/common-room/types";
import { RoomMaterials } from "./scenes/scene-primitives";
import { RoomObjects } from "./room-objects";
import { RenderLifecycle } from "./render-lifecycle";
import styles from "./common-room.module.css";

const SlytherinScene = lazy(() => import("./scenes/slytherin-scene"));
function SceneReady({ onReady }: { onReady: () => void }) {
  const sent = useRef(false);
  useFrame(() => { if (!sent.current) { sent.current = true; onReady(); } });
  return null;
}
export default function RoomCanvas({ participant, quality, motion, onReady }: { participant: RoomParticipant; quality: Quality; motion: boolean; onReady: () => void }) {
  const { house } = participant; const config = roomConfigs[house];
  const [budgetDpr, setBudgetDpr] = useState(() => Math.min(window.devicePixelRatio || 1, 1.75));
  const onDecline = useCallback(() => setBudgetDpr((dpr) => Math.max(.65, dpr * .8)), []);
  const dpr = Math.min(budgetDpr, quality === "low" ? 1 : quality === "medium" ? 1.25 : 1.75);
  return <div className={styles.canvas} data-testid="room-canvas">
    <Canvas frameloop="demand" dpr={dpr} shadows={quality === "low" ? false : { type: PCFShadowMap }} camera={{ position: config.camera.position, fov: config.camera.fov, near: .08, far: 110 }} gl={{ antialias: quality !== "low", powerPreference: "high-performance", alpha: false }} onCreated={({ gl, camera, size }) => {
      gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.35;
      const aspect = size.width / size.height;
      if (aspect < 1) { camera.position.z += (1 / aspect - 1) * 15; if ("fov" in camera) { camera.fov = 60; camera.updateProjectionMatrix(); } }
      camera.lookAt(...config.camera.target);
    }}>
      <RenderLifecycle motion={motion} quality={quality} onDecline={onDecline} />
      <color attach="background" args={[config.palette.fog]} /><fog attach="fog" args={[config.palette.fog, 24, 65]} />
      <hemisphereLight args={["#c4d7cf", "#17130f", 1.5]} />
      <directionalLight position={[2, 8, 7]} color={config.palette.light} intensity={2.5} castShadow={quality !== "low"} shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={.06} />
      <Suspense fallback={null}><RoomMaterials palette={config.palette}>
        {house === "slytherin" && <SlytherinScene house={house} motion={motion} quality={quality} />}
        <RoomObjects house={house} motion={motion} quality={quality} /><SceneReady onReady={onReady} />
      </RoomMaterials></Suspense>
    </Canvas>
  </div>;
}
