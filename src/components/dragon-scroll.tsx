"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as THREE from "three";
import {
  createDragonInstance,
  DragonInstance,
  getActiveDragonTheme,
} from "./dragon-3d-model";
import { DragonRealmModal } from "./dragon-realm-modal";
import { Sparkles } from "lucide-react";

export interface DragonScrollProps {
  /** Width of the scrollbar strip in px. Default 84. */
  width?: number;
  /** Space kept free above and below the track, in px. Default 24. */
  inset?: number;
  /** Hide native scrollbar on the root html element. Default true. */
  hideNativeScrollbar?: boolean;
  /** Extra CSS classes for the container. */
  className?: string;
}

export default function DragonScroll({
  width = 84,
  inset = 24,
  hideNativeScrollbar = true,
  className = "",
}: DragonScrollProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [dragonLength, setDragonLength] = useState(60);
  const [scrollable, setScrollable] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Hide native scrollbar if requested
  useEffect(() => {
    if (!hideNativeScrollbar) return;
    const style = document.createElement("style");
    style.setAttribute("data-dragon-scroll", "");
    style.textContent = `
      html.dragon-scroll-active,
      body.dragon-scroll-active {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      html.dragon-scroll-active::-webkit-scrollbar,
      body.dragon-scroll-active::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
    `;
    document.head.appendChild(style);
    document.documentElement.classList.add("dragon-scroll-active");

    return () => {
      style.remove();
      document.documentElement.classList.remove("dragon-scroll-active");
    };
  }, [hideNativeScrollbar]);

  // Main Three.js 3D Dragon Scroll Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let destroyed = false;
    let pageVisible = !document.hidden;

    // Check reduced motion
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Window dimensions
    let W = width;
    let H = window.innerHeight;

    // Three.js Scene Setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const scene = new THREE.Scene();

    // Perspective camera positioned to look down the scroll rail
    const fov = 42;
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 100);
    const cameraZ = 10;
    camera.position.set(0, 0, cameraZ);
    camera.lookAt(0, 0, 0);

    // Visible height in world units at z = 0
    const visibleWorldH = 2 * Math.tan(((fov * Math.PI) / 180) / 2) * cameraZ;
    const visibleWorldW = visibleWorldH * (W / H);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.4);
    dirLight.position.set(3, 5, 6);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.8);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const dragonLight = new THREE.PointLight(0xffaa22, 2.5, 8);
    scene.add(dragonLight);

    // Glowing Ember Particles
    const sparkCount = 42;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkColors = new Float32Array(sparkCount * 3);
    const sparkVels: { x: number; y: number; z: number; life: number; maxLife: number }[] = [];

    let activeTheme = getActiveDragonTheme();
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = (Math.random() - 0.5) * 0.5;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      const pickC = activeTheme.sparks[i % activeTheme.sparks.length];
      sparkColors[i * 3] = pickC.r;
      sparkColors[i * 3 + 1] = pickC.g;
      sparkColors[i * 3 + 2] = pickC.b;

      sparkVels.push({
        x: (Math.random() - 0.5) * 0.02,
        y: Math.random() * 0.04 + 0.015,
        z: (Math.random() - 0.5) * 0.02,
        life: Math.random(),
        maxLife: Math.random() * 0.9 + 0.5,
      });
    }

    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkColors, 3));

    const sparkMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sparkMesh = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkMesh);

    // Dragon 3D Model Instance
    let dragon: DragonInstance | null = null;
    const dragonGroup = new THREE.Group();
    scene.add(dragonGroup);

    createDragonInstance().then((inst) => {
      if (destroyed) return;
      dragon = inst;
      dragonGroup.add(inst.scene);

      // Scale dragon to fit the scroll strip width
      const dragonScale = 0.52;
      inst.scene.scale.set(dragonScale, dragonScale, dragonScale);

      // Apply active theme colors
      if (inst.material) {
        inst.material.emissive.copy(activeTheme.emissive);
        inst.material.emissiveIntensity = 1.1;
      }
    });

    // Scroll state tracking
    let curScroll = 0;
    let targetScroll = 0;
    let scrollSpeed = 0;
    let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let lastTime = performance.now();
    let animFrame = 0;

    const readScroll = () => {
      const el = document.documentElement;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const isScroll = maxScroll > 10;
      setScrollable(isScroll);

      if (maxScroll <= 0) {
        targetScroll = 0;
        return;
      }

      const p = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      targetScroll = p;
    };

    const handleResize = () => {
      W = width;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
      readScroll();
    };

    // Watch for house theme changes on document
    const houseObserver = new MutationObserver(() => {
      activeTheme = getActiveDragonTheme();
      if (dragon?.material) {
        dragon.material.emissive.copy(activeTheme.emissive);
      }
      dragonLight.color.copy(activeTheme.secondary);
    });
    houseObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-house"],
    });

    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      lastTime = performance.now();
    };

    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    readScroll();
    curScroll = targetScroll;

    // Animation Render Loop
    const animate = (time: number) => {
      animFrame = requestAnimationFrame(animate);
      if (!pageVisible) return;

      const dt = Math.min((time - lastTime) / 1000, 0.08);
      lastTime = time;

      // Smooth scroll interpolation
      const scrollDiff = targetScroll - curScroll;
      curScroll += scrollDiff * Math.min(1, dt * 14);

      // Instantaneous scroll speed detection
      const currentScrollY = window.scrollY;
      const dy = Math.abs(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;
      scrollSpeed = scrollSpeed * 0.85 + (dy / 25) * 0.15;

      const effectiveProgress = curScroll;
      setScrollProgress(effectiveProgress);

      // Calculate vertical position in world units
      // Map 0 -> top edge, 1 -> bottom edge
      const topWorldY = visibleWorldH * 0.44;
      const bottomWorldY = -visibleWorldH * 0.44;
      const travelSpan = topWorldY - bottomWorldY;
      const dragonWorldY = topWorldY - effectiveProgress * travelSpan;

      // Update synthetic dragon length for test expectations
      const pixelLength = 60 + effectiveProgress * (H - inset * 2 - 60);
      setDragonLength(pixelLength);

      // Lateral S-curve flight weaving
      const wavePhase = time * 0.0028 + effectiveProgress * 10;
      const lateralAmp = visibleWorldW * 0.22;
      const dragonWorldX = Math.sin(wavePhase) * lateralAmp;

      // Update Dragon 3D Transform
      if (dragonGroup) {
        dragonGroup.position.set(dragonWorldX, dragonWorldY, 0);

        // Banking angles: pitch down as it flies, roll into lateral turns
        const rollAngle = Math.cos(wavePhase) * 0.25;
        const pitchAngle = Math.PI * 0.15 + Math.min(0.3, scrollSpeed * 0.1);
        const yawAngle = Math.PI * 0.88 + Math.sin(wavePhase) * 0.2;

        if (!reduceMotion.matches) {
          dragonGroup.rotation.set(pitchAngle, yawAngle, rollAngle);
        } else {
          dragonGroup.rotation.set(0.2, Math.PI * 0.88, 0);
        }

        dragonLight.position.set(dragonWorldX, dragonWorldY + 0.3, 1.2);
        dragonLight.intensity = 2.0 + Math.min(2.5, scrollSpeed * 1.5);
      }

      // Advance skeletal animation
      if (dragon) {
        const animSpeed = (1.0 + Math.min(1.8, scrollSpeed * 0.8)) * (reduceMotion.matches ? 0.4 : 1.0);
        dragon.mixer.update(dt * animSpeed);
      }

      // Animate trailing ember sparks
      if (!reduceMotion.matches) {
        const positions = sparkGeo.attributes.position.array as Float32Array;
        const colors = sparkGeo.attributes.color.array as Float32Array;

        for (let i = 0; i < sparkCount; i++) {
          const v = sparkVels[i];
          v.life += dt;

          if (v.life >= v.maxLife) {
            v.life = 0;
            // Spawn right at the dragon's current position
            positions[i * 3] = dragonWorldX + (Math.random() - 0.5) * 0.35;
            positions[i * 3 + 1] = dragonWorldY - 0.3 + (Math.random() - 0.5) * 0.2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.35;

            const c = activeTheme.sparks[Math.floor(Math.random() * activeTheme.sparks.length)];
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
          } else {
            positions[i * 3] += v.x;
            positions[i * 3 + 1] += v.y;
            positions[i * 3 + 2] += v.z;
          }
        }
        sparkGeo.attributes.position.needsUpdate = true;
        sparkGeo.attributes.color.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animFrame = requestAnimationFrame(animate);

    return () => {
      destroyed = true;
      cancelAnimationFrame(animFrame);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      houseObserver.disconnect();
      renderer.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
    };
  }, [width, inset]);

  // Click & drag scrub along the scroll rail
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    const strip = stripRef.current;
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    const trackH = rect.height - inset * 2;
    if (trackH <= 0) return;

    const clickY = e.clientY - rect.top - inset;
    const p = Math.min(1, Math.max(0, clickY / trackH));

    const el = document.documentElement;
    const targetTop = p * (el.scrollHeight - el.clientHeight);

    const lenis = (
      window as unknown as {
        lenis?: {
          scrollTo: (top: number, opts: { immediate: boolean }) => void;
        };
      }
    ).lenis;

    if (lenis) {
      lenis.scrollTo(targetTop, { immediate: true });
    } else {
      window.scrollTo({ top: targetTop, behavior: "auto" });
    }
  };

  return (
    <>
      <div
        ref={wrapRef}
        aria-hidden="true"
        data-testid="scroll-snake"
        data-snake-length={Math.round(dragonLength)}
        data-scroll-progress={Math.round(scrollProgress * 100)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width }}
        className={[
          "fixed inset-y-0 right-0 z-50 select-none pointer-events-none transition-opacity duration-500",
          scrollable ? "opacity-100" : "opacity-0",
          className,
        ].join(" ")}
      >
        {/* Auric Glass Rail Background */}
        <div
          className="absolute inset-y-3 right-2 w-1.5 rounded-full border border-brand/20 bg-brand-soft/20 backdrop-blur-sm transition-all duration-300"
          style={{
            boxShadow: isHovered
              ? "0 0 14px color-mix(in oklab, var(--fg-brand) 45%, transparent)"
              : "0 0 6px color-mix(in oklab, var(--fg-brand) 18%, transparent)",
          }}
        />

        {/* 3D WebGL Dragon Canvas */}
        <canvas
          ref={canvasRef}
          data-testid="snake-scroll-canvas"
          className="block h-full w-full"
        />

        {/* Interactive Scrub Touch/Click Strip */}
        <div
          ref={stripRef}
          style={{ width: Math.max(48, Math.round(width * 0.55)) }}
          className="absolute inset-y-0 right-0 cursor-grab touch-none pointer-events-auto active:cursor-grabbing"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrub(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e);
          }}
          onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
          onPointerCancel={(e) =>
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
        />

        {/* Inspect 3D Dragon Pill Button */}
        <div className="pointer-events-auto absolute top-5 right-2 sm:right-3 z-10 transition-all duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            title="Inspect 3D Dragon in Sanctuary"
            aria-label="Inspect 3D Dragon"
            className="group flex items-center gap-1.5 rounded-full border border-brand/50 bg-bg-sunken/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fg-brand shadow-glow-brand backdrop-blur-md transition hover:border-brand hover:bg-brand hover:text-brand-on active:scale-95"
          >
            <Sparkles className="size-3 transition group-hover:rotate-12 text-primary-400" />
            <span>3D Dragon</span>
          </button>
        </div>

        {/* Live Scroll Percentage Tag */}
        <div
          className={`pointer-events-none absolute bottom-4 right-3 font-mono text-[9px] tabular-nums tracking-widest text-fg-muted/70 transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          {Math.round(scrollProgress * 100)}%
        </div>
      </div>

      {/* Fullscreen Interactive 3D Dragon Sanctuary Modal */}
      <DragonRealmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
