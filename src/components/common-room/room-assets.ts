import { useTexture } from "@react-three/drei";
import { houseLogoFor } from "@/lib/houses";
import type { AssignedHouse } from "@/lib/common-room/types";

/** Gallery paintings reuse existing site artwork (see public/images/ATTRIBUTION.md). */
export const paintings = ["/images/order-1.webp", "/images/order-4.webp", "/images/memory-1.webp", "/images/memory-2.webp", "/images/memory-3.webp"] as const;

export const sceneLoaders = {
  slytherin: () => import("./scenes/slytherin-scene"),
  gryffindor: () => import("./scenes/gryffindor-scene"),
  ravenclaw: () => import("./scenes/ravenclaw-scene"),
  hufflepuff: () => import("./scenes/hufflepuff-scene"),
};

export async function preloadRoom(house: AssignedHouse) {
  await Promise.all([sceneLoaders[house](), import("./room-canvas")]);
  useTexture.preload(houseLogoFor(house));
  if (house === "slytherin" || house === "gryffindor") paintings.forEach((image) => useTexture.preload(image));
}
