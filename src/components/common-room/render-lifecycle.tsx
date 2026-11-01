import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Quality } from "@/lib/common-room/config";
import type { RoomFailure } from "./room-fallback";

export function renderFrameCost(drawMs: number, intervalMs: number, motion: boolean) {
  // Intentional idle time in a static scene is not GPU pressure.
  return Math.max(drawMs, motion ? intervalMs - 1000 / 30 : 0);
}

/** Own one demand-render loop. Yield AFTER drawing, including on software WebGL. */
export function RenderLifecycle({ motion, quality, onDecline, onFailure }: { motion: boolean; quality: Quality; onDecline: () => void; onFailure: (reason: RoomFailure) => void }) {
  const { invalidate, gl } = useThree();
  const previousQuality = useRef<Quality | null>(null); const shadowsAllowed = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const samples = useRef(0); const slow = useRef(0);
  useEffect(() => {
    const visibility = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; if (!document.hidden) invalidate(); };
    const lost = (event: Event) => { event.preventDefault(); onFailure("context-lost"); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => { gl.domElement.removeEventListener("webglcontextlost", lost); document.removeEventListener("visibilitychange", visibility); if (timer.current) clearTimeout(timer.current); };
  }, [invalidate, gl, motion, onFailure]);
  useFrame(({ gl, scene, camera }, delta) => {
    if (document.hidden) return;
    if (previousQuality.current !== quality) { samples.current = 0; slow.current = 0; shadowsAllowed.current = quality !== "low"; previousQuality.current = quality; }
    gl.shadowMap.enabled = shadowsAllowed.current;
    const start = performance.now();
    try { gl.render(scene, camera); } catch { onFailure("loading-error"); return; }
    const drawMs = performance.now() - start;
    const cost = renderFrameCost(drawMs, delta * 1000, motion);
    samples.current++;
    if (samples.current > 2) {
      slow.current = cost > 45 ? slow.current + 1 : Math.max(0, slow.current - 1);
      if (slow.current >= (cost > 120 ? 2 : 4)) { onDecline(); if (cost > 80) { shadowsAllowed.current = false; gl.shadowMap.enabled = false; } slow.current = 0; }
    }
    gl.domElement.dataset.renderMs = String(Math.round(drawMs));
    gl.domElement.dataset.frameMs = String(Math.round(delta * 1000));
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
    gl.domElement.dataset.dpr = String(gl.getPixelRatio());
    gl.domElement.dataset.shadows = String(gl.shadowMap.enabled);
    if (timer.current) clearTimeout(timer.current);
    if (motion) timer.current = setTimeout(invalidate, 1000 / 30);
  }, 1);
  return null;
}
