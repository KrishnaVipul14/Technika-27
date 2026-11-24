import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export interface DragonInstance {
  scene: THREE.Group;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  mesh: THREE.SkinnedMesh | null;
  bodyMaterial: THREE.MeshStandardMaterial | null;
  eyeMaterial: THREE.MeshStandardMaterial | null;
}

export interface DragonModelData {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

let cachedGltf: DragonModelData | null = null;
let loadingPromise: Promise<DragonModelData> | null = null;
let bodyTexturesPromise: Promise<DragonBodyTextures> | null = null;

interface DragonBodyTextures {
  diffuse: THREE.Texture;
  emissive: THREE.Texture;
}

/**
 * The source FBX ships only an emissive atlas for the body (white with green
 * scales), so using it as a diffuse map made the dragon read as a white,
 * untextured plastic toy. These two prepared maps keep the scale pattern but
 * give the body a pale-jade base colour and a separate glow mask.
 */
function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

function loadDragonBodyTextures(): Promise<DragonBodyTextures> {
  if (!bodyTexturesPromise) {
    bodyTexturesPromise = Promise.all([
      loadTexture("/models/textures/dragon_body_diffuse.webp"),
      loadTexture("/models/textures/dragon_body_emissive.webp"),
    ])
      .then(([diffuse, emissive]) => ({ diffuse, emissive }))
      .catch((error) => {
        bodyTexturesPromise = null;
        throw error;
      });
  }
  return bodyTexturesPromise;
}

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
        if (typeof window !== "undefined") {
          (window as unknown as { __dragonDebug?: unknown }).__dragonDebug = {
            size: size.toArray(),
            center: center.toArray(),
            min: box.min.toArray(),
            max: box.max.toArray(),
          };
        }

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
  // Texture failures must not block the model; fall back to the embedded maps.
  const bodyTextures = await loadDragonBodyTextures().catch(() => null);
  const clonedScene = SkeletonUtils.clone(gltf.scene) as THREE.Group;

  let mesh: THREE.SkinnedMesh | null = null;
  let bodyMaterial: THREE.MeshStandardMaterial | null = null;
  let eyeMaterial: THREE.MeshStandardMaterial | null = null;

  clonedScene.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
      const skMesh = child as THREE.SkinnedMesh;
      skMesh.castShadow = true;
      skMesh.receiveShadow = true;
      skMesh.frustumCulled = false;

      const materials = Array.isArray(skMesh.material)
        ? skMesh.material
        : [skMesh.material];

      const clonedMaterials = materials.map((m) => {
        const mat = (m as THREE.MeshStandardMaterial).clone();
        if (mat.name === "DragonEyes") {
          // Fiery glowing eyes.
          mat.roughness = 0.15;
          mat.metalness = 0.1;
          mat.emissive = new THREE.Color(0xff2a00);
          mat.emissiveIntensity = 1.6;
          eyeMaterial = mat;
        } else {
          // Jade-scaled celestial body with a separate glow mask.
          mat.roughness = 0.42;
          mat.metalness = 0.18;
          if (bodyTextures) {
            mat.map = bodyTextures.diffuse;
            mat.emissiveMap = bodyTextures.emissive;
            mat.emissive = new THREE.Color(0x2f6b4a);
            mat.emissiveIntensity = 0.5;
          }
          if (mat.normalMap) {
            mat.normalScale = new THREE.Vector2(1.2, 1.2);
          }
          bodyMaterial = mat;
        }
        mat.needsUpdate = true;
        return mat;
      });

      skMesh.material = Array.isArray(skMesh.material)
        ? clonedMaterials
        : clonedMaterials[0];

      if (!mesh) mesh = skMesh;
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
    bodyMaterial,
    eyeMaterial,
  };
}

/**
 * Procedural circular soft glow particle texture for magical embers.
 */
export function createEmberTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.25, "rgba(255, 220, 130, 0.9)");
  grad.addColorStop(0.6, "rgba(255, 110, 30, 0.4)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * House theme palettes for dragon lighting, scales, and particle sparks.
 */
export interface HouseDragonTheme {
  primary: THREE.Color;
  secondary: THREE.Color;
  rim: THREE.Color;
  sparks: THREE.Color[];
}

export const HOUSE_DRAGON_THEMES: Record<string, HouseDragonTheme> = {
  gryffindor: {
    primary: new THREE.Color("#c83b28"),
    secondary: new THREE.Color("#e9b236"),
    rim: new THREE.Color("#ffb732"),
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
    rim: new THREE.Color("#44ee88"),
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
    rim: new THREE.Color("#55aaff"),
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
    rim: new THREE.Color("#ffcc44"),
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
