import { useEffect, useLayoutEffect, useRef, type Dispatch, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler, PerspectiveCamera, Quaternion, Vector2, Vector3 } from "three";
import { gsap } from "gsap";
import { roomConfigs } from "@/lib/common-room/config";
import { captureCameraPose, explorationView, restoreCameraPose, type CameraPose } from "@/lib/common-room/camera";
import type { RoomAction, RoomPhase, RoomState } from "@/lib/common-room/interaction";
import type { AssignedHouse } from "@/lib/common-room/types";

export function CameraController({ house, state, dispatch, motion, controlsLocked, progress: progressRef, entranceRef }: { house: AssignedHouse; state: RoomState; dispatch: Dispatch<RoomAction>; motion: boolean; controlsLocked: boolean; progress: RefObject<{ value: number }>; entranceRef: RefObject<HTMLDivElement | null> }) {
  const get = useThree((value) => value.get);
  const size = useThree((value) => value.size);
  const target = useRef(new Vector3(...roomConfigs[house].camera.target));
  const baseline = useRef<CameraPose | null>(null); const saved = useRef<CameraPose | null>(null);
  const animation = useRef<{ tween: gsap.core.Tween; started: number; suspended: number | null } | null>(null);
  const previous = useRef<RoomPhase>("loading"); const lastAspect = useRef(0); const savedAspect = useRef(0);
  const pointer = useRef(new Vector2()); const origin = useRef(new Vector2()); const strength = useRef(1);
  const scratch = useRef({ position: new Vector3(), target: new Vector3(), right: new Vector3(), up: new Vector3(), quaternion: new Quaternion(), offset: new Quaternion(), angles: new Euler(0, 0, 0, "YXZ") });
  useEffect(() => {
    const move = (event: PointerEvent) => { pointer.current.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2); strength.current = event.pointerType === "touch" ? .3 : 1; };
    const visibility = () => { const active = animation.current; if (!active) return; if (document.hidden) active.suspended = performance.now(); else if (active.suspended !== null) { active.started += performance.now() - active.suspended; active.suspended = null; } };
    window.addEventListener("pointermove", move, { passive: true }); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("pointermove", move); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useLayoutEffect(() => {
    const { camera: source, invalidate } = get(); const camera = source as PerspectiveCamera;
    const aspect = size.width / size.height; const view = explorationView(house, aspect); const from = previous.current;
    previous.current = state.phase;
    let tween: gsap.core.Tween | null = null;
    const frameView = () => { camera.position.fromArray(view.position); camera.fov = view.fov; target.current.fromArray(view.target); camera.lookAt(target.current); camera.updateProjectionMatrix(); };
    const remember = () => { baseline.current = captureCameraPose(camera, target.current); origin.current.copy(pointer.current); lastAspect.current = aspect; };
    if (state.phase === "entering") {
      frameView(); camera.position.z += 7; camera.position.y -= .3; camera.lookAt(target.current); progressRef.current.value = 0;
      if (!motion) { frameView(); progressRef.current.value = 1; dispatch({ type: "ENTERED" }); }
      else tween = gsap.to(progressRef.current, { value: 1, duration: 4, paused: true, ease: "none", onComplete: () => dispatch({ type: "ENTERED" }) });
    } else if (state.phase === "exploring") {
      if (from === "entering" || from === "loading" || (!saved.current && aspect !== lastAspect.current)) frameView();
      else if (from === "restoring" && saved.current && aspect !== savedAspect.current) {
        // Keep the saved view, then reconcile only framing when the viewport changed.
        const old = explorationView(house, savedAspect.current);
        camera.position.z += view.position[2] - old.position[2]; camera.fov = view.fov; camera.lookAt(target.current); camera.updateProjectionMatrix();
      }
      progressRef.current.value = 1; saved.current = null; remember();
    } else if (state.phase === "focusing" && state.selected) {
      if (!saved.current) { saved.current = captureCameraPose(camera, target.current); savedAspect.current = aspect; }
      const object = roomConfigs[house].objects[state.selected];
      const destination = new Vector3(...object.focusPosition); const focus = new Vector3(...object.focusTarget);
      if (aspect >= 1) focus.x += .55;
      const start = camera.position.clone(); const startTarget = target.current.clone(); const amount = { value: 0 };
      const update = () => { camera.position.lerpVectors(start, destination, amount.value); target.current.lerpVectors(startTarget, focus, amount.value); camera.lookAt(target.current); };
      if (!motion) { amount.value = 1; update(); dispatch({ type: "FOCUSED" }); }
      else tween = gsap.to(amount, { value: 1, duration: .85, paused: true, ease: "power2.inOut", onUpdate: update, onComplete: () => dispatch({ type: "FOCUSED" }) });
    } else if (state.phase === "restoring") {
      const pose = saved.current;
      const finish = () => { if (pose) restoreCameraPose(camera, target.current, pose); else frameView(); origin.current.copy(pointer.current); dispatch({ type: "RESTORED" }); };
      if (!motion || !pose) finish();
      else {
        const start = camera.position.clone(); const startRotation = camera.quaternion.clone(); const startTarget = target.current.clone();
        const destination = new Vector3(...pose.position), rotation = new Quaternion(...pose.quaternion), focus = new Vector3(...pose.target); const amount = { value: 0 };
        tween = gsap.to(amount, { value: 1, duration: .75, paused: true, ease: "power2.inOut", onUpdate: () => { camera.position.lerpVectors(start, destination, amount.value); camera.quaternion.slerpQuaternions(startRotation, rotation, amount.value); target.current.lerpVectors(startTarget, focus, amount.value); }, onComplete: finish });
      }
    }
    // Drive paused GSAP sequences with this room's clock, not its global lag smoothing.
    // Otherwise software WebGL can stretch a four-second entrance into a minute.
    if (tween) animation.current = { tween, started: performance.now(), suspended: document.hidden ? performance.now() : null };
    invalidate();
    return () => { tween?.kill(); if (animation.current?.tween === tween) animation.current = null; };
  }, [state.phase, state.selected, house, motion, get, dispatch, size.width, size.height, progressRef]);
  useFrame(({ camera }, delta) => {
    if (document.hidden) return;
    const active = animation.current;
    if (active && active.suspended === null) active.tween.totalTime(Math.min(active.tween.duration(), (performance.now() - active.started) / 1000));
    if (state.phase === "entering") {
      const value = progressRef.current.value; const view = explorationView(house, size.width / size.height);
      const t = Math.max(0, Math.min(1, (value - .18) / .73)); const eased = t * t * (3 - 2 * t);
      camera.position.set(view.position[0], view.position[1] - .3 * (1 - eased), view.position[2] + 7 * (1 - eased)); camera.lookAt(target.current);
      if (entranceRef.current) { entranceRef.current.style.setProperty("--entrance-progress", String(value)); entranceRef.current.style.setProperty("--welcome-opacity", String(Math.min(1, Math.max(0, (value - .64) * 7)))); entranceRef.current.querySelector("[role=progressbar]")?.setAttribute("aria-valuenow", String(Math.round(value * 100))); }
      return;
    }
    if (state.phase !== "exploring" || !motion || controlsLocked || !baseline.current) return;
    const base = baseline.current; const work = scratch.current;
    const dx = Math.max(-1, Math.min(1, pointer.current.x - origin.current.x)) * strength.current;
    const dy = Math.max(-1, Math.min(1, pointer.current.y - origin.current.y)) * strength.current;
    work.quaternion.fromArray(base.quaternion); work.right.set(1, 0, 0).applyQuaternion(work.quaternion); work.up.set(0, 1, 0).applyQuaternion(work.quaternion);
    work.position.fromArray(base.position).addScaledVector(work.right, dx * .13).addScaledVector(work.up, dy * .075);
    work.offset.setFromEuler(work.angles.set(dy * .026, -dx * .043, 0, "YXZ")); work.quaternion.multiply(work.offset);
    if (dx === 0 && dy === 0) work.target.fromArray(base.target);
    else work.target.set(0, 0, -1).applyQuaternion(work.quaternion).multiplyScalar(Math.hypot(base.position[0] - base.target[0], base.position[1] - base.target[1], base.position[2] - base.target[2])).add(work.position);
    const damping = 1 - Math.exp(-5 * Math.min(delta, .05));
    camera.position.lerp(work.position, damping); camera.quaternion.slerp(work.quaternion, damping); target.current.lerp(work.target, damping);
  });
  return null;
}
