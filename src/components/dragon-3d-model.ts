import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export interface DragonInstance {
  scene: THREE.Group;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  mesh: THREE.SkinnedMesh | null;
  material: THREE.MeshStandardMaterial | null;
  originalEmissive: THREE.Color;
}

export interface DragonModelData {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

let cachedGltf: DragonModelData | null = null;
let loadingPromise: Promise<DragonModelData> | null = null;

/**
 * Preloads and parses the optimized 3D dragon model once.
 */
export async function loadDragonGLTF(): Promise<DragonModelData> {
  if (cachedGltf) return cachedGltf;
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<DragonModelData>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      "/models/dragon.glb",
      (gltf) => {
        // Compute bounding box and center the model geometry once
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Normalize initial model orientation and center at origin
        const maxDim = Math.max(size.x, size.y, size.z);
        const normScale = 6.0 / (maxDim || 1);

        gltf.scene.position.set(
          -center.x * normScale,
          -center.y * normScale,
          -center.z * normScale
        );
        gltf.scene.scale.set(normScale, normScale, normScale);

        const container = new THREE.Group();
        container.add(gltf.scene);

        cachedGltf = {
          scene: container,
          animations: gltf.animations,
        };
        resolve(cachedGltf);
      },
      undefined,
      (err) => {
        console.error("Failed to load dragon 3D model:", err);
        reject(err);
      }
    );
  });

  return loadingPromise;
}

/**
 * Creates an independent clone of the 3D dragon with its own AnimationMixer and SkinnedMesh.
 */
export async function createDragonInstance(): Promise<DragonInstance> {
  const gltf = await loadDragonGLTF();
  const clonedScene = SkeletonUtils.clone(gltf.scene) as THREE.Group;

  let mesh: THREE.SkinnedMesh | null = null;
  let material: THREE.MeshStandardMaterial | null = null;
  let originalEmissive = new THREE.Color(0xd49a2a); // rich mythical amber gold

  clonedScene.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
      mesh = child as THREE.SkinnedMesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      if (mesh.material) {
        // Clone material so color modifications don't affect other instances
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.roughness = 0.38;
        mat.metalness = 0.32;
        if (mat.normalMap) {
          mat.normalScale = new THREE.Vector2(1.15, 1.15);
        }
        if (mat.emissive) {
          originalEmissive = mat.emissive.clone();
        }
        mesh.material = mat;
        material = mat;
      }
    }
  });

  const mixer = new THREE.AnimationMixer(clonedScene);
  const clip = gltf.animations[0];
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();

  return {
    scene: clonedScene,
    mixer,
    action,
    mesh,
    material,
    originalEmissive,
  };
}

/**
 * House theme palettes for dragon lighting, scales, and particle sparks.
 */
export interface HouseDragonTheme {
  primary: THREE.Color;
  secondary: THREE.Color;
  emissive: THREE.Color;
  sparks: THREE.Color[];
}

export const HOUSE_DRAGON_THEMES: Record<string, HouseDragonTheme> = {
  gryffindor: {
    primary: new THREE.Color("#c83b28"),
    secondary: new THREE.Color("#e9b236"),
    emissive: new THREE.Color("#d28418"),
    sparks: [
      new THREE.Color("#ffdd55"),
      new THREE.Color("#ff8822"),
      new THREE.Color("#ff3311"),
      new THREE.Color("#ffd700"),
    ],
  },
  slytherin: {
    primary: new THREE.Color("#185a38"),
    secondary: new THREE.Color("#3ba66b"),
    emissive: new THREE.Color("#2db56a"),
    sparks: [
      new THREE.Color("#66ffaa"),
      new THREE.Color("#22cc77"),
      new THREE.Color("#ccffee"),
      new THREE.Color("#99ddbb"),
    ],
  },
  ravenclaw: {
    primary: new THREE.Color("#1c3b6a"),
    secondary: new THREE.Color("#3e82d6"),
    emissive: new THREE.Color("#2b74d4"),
    sparks: [
      new THREE.Color("#77bbff"),
      new THREE.Color("#3388ff"),
      new THREE.Color("#d4af37"),
      new THREE.Color("#ffffff"),
    ],
  },
  hufflepuff: {
    primary: new THREE.Color("#cf8c1e"),
    secondary: new THREE.Color("#f2c03b"),
    emissive: new THREE.Color("#dfa024"),
    sparks: [
      new THREE.Color("#ffdd66"),
      new THREE.Color("#e69922"),
      new THREE.Color("#ffeebb"),
      new THREE.Color("#ffaa00"),
    ],
  },
};

/**
 * Resolves current theme from document element data-house or CSS tokens.
 */
export function getActiveDragonTheme(): HouseDragonTheme {
  if (typeof document === "undefined") return HOUSE_DRAGON_THEMES.gryffindor;
  const house = (document.documentElement.dataset.house || "gryffindor").toLowerCase();
  return HOUSE_DRAGON_THEMES[house] || HOUSE_DRAGON_THEMES.gryffindor;
}
