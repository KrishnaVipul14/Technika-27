import { Html } from "@react-three/drei";
import type { ObjectId } from "@/lib/common-room/types";
import type { Vec3 } from "@/lib/common-room/config";
import styles from "./common-room.module.css";

const anchors: Record<ObjectId, Vec3> = { archives: [0, 4.4, .6], notices: [0, 2.3, .35], members: [0, 1.9, .5], profile: [0, .8, .63], secret: [0, 1.8, .35] };
export function ObjectTooltip({ id, label, visible }: { id: ObjectId; label: string; visible: boolean }) {
  return <Html position={anchors[id]} center zIndexRange={[5, 4]} style={{ pointerEvents: "none" }}><span className={styles.objectAnchor} data-object-anchor={id} aria-hidden="true"><span className={styles.tooltip} data-visible={visible}>{label}<small>Explore this object</small></span></span></Html>;
}
