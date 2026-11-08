import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import type { ObjectId } from "@/lib/common-room/types";
import type { Vec3 } from "@/lib/common-room/config";
import styles from "./common-room.module.css";

const anchors: Record<ObjectId, Vec3> = { archives: [0, 4.4, .6], notices: [0, 2.3, .35], members: [0, 1.9, .5], profile: [0, .8, .63], secret: [0, 1.8, .35] };
const v = new Vector3();

/**
 * Minimal replacement for drei <Html center>. drei 10.7 unmounts its inner root
 * synchronously during React 19 commit, which crashes ("removeChild ... not a child").
 * Here the unmount is deferred to a macrotask.
 */
function DomLabel({ position, children }: { position: Vec3; children: ReactNode }) {
  const { gl, camera, size } = useThree();
  const group = useRef<Group>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const root = useRef<Root | null>(null);

  useLayoutEffect(() => {
    const target = gl.domElement.parentNode as HTMLElement | null;
    if (!target) return;
    const el = (elRef.current = document.createElement("div"));
    el.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:5;";
    target.appendChild(el);
    const r = (root.current = createRoot(el));
    return () => {
      root.current = null; elRef.current = null;
      setTimeout(() => { r.unmount(); el.remove(); });
    };
  }, [gl]);

  useLayoutEffect(() => { root.current?.render(<div style={{ transform: "translate(-50%,-50%)" }}>{children}</div>); });

  useFrame(() => {
    const el = elRef.current;
    if (!group.current || !el) return;
    v.setFromMatrixPosition(group.current.matrixWorld).project(camera);
    const hidden = v.z > 1 || v.z < -1;
    el.style.display = hidden ? "none" : "block";
    el.style.transform = `translate3d(${(v.x * .5 + .5) * size.width}px,${(-v.y * .5 + .5) * size.height}px,0)`;
  });

  return <group ref={group} position={position} />;
}

export function ObjectTooltip({ id, label, visible }: { id: ObjectId; label: string; visible: boolean }) {
  return <DomLabel position={anchors[id]}><span className={styles.objectAnchor} data-object-anchor={id} aria-hidden="true"><span className={styles.tooltip} data-visible={visible}>{label}<small>Explore this object</small></span></span></DomLabel>;
}
