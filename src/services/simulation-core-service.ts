import { supabase } from './supabase';

export interface Scene {
  id: string;
  name: string;
  objects: SceneObject[];
  lights: Light[];
  cameras: Camera[];
  environment: Environment;
}

interface SceneObject {
  id: string;
  type: 'mesh' | 'group' | 'sprite';
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  properties: {
    geometry?: string;
    material?: Material;
    visible?: boolean;
    castShadow?: boolean;
    receiveShadow?: boolean;
    [key: string]: any;
  };
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Material {
  type: 'basic' | 'phong' | 'standard';
  color: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  map?: string;
  normalMap?: string;
}

interface Light {
  id: string;
  type: 'ambient' | 'directional' | 'point' | 'spot';
  color: string;
  intensity: number;
  position?: Vector3;
  target?: Vector3;
  castShadow?: boolean;
}

interface Camera {
  id: string;
  type: 'perspective' | 'orthographic';
  position: Vector3;
  target: Vector3;
  properties: {
    fov?: number;
    near?: number;
    far?: number;
    zoom?: number;
  };
}

interface Environment {
  skybox?: string;
  background: string;
  fog?: {
    color: string;
    density: number;
  };
  ambient?: {
    color: string;
    intensity: number;
  };
}

class SimulationCoreService {
  private readonly STORAGE_BUCKET = 'simulation-assets';
  private scenes: Map<string, Scene> = new Map();
  private activeSceneId: string | null = null;

  async initializeScene(sceneId: string): Promise<Scene> {
    try {
      // Load scene data
      const { data: sceneData, error } = await supabase
        .from('simulations')
        .select('*')
        .eq('id', sceneId)
        .single();

      if (error) throw error;

      // Create scene instance
      const scene: Scene = {
        id: sceneId,
        name: sceneData.title,
        objects: [],
        lights: [
          {
            id: 'ambient_1',
            type: 'ambient',
            color: '#ffffff',
            intensity: 0.5
          },
          {
            id: 'main_light',
            type: 'directional',
            color: '#ffffff',
            intensity: 1,
            position: { x: 5, y: 10, z: 5 },
            target: { x: 0, y: 0, z: 0 },
            castShadow: true
          }
        ],
        cameras: [
          {
            id: 'main_camera',
            type: 'perspective',
            position: { x: 0, y: 2, z: 5 },
            target: { x: 0, y: 0, z: 0 },
            properties: {
              fov: 75,
              near: 0.1,
              far: 1000,
              zoom: 1
            }
          }
        ],
        environment: {
          background: '#1a1a1a',
          ambient: {
            color: '#ffffff',
            intensity: 0.2
          }
        }
      };

      // Store scene
      this.scenes.set(sceneId, scene);
      this.activeSceneId = sceneId;

      return scene;
    } catch (error) {
      console.error('Error initializing scene:', error);
      throw error;
    }
  }

  getActiveScene(): Scene | null {
    return this.activeSceneId ? this.scenes.get(this.activeSceneId) || null : null;
  }

  addObject(object: Omit<SceneObject, 'id'>): string {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const id = crypto.randomUUID();
    const newObject: SceneObject = {
      id,
      ...object
    };

    scene.objects.push(newObject);
    return id;
  }

  updateObject(objectId: string, updates: Partial<SceneObject>): void {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const objectIndex = scene.objects.findIndex(obj => obj.id === objectId);
    if (objectIndex === -1) throw new Error('Object not found');

    scene.objects[objectIndex] = {
      ...scene.objects[objectIndex],
      ...updates
    };
  }

  removeObject(objectId: string): void {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    scene.objects = scene.objects.filter(obj => obj.id !== objectId);
  }

  updateCamera(cameraId: string, updates: Partial<Camera>): void {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const cameraIndex = scene.cameras.findIndex(cam => cam.id === cameraId);
    if (cameraIndex === -1) throw new Error('Camera not found');

    scene.cameras[cameraIndex] = {
      ...scene.cameras[cameraIndex],
      ...updates
    };
  }

  updateLight(lightId: string, updates: Partial<Light>): void {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const lightIndex = scene.lights.findIndex(light => light.id === lightId);
    if (lightIndex === -1) throw new Error('Light not found');

    scene.lights[lightIndex] = {
      ...scene.lights[lightIndex],
      ...updates
    };
  }

  updateEnvironment(updates: Partial<Environment>): void {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    scene.environment = {
      ...scene.environment,
      ...updates
    };
  }

  async saveScene(): Promise<void> {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    try {
      const { error } = await supabase
        .from('simulations')
        .update({
          metadata: {
            scene: {
              objects: scene.objects,
              lights: scene.lights,
              cameras: scene.cameras,
              environment: scene.environment
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', scene.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving scene:', error);
      throw error;
    }
  }

  async loadAsset(assetId: string): Promise<string> {
    try {
      const { data: asset } = await supabase
        .from('simulation_assets')
        .select('file_url')
        .eq('id', assetId)
        .single();

      if (!asset?.file_url) throw new Error('Asset not found');

      return asset.file_url;
    } catch (error) {
      console.error('Error loading asset:', error);
      throw error;
    }
  }

  // Physics simulation methods
  enablePhysics(object: SceneObject, properties: {
    mass: number;
    restitution: number;
    friction: number;
  }): void {
    // Physics implementation would go here
    // For now, just store the properties
    object.properties.physics = properties;
  }

  applyForce(objectId: string, force: Vector3): void {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const object = scene.objects.find(obj => obj.id === objectId);
    if (!object) throw new Error('Object not found');

    // Force application would go here
    // For now, just update position
    object.position.x += force.x * 0.01;
    object.position.y += force.y * 0.01;
    object.position.z += force.z * 0.01;
  }

  // Collision detection
  checkCollision(objectId1: string, objectId2: string): boolean {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const object1 = scene.objects.find(obj => obj.id === objectId1);
    const object2 = scene.objects.find(obj => obj.id === objectId2);

    if (!object1 || !object2) throw new Error('Object not found');

    // Simple bounding box collision check
    // In a real implementation, this would be more sophisticated
    const distance = Math.sqrt(
      Math.pow(object1.position.x - object2.position.x, 2) +
      Math.pow(object1.position.y - object2.position.y, 2) +
      Math.pow(object1.position.z - object2.position.z, 2)
    );

    // Assuming objects are spheres with radius 1
    return distance < 2;
  }

  // Raycasting
  raycast(origin: Vector3, direction: Vector3): SceneObject | null {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    // Simple raycasting implementation
    // In a real implementation, this would use proper intersection tests
    let closestObject: SceneObject | null = null;
    let closestDistance = Infinity;

    for (const object of scene.objects) {
      const distance = Math.sqrt(
        Math.pow(object.position.x - origin.x, 2) +
        Math.pow(object.position.y - origin.y, 2) +
        Math.pow(object.position.z - origin.z, 2)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestObject = object;
      }
    }

    return closestObject;
  }
}

export const simulationCoreService = new SimulationCoreService();