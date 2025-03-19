interface PhysicsBody {
  id: string;
  type: 'dynamic' | 'static' | 'kinematic';
  mass: number;
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  angularVelocity: Vector3;
  properties: {
    restitution: number;
    friction: number;
    linearDamping: number;
    angularDamping: number;
  };
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface CollisionEvent {
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;
  point: Vector3;
  normal: Vector3;
  impulse: number;
}

class PhysicsService {
  private bodies: Map<string, PhysicsBody> = new Map();
  private gravity: Vector3 = { x: 0, y: -9.81, z: 0 };
  private timeStep: number = 1 / 60;
  private collisionCallbacks: ((event: CollisionEvent) => void)[] = [];

  addBody(body: Omit<PhysicsBody, 'velocity' | 'angularVelocity'>): PhysicsBody {
    const fullBody: PhysicsBody = {
      ...body,
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 }
    };

    this.bodies.set(body.id, fullBody);
    return fullBody;
  }

  removeBody(id: string): void {
    this.bodies.delete(id);
  }

  setGravity(gravity: Vector3): void {
    this.gravity = gravity;
  }

  applyForce(bodyId: string, force: Vector3, point?: Vector3): void {
    const body = this.bodies.get(bodyId);
    if (!body || body.type !== 'dynamic') return;

    // Apply force at center of mass
    body.velocity.x += (force.x * this.timeStep) / body.mass;
    body.velocity.y += (force.y * this.timeStep) / body.mass;
    body.velocity.z += (force.z * this.timeStep) / body.mass;

    // Apply torque if force is not applied at center of mass
    if (point) {
      const r = {
        x: point.x - body.position.x,
        y: point.y - body.position.y,
        z: point.z - body.position.z
      };

      const torque = {
        x: r.y * force.z - r.z * force.y,
        y: r.z * force.x - r.x * force.z,
        z: r.x * force.y - r.y * force.x
      };

      body.angularVelocity.x += torque.x * this.timeStep;
      body.angularVelocity.y += torque.y * this.timeStep;
      body.angularVelocity.z += torque.z * this.timeStep;
    }
  }

  applyImpulse(bodyId: string, impulse: Vector3, point?: Vector3): void {
    const body = this.bodies.get(bodyId);
    if (!body || body.type !== 'dynamic') return;

    // Convert impulse to force
    this.applyForce(bodyId, {
      x: impulse.x / this.timeStep,
      y: impulse.y / this.timeStep,
      z: impulse.z / this.timeStep
    }, point);
  }

  setVelocity(bodyId: string, velocity: Vector3): void {
    const body = this.bodies.get(bodyId);
    if (!body || body.type !== 'dynamic') return;

    body.velocity = velocity;
  }

  setAngularVelocity(bodyId: string, velocity: Vector3): void {
    const body = this.bodies.get(bodyId);
    if (!body || body.type !== 'dynamic') return;

    body.angularVelocity = velocity;
  }

  onCollision(callback: (event: CollisionEvent) => void): void {
    this.collisionCallbacks.push(callback);
  }

  step(): void {
    // Update positions and check collisions
    for (const bodyA of this.bodies.values()) {
      if (bodyA.type === 'static') continue;

      // Apply gravity
      bodyA.velocity.x += this.gravity.x * this.timeStep;
      bodyA.velocity.y += this.gravity.y * this.timeStep;
      bodyA.velocity.z += this.gravity.z * this.timeStep;

      // Apply damping
      bodyA.velocity.x *= (1 - bodyA.properties.linearDamping);
      bodyA.velocity.y *= (1 - bodyA.properties.linearDamping);
      bodyA.velocity.z *= (1 - bodyA.properties.linearDamping);

      bodyA.angularVelocity.x *= (1 - bodyA.properties.angularDamping);
      bodyA.angularVelocity.y *= (1 - bodyA.properties.angularDamping);
      bodyA.angularVelocity.z *= (1 - bodyA.properties.angularDamping);

      // Update position
      bodyA.position.x += bodyA.velocity.x * this.timeStep;
      bodyA.position.y += bodyA.velocity.y * this.timeStep;
      bodyA.position.z += bodyA.velocity.z * this.timeStep;

      // Update rotation
      bodyA.rotation.x += bodyA.angularVelocity.x * this.timeStep;
      bodyA.rotation.y += bodyA.angularVelocity.y * this.timeStep;
      bodyA.rotation.z += bodyA.angularVelocity.z * this.timeStep;

      // Check collisions with other bodies
      for (const bodyB of this.bodies.values()) {
        if (bodyA === bodyB || bodyB.type === 'static') continue;

        if (this.checkCollision(bodyA, bodyB)) {
          this.resolveCollision(bodyA, bodyB);
        }
      }
    }
  }

  private checkCollision(bodyA: PhysicsBody, bodyB: PhysicsBody): boolean {
    // Simple sphere collision check
    // In a real implementation, this would use proper collision detection
    const distance = Math.sqrt(
      Math.pow(bodyA.position.x - bodyB.position.x, 2) +
      Math.pow(bodyA.position.y - bodyB.position.y, 2) +
      Math.pow(bodyA.position.z - bodyB.position.z, 2)
    );

    // Assuming both bodies are spheres with radius 1
    return distance < 2;
  }

  private resolveCollision(bodyA: PhysicsBody, bodyB: PhysicsBody): void {
    // Calculate collision normal
    const normal = {
      x: bodyB.position.x - bodyA.position.x,
      y: bodyB.position.y - bodyA.position.y,
      z: bodyB.position.z - bodyA.position.z
    };

    // Normalize
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;

    // Calculate relative velocity
    const relativeVelocity = {
      x: bodyB.velocity.x - bodyA.velocity.x,
      y: bodyB.velocity.y - bodyA.velocity.y,
      z: bodyB.velocity.z - bodyA.velocity.z
    };

    // Calculate relative velocity in terms of the normal direction
    const velocityAlongNormal = 
      relativeVelocity.x * normal.x +
      relativeVelocity.y * normal.y +
      relativeVelocity.z * normal.z;

    // Do not resolve if objects are moving apart
    if (velocityAlongNormal > 0) return;

    // Calculate restitution (bounce)
    const restitution = Math.min(
      bodyA.properties.restitution,
      bodyB.properties.restitution
    );

    // Calculate impulse scalar
    const j = -(1 + restitution) * velocityAlongNormal;
    const invMassA = bodyA.type === 'dynamic' ? 1 / bodyA.mass : 0;
    const invMassB = bodyB.type === 'dynamic' ? 1 / bodyB.mass : 0;
    const impulseScalar = j / (invMassA + invMassB);

    // Apply impulse
    if (bodyA.type === 'dynamic') {
      bodyA.velocity.x -= impulseScalar * invMassA * normal.x;
      bodyA.velocity.y -= impulseScalar * invMassA * normal.y;
      bodyA.velocity.z -= impulseScalar * invMassA * normal.z;
    }

    if (bodyB.type === 'dynamic') {
      bodyB.velocity.x += impulseScalar * invMassB * normal.x;
      bodyB.velocity.y += impulseScalar * invMassB * normal.y;
      bodyB.velocity.z += impulseScalar * invMassB * normal.z;
    }

    // Notify collision callbacks
    const collisionEvent: CollisionEvent = {
      bodyA,
      bodyB,
      point: {
        x: (bodyA.position.x + bodyB.position.x) / 2,
        y: (bodyA.position.y + bodyB.position.y) / 2,
        z: (bodyA.position.z + bodyB.position.z) / 2
      },
      normal,
      impulse: Math.abs(impulseScalar)
    };

    this.collisionCallbacks.forEach(callback => callback(collisionEvent));
  }
}

export const physicsService = new PhysicsService();