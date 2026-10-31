import type { AssignedHouse, ObjectId } from "./types";

export type Vec3 = [number, number, number];
export type Quality = "low" | "medium" | "high";
export type SceneProps = { house: AssignedHouse; quality: Quality; motion: boolean };
export type ObjectPlacement = { position: Vec3; rotationY: number; focusPosition: Vec3; focusTarget: Vec3 };
export type RoomPalette = { stone: string; trim: string; wood: string; metal: string; fabric: string; floor: string; light: string; fog: string };
export type HouseRoomConfig = { camera: { position: Vec3; target: Vec3; fov: number; entrancePosition: Vec3 }; palette: RoomPalette; objects: Record<ObjectId, ObjectPlacement> };

const placement = (position: Vec3, rotationY: number, focusPosition: Vec3, focusTarget: Vec3): ObjectPlacement => ({ position, rotationY, focusPosition, focusTarget });
export const roomConfigs: Record<AssignedHouse, HouseRoomConfig> = {
  slytherin: {
    camera: { position: [0, 3.7, 13], target: [0, 2.5, -3], fov: 49, entrancePosition: [0, 3.2, 20] },
    palette: { stone: "#586761", trim: "#8c9b8e", wood: "#382c20", metal: "#a5b6aa", fabric: "#214b3d", floor: "#3e514a", light: "#afd9bf", fog: "#0b211d" },
    objects: {
      archives: placement([-5.6, 0, -3.8], .16, [-3.6, 2.7, 3.8], [-5.6, 2.1, -3.8]),
      notices: placement([5.5, 0, -3.4], -.15, [3.6, 2.6, 3.8], [5.5, 2.3, -3.4]),
      members: placement([-5.2, 0, 2.1], .28, [-3.9, 2.4, 7.5], [-5.2, 1.9, 2.1]),
      profile: placement([2.9, 0, 3.9], -.18, [2.4, 2.6, 8.5], [2.9, .8, 3.9]),
      secret: placement([6.5, 0, 1.8], -.35, [5.4, 2.2, 6.5], [7.1, 1.8, -.3]),
    },
  },
  gryffindor: {
    camera: { position: [0, 3.9, 13.5], target: [0, 2.6, -3.4], fov: 49, entrancePosition: [0, 3.2, 20.5] },
    palette: { stone: "#887b66", trim: "#baa180", wood: "#503523", metal: "#b18d4b", fabric: "#762b33", floor: "#76543a", light: "#ffc180", fog: "#2a1710" },
    objects: {
      archives: placement([0, 0, -5.8], 0, [.5, 2.7, 3.5], [0, 2.3, -5.8]),
      notices: placement([5.7, 0, -2.9], -.15, [3.6, 2.7, 4.8], [5.7, 2.3, -2.9]),
      members: placement([-5.8, 0, -.8], .25, [-3.8, 2.7, 6.8], [-5.8, 1.9, -.8]),
      profile: placement([3.4, 0, 4.3], -.18, [2.5, 2.8, 8.8], [3.4, .8, 4.3]),
      secret: placement([6.5, 0, 2.2], -.35, [5.4, 2.3, 7], [7.1, 1.8, 0]),
    },
  },
  ravenclaw: {
    camera: { position: [0, 4.1, 13.5], target: [0, 3, -3.5], fov: 51, entrancePosition: [0, 3.3, 20.5] },
    palette: { stone: "#596b82", trim: "#a9b3bc", wood: "#403b35", metal: "#b39865", fabric: "#294467", floor: "#53637b", light: "#c5d9ff", fog: "#101c36" },
    objects: {
      archives: placement([-5.7, 0, -3.2], .18, [-3.5, 3, 4], [-5.7, 2.2, -3.2]),
      notices: placement([5.5, 0, -2.5], -.2, [3.4, 2.8, 4.6], [5.5, 2.3, -2.5]),
      members: placement([-5.2, 0, 2.5], .3, [-3.7, 2.6, 8], [-5.2, 2, 2.5]),
      profile: placement([2.8, 0, 4.6], -.2, [2.2, 3, 9], [2.8, .8, 4.6]),
      secret: placement([6.4, 0, 2.4], -.38, [5.4, 2.4, 7], [7.2, 1.8, 0]),
    },
  },
  hufflepuff: {
    camera: { position: [0, 3.1, 12], target: [0, 1.9, -3], fov: 50, entrancePosition: [0, 2.8, 19] },
    palette: { stone: "#9c8c68", trim: "#c8b18c", wood: "#826039", metal: "#b9904c", fabric: "#b29b4e", floor: "#8e714d", light: "#ffe5ab", fog: "#2b2b19" },
    objects: {
      archives: placement([-5.3, 0, -3.1], .15, [-3.5, 2.6, 4], [-5.3, 2, -3.1]),
      notices: placement([5.3, 0, -2.9], -.18, [3.4, 2.6, 4], [5.3, 2.2, -2.9]),
      members: placement([-4.9, 0, 2.4], .3, [-3.3, 2.6, 7.8], [-4.9, 1.8, 2.4]),
      profile: placement([2.8, 0, 3.8], -.2, [2.3, 2.6, 8.5], [2.8, .8, 3.8]),
      secret: placement([6.1, 0, 1.5], -.32, [5, 2, 6], [6.7, 1.7, -.8]),
    },
  },
};
