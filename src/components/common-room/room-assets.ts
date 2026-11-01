import { useTexture } from "@react-three/drei";
import { houseLogoFor } from "@/lib/houses";
import type { AssignedHouse } from "@/lib/common-room/types";

export const sceneLoaders = {
  slytherin: () => import("./scenes/slytherin-scene"),
  gryffindor: () => import("./scenes/gryffindor-scene"),
  ravenclaw: () => import("./scenes/ravenclaw-scene"),
  hufflepuff: () => import("./scenes/hufflepuff-scene"),
};

export async function preloadRoom(house: AssignedHouse) {
  await Promise.all([sceneLoaders[house](), import("./room-canvas")]);
  useTexture.preload(houseLogoFor(house));
}
