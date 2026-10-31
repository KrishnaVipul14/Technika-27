import { PerspectiveCamera, Vector3 } from "three";
import { roomConfigs, type Vec3 } from "./config";
import type { AssignedHouse } from "./types";

export type CameraPose = { position: Vec3; quaternion: [number, number, number, number]; target: Vec3; fov: number; zoom: number };
export function captureCameraPose(camera: PerspectiveCamera, target: Vector3): CameraPose {
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), target: target.toArray(), fov: camera.fov, zoom: camera.zoom };
}
export function restoreCameraPose(camera: PerspectiveCamera, target: Vector3, pose: CameraPose) {
  camera.position.fromArray(pose.position); camera.quaternion.fromArray(pose.quaternion); target.fromArray(pose.target); camera.fov = pose.fov; camera.zoom = pose.zoom;
  camera.updateProjectionMatrix(); // Deliberately keep the current viewport aspect.
}
export function explorationView(house: AssignedHouse, aspect: number) {
  const config = roomConfigs[house].camera;
  const position: Vec3 = [...config.position];
  if (aspect < 1) position[2] += (1 / aspect - 1) * 15;
  return { position, target: [...config.target] as Vec3, fov: aspect < 1 ? 60 : config.fov };
}
