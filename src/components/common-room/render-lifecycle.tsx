import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Quality } from "@/lib/common-room/config";

/** Own one demand-render loop. Yield AFTER drawing, including on software WebGL. */
export function RenderLifecycle({ motion, quality, onDecline }: { motion: boolean; quality: Quality; onDecline: () => void }) {
  const { invalidate } = useThree();
  const previousQuality = useRef<Quality | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const samples = useRef(0); const slow = useRef(0);
  useEffect(() => {
    const visibility = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; if (!document.hidden) invalidate(); };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => { document.removeEventListener("visibilitychange", visibility); if (timer.current) clearTimeout(timer.current); };
  }, [invalidate, motion]);
  useFrame(({ gl, scene, camera }) => {
    if (document.hidden) return;
    if (previousQuality.current !== quality) { samples.current = 0; slow.current = 0; gl.shadowMap.enabled = quality !== "low"; previousQuality.current = quality; }
    const start = performance.now();
    gl.render(scene, camera);
    const cost = performance.now() - start;
    samples.current++;
    if (samples.current > 3) {
      slow.current = cost > 45 ? slow.current + 1 : Math.max(0, slow.current - 1);
      if (slow.current >= 4) { onDecline(); if (cost > 80) gl.shadowMap.enabled = false; slow.current = 0; }
    }
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
    gl.domElement.dataset.dpr = String(gl.getPixelRatio());
    gl.domElement.dataset.shadows = String(gl.shadowMap.enabled);
    if (timer.current) clearTimeout(timer.current);
    if (motion) timer.current = setTimeout(invalidate, 1000 / 30);
  }, 1);
  return null;
}
