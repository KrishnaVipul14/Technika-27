"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  createDragonInstance,
  DragonInstance,
  HOUSE_DRAGON_THEMES,
  HouseDragonTheme,
} from "./dragon-3d-model";
import { X, Play, Pause, Flame, Sparkles, Compass, Eye } from "lucide-react";

interface DragonRealmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DragonRealmModal({ isOpen, onClose }: DragonRealmModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [fireBreath, setFireBreath] = useState(true);
  const [activeHouse, setActiveHouse] = useState<string>(() => {
    if (typeof document === "undefined") return "gryffindor";
    const house = (document.documentElement.dataset.house || "gryffindor").toLowerCase();
    return house in HOUSE_DRAGON_THEMES ? house : "gryffindor";
  });
  const [cameraPreset, setCameraPreset] = useState<string>("default");

  // Keep refs for active Three.js state to avoid teardowns on state tweaks
  const dragonRef = useRef<DragonInstance | null>(null);
  const speedRef = useRef(speed);
  const isPlayingRef = useRef(isPlaying);
  const fireBreathRef = useRef(fireBreath);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const themeRef = useRef<HouseDragonTheme>(HOUSE_DRAGON_THEMES.gryffindor);
  const fireLightRef = useRef<THREE.PointLight | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (dragonRef.current) {
      if (isPlaying) {
        dragonRef.current.action.paused = false;
      } else {
        dragonRef.current.action.paused = true;
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    fireBreathRef.current = fireBreath;
  }, [fireBreath]);

  useEffect(() => {
    const currentTheme = HOUSE_DRAGON_THEMES[activeHouse] || HOUSE_DRAGON_THEMES.gryffindor;
    themeRef.current = currentTheme;

    if (dragonRef.current?.material) {
      dragonRef.current.material.emissive.copy(currentTheme.emissive);
      dragonRef.current.material.emissiveIntensity = fireBreath ? 1.4 : 0.8;
    }
    if (fireLightRef.current) {
      fireLightRef.current.color.copy(currentTheme.secondary);
    }
  }, [activeHouse, fireBreath]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize and run Three.js scene when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0705, 0.025);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 8.5);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 16;
    controls.minDistance = 2.5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // Atmospheric lighting
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.6);
    rimLight.position.set(-6, -3, -6);
    scene.add(rimLight);

    const fireLight = new THREE.PointLight(0xffaa22, 3.5, 12, 1.5);
    fireLight.position.set(0, 0.5, 2);
    scene.add(fireLight);
    fireLightRef.current = fireLight;

    // Fire breath / mystical ember particle system
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    const colorArray = new Float32Array(particleCount * 3);
    const pVelocities: { x: number; y: number; z: number; life: number; maxLife: number }[] = [];

    const defaultTheme = themeRef.current;
    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 1.5;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 1.0;
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

      const pickColor = defaultTheme.sparks[i % defaultTheme.sparks.length];
      colorArray[i * 3] = pickColor.r;
      colorArray[i * 3 + 1] = pickColor.g;
      colorArray[i * 3 + 2] = pickColor.b;

      pVelocities.push({
        x: (Math.random() - 0.5) * 0.04,
        y: Math.random() * 0.05 + 0.02,
        z: (Math.random() - 0.5) * 0.04,
        life: Math.random(),
        maxLife: Math.random() * 1.2 + 0.8,
      });
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Load dragon instance
    let isDisposed = false;
    createDragonInstance().then((instance) => {
      if (isDisposed) return;
      dragonRef.current = instance;
      scene.add(instance.scene);

      // Apply initial theme
      const curTheme = themeRef.current;
      if (instance.material) {
        instance.material.emissive.copy(curTheme.emissive);
        instance.material.emissiveIntensity = 1.2;
      }
    });

    let animationFrameId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (dragonRef.current && isPlayingRef.current) {
        dragonRef.current.mixer.update(dt * speedRef.current);
      }

      controls.update();

      // Fire light flicker and subtle orbit
      if (fireLightRef.current) {
        const flicker = 0.85 + Math.sin(time * 0.012) * 0.15;
        fireLightRef.current.intensity = (fireBreathRef.current ? 4.2 : 1.8) * flicker;
        fireLightRef.current.position.x = Math.sin(time * 0.002) * 1.8;
        fireLightRef.current.position.z = Math.cos(time * 0.002) * 2.2;
      }

      // Animate breath embers
      if (fireBreathRef.current) {
        particles.visible = true;
        const positions = particleGeo.attributes.position.array as Float32Array;
        const colors = particleGeo.attributes.color.array as Float32Array;
        const theme = themeRef.current;

        for (let i = 0; i < particleCount; i++) {
          const v = pVelocities[i];
          v.life += dt;

          if (v.life >= v.maxLife) {
            v.life = 0;
            // Respawn near dragon head area
            positions[i * 3] = (Math.random() - 0.5) * 0.8 + 0.2;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.6 - 0.2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8 + 1.2;

            const c = theme.sparks[Math.floor(Math.random() * theme.sparks.length)];
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
          } else {
            positions[i * 3] += v.x;
            positions[i * 3 + 1] += v.y;
            positions[i * 3 + 2] += v.z;
          }
        }
        particleGeo.attributes.position.needsUpdate = true;
        particleGeo.attributes.color.needsUpdate = true;
      } else {
        particles.visible = false;
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [isOpen]);

  const setCameraAngle = (preset: string) => {
    setCameraPreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    switch (preset) {
      case "head":
        camera.position.set(0.6, 0.4, 3.8);
        controls.target.set(0, 0, 0);
        break;
      case "profile":
        camera.position.set(7.5, 1.2, 0);
        controls.target.set(0, 0, 0);
        break;
      case "aerial":
        camera.position.set(0, 8.5, 0.5);
        controls.target.set(0, 0, 0);
        break;
      case "low":
        camera.position.set(-3.5, -2.5, 5.5);
        controls.target.set(0, 0.5, 0);
        break;
      default:
        camera.position.set(0, 1.8, 8.5);
        controls.target.set(0, 0, 0);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dragon-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-2xl transition-all duration-300"
    >
      <div
        ref={containerRef}
        className="relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-[#120a06]/90 via-[#0d0705]/95 to-[#060403]"
      >
        {/* Top Header Bar */}
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-brand/20 bg-surface/50 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full border border-brand/40 bg-brand-soft text-fg-brand shadow-glow-brand">
              🐉
            </span>
            <div>
              <h2
                id="dragon-modal-title"
                className="font-serif text-lg font-semibold tracking-wide text-fg-strong sm:text-xl"
              >
                Celestial 3D Dragon
              </h2>
              <p className="text-xs text-fg-muted">
                Interactive real-time 3D model &amp; skeletal flight simulation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close 3D Dragon Sanctuary"
            className="group flex size-10 items-center justify-center rounded-full border border-line-strong bg-surface/60 text-fg transition hover:border-brand/50 hover:bg-brand-soft active:scale-95"
          >
            <X className="size-5 transition group-hover:rotate-90" />
          </button>
        </header>

        {/* 3D WebGL Canvas */}
        <div className="relative h-full w-full">
          <canvas
            ref={canvasRef}
            className="block h-full w-full cursor-grab active:cursor-grabbing"
            aria-label="Interactive 3D dragon view. Drag to rotate, scroll to zoom."
          />

          {/* Interactive Hint */}
          <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-brand/20 bg-bg-sunken/70 px-4 py-1.5 text-xs text-fg-muted backdrop-blur-md sm:bottom-8">
            <span className="flex items-center gap-2">
              <Compass className="size-3.5 text-fg-brand" />
              Drag to orbit · Pinch / scroll to zoom · Click presets to inspect
            </span>
          </div>
        </div>

        {/* Controls Overlay Panel */}
        <footer className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 border-t border-brand/20 bg-surface/70 px-6 py-4 backdrop-blur-lg">
          {/* Playback & Speed */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause animation" : "Play animation"}
              className="flex items-center gap-2 rounded-full border border-brand/30 bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-on transition hover:bg-brand-hover active:scale-95"
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              onClick={() => setFireBreath(!fireBreath)}
              aria-label="Toggle fire breath particles"
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                fireBreath
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "border-line-strong bg-surface/40 text-fg-muted hover:border-brand/40"
              }`}
            >
              <Flame className="size-3.5" />
              <span>Dragonfire</span>
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-line-strong bg-surface/40 px-3 py-1 sm:flex">
              <span className="text-[11px] uppercase tracking-wider text-fg-muted">Speed:</span>
              {[0.5, 1.0, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded px-1.5 py-0.5 text-xs font-mono transition ${
                    speed === s
                      ? "bg-brand text-brand-on font-bold"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Camera Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="mr-1 hidden text-[11px] uppercase tracking-wider text-fg-muted md:inline">
              <Eye className="inline size-3.5 mr-1" />
              Angle:
            </span>
            {[
              { id: "default", label: "Front Orbit" },
              { id: "head", label: "Snout & Fangs" },
              { id: "profile", label: "Full Flight" },
              { id: "aerial", label: "Aerial" },
              { id: "low", label: "Cinematic" },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setCameraAngle(preset.id)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  cameraPreset === preset.id
                    ? "border-brand bg-brand-soft text-fg-brand font-semibold shadow-sm"
                    : "border-line-strong bg-surface/30 text-fg-muted hover:border-brand/40 hover:text-fg"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* House Theme Selector */}
          <div className="flex items-center gap-1.5">
            <span className="mr-1 hidden text-[11px] uppercase tracking-wider text-fg-muted lg:inline">
              <Sparkles className="inline size-3.5 mr-1" />
              Aura:
            </span>
            {(
              [
                { id: "gryffindor", label: "Gryffindor", color: "#c83b28" },
                { id: "slytherin", label: "Slytherin", color: "#185a38" },
                { id: "ravenclaw", label: "Ravenclaw", color: "#1c3b6a" },
                { id: "hufflepuff", label: "Hufflepuff", color: "#cf8c1e" },
              ] as const
            ).map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setActiveHouse(h.id);
                  document.documentElement.dataset.house = h.id;
                }}
                title={h.label}
                className={`flex size-7 items-center justify-center rounded-full border transition active:scale-90 ${
                  activeHouse === h.id
                    ? "border-white scale-110 shadow-[0_0_10px_currentColor]"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: h.color, color: h.color }}
              >
                <span className="size-2 rounded-full bg-white/80" />
              </button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
