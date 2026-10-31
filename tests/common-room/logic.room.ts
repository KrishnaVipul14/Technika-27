import { test, expect } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { initialRoomState, roomReducer, type RoomState } from "../../src/lib/common-room/interaction";
import { captureCameraPose, restoreCameraPose } from "../../src/lib/common-room/camera";

test("interaction reducer rejects competing selections and stale completions", () => {
  const panel: RoomState = { phase: "panel", hovered: null, selected: "archives" };
  expect(roomReducer(panel, { type: "SELECT", id: "profile" })).toBe(panel);
  expect(roomReducer(panel, { type: "ENTERED" })).toBe(panel);
  expect(roomReducer(panel, { type: "FOCUSED" })).toBe(panel);
  expect(roomReducer(panel, { type: "RESTORED" })).toBe(panel);
  expect(roomReducer(initialRoomState, { type: "SELECT", id: "secret" })).toBe(initialRoomState);
});
test("entrance skip and a full interaction return to exploration", () => {
  let state = roomReducer(initialRoomState, { type: "READY" });
  expect(state.phase).toBe("entering");
  state = roomReducer(state, { type: "SKIP" });
  expect(state.phase).toBe("exploring");
  state = roomReducer(state, { type: "HOVER", id: "notices" });
  expect(state.hovered).toBe("notices");
  state = roomReducer(state, { type: "SELECT", id: "notices" });
  expect(state).toEqual({ phase: "focusing", hovered: null, selected: "notices" });
  state = roomReducer(state, { type: "FOCUSED" });
  state = roomReducer(state, { type: "CLOSE" });
  expect(state.phase).toBe("closing");
  state = roomReducer(state, { type: "PANEL_EXITED" });
  expect(state.phase).toBe("restoring");
  state = roomReducer(state, { type: "RESTORED" });
  expect(state).toEqual({ phase: "exploring", hovered: null, selected: null });
});
test("interaction close during focus ignores the cancelled focus completion", () => {
  const state = roomReducer({ phase: "focusing", hovered: null, selected: "secret" }, { type: "CLOSE" });
  expect(state.phase).toBe("restoring");
  expect(roomReducer(state, { type: "FOCUSED" })).toBe(state);
});
test("camera pose is a numeric snapshot, restores exactly and preserves resized aspect", () => {
  const camera = new PerspectiveCamera(47, 1.6, .1, 100);
  const target = new Vector3(-1, 1, -5);
  camera.position.set(1, 2, 3); camera.lookAt(target); camera.zoom = 1.2;
  const quaternion = camera.quaternion.toArray();
  const saved = captureCameraPose(camera, target);
  camera.position.set(9, 9, 9); camera.rotation.set(.5, .7, .2); camera.fov = 75; camera.zoom = .5; camera.aspect = .48; target.set(0, 0, 0);
  expect(saved.position).toEqual([1, 2, 3]); expect(saved.target).toEqual([-1, 1, -5]);
  restoreCameraPose(camera, target, saved);
  expect(camera.position.toArray()).toEqual([1, 2, 3]);
  expect(camera.quaternion.toArray()).toEqual(quaternion);
  expect(target.toArray()).toEqual([-1, 1, -5]);
  expect(camera.fov).toBe(47); expect(camera.zoom).toBe(1.2); expect(camera.aspect).toBe(.48);
});
