import type { ObjectId } from "./types";

export type RoomPhase = "loading" | "entering" | "exploring" | "focusing" | "panel" | "closing" | "restoring";
export type RoomState = { phase: RoomPhase; hovered: ObjectId | null; selected: ObjectId | null };
export type RoomAction = { type: "READY" | "SKIP" | "ENTERED" | "FOCUSED" | "CLOSE" | "PANEL_EXITED" | "RESTORED" } | { type: "HOVER"; id: ObjectId | null } | { type: "SELECT"; id: ObjectId };
export const initialRoomState: RoomState = { phase: "loading", hovered: null, selected: null };
export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "READY": return state.phase === "loading" ? { ...state, phase: "entering" } : state;
    case "SKIP": case "ENTERED": return state.phase === "entering" ? { ...state, phase: "exploring" } : state;
    case "HOVER": return state.phase === "exploring" && state.hovered !== action.id ? { ...state, hovered: action.id } : state;
    case "SELECT": return state.phase === "exploring" ? { phase: "focusing", hovered: null, selected: action.id } : state;
    case "FOCUSED": return state.phase === "focusing" ? { ...state, phase: "panel" } : state;
    case "CLOSE": return state.phase === "panel" ? { ...state, phase: "closing" } : state.phase === "focusing" ? { ...state, phase: "restoring" } : state;
    case "PANEL_EXITED": return state.phase === "closing" ? { ...state, phase: "restoring" } : state;
    case "RESTORED": return state.phase === "restoring" ? { phase: "exploring", hovered: null, selected: null } : state;
  }
}
