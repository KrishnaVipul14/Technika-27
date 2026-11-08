import type { ReactNode } from "react";
import type { AssignedHouse, ObjectId } from "@/lib/common-room/types";
import { roomConfigs } from "@/lib/common-room/config";
import { roomObjects } from "@/lib/common-room/content";
import { ObjectTooltip } from "./object-tooltip";

export function InteractiveObject({ id, house, hovered, disabled, onHover, onSelect, children }: { id: ObjectId; house: AssignedHouse; hovered: boolean; disabled: boolean; onHover: (id: ObjectId | null) => void; onSelect: (id: ObjectId) => void; children: ReactNode }) {
  const placement = roomConfigs[house].objects[id];
  return <group name={`object-${id}`} position={placement.position} rotation-y={placement.rotationY}
    onPointerOver={(event) => { event.stopPropagation(); if (!disabled) onHover(id); }}
    onPointerOut={() => onHover(null)}
    onPointerDown={(event) => { event.stopPropagation(); if (!disabled) (event.nativeEvent.target as HTMLCanvasElement).focus({ preventScroll: true }); }}
    onClick={(event) => { event.stopPropagation(); if (!disabled && event.delta < 6) onSelect(id); }}>
    {children}<ObjectTooltip id={id} label={roomObjects.find((object) => object.id === id)!.label} visible={hovered && !disabled} />
  </group>;
}
