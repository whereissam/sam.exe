import RAPIER from '@dimforge/rapier3d-compat';
import { Euler, Quaternion, Vector3 } from 'three';
import { robotBoxes } from '../world/robot-contact';
import {
  sparringFrame,
  createSparringCommands,
  type SparringCommands,
} from '../world/sparring';
export const PHYSICS_DT = 1 / 120;
let ready: Promise<void> | undefined;
export const initBoxing = () => (ready ??= RAPIER.init());
export type BoxingPart = {
  body: RAPIER.RigidBody;
  name: string;
  size: [number, number, number];
  side: number;
};
const q = (r: { x: number; y: number; z: number; w: number }) =>
  new Quaternion(r.x, r.y, r.z, r.w);
const v = (p: { x: number; y: number; z: number }) =>
  new Vector3(p.x, p.y, p.z);
type Pose = ReturnType<typeof sparringFrame>['pose'];
/** The commanded angle for a motor; ankles keep the foot level. */
function poseValue(p: Pose, key: string) {
  if (key === 'leftAnkle') return -p.leftHip - p.knee;
  if (key === 'rightAnkle') return -p.rightHip - p.rightKnee;
  return p[key as keyof Pose];
}
const STRIKERS = ['fist', 'foot', 'shin'];
const TARGETS = ['head', 'head guard', 'torso', 'pelvis'];
export class BoxingWorld {
  world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  events = new RAPIER.EventQueue(true);
  parts: BoxingPart[] = [];
  motors: {
    joint: RAPIER.RevoluteImpulseJoint;
    key: string;
    side: number;
    parent: RAPIER.RigidBody;
    child: RAPIER.RigidBody;
  }[] = [];
  torsos: RAPIER.RigidBody[] = [];
  owners = new Map<number, { side: number; name: string }>();
  elapsed = 0;
  accumulator = 0;
  contacts = 0;
  lastImpulse = 0;
  fallen = [false, false];
  /** Seconds left in each robot's stagger after taking a clean hit. */
  stagger = [0, 0];
  /** Seconds left reeling from a heavy hit, with no balance help at all. */
  reel = [0, 0];
  /** Seconds since the first knockdown of the round, or 0 while both are standing. */
  downFor = 0;
  /** The latest clean hit, for the impact flash. */
  lastHit: { id: number; side: number; position: [number, number, number] } | null = null;
  hits = 0;
  parts_: Map<string, BoxingPart>[] = [];
  constructor(readonly commands: SparringCommands = createSparringCommands()) {
    commands.frames = createSparringCommands().frames;
    this.world.timestep = PHYSICS_DT;
    this.world.numSolverIterations = 12;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(3.1, 0.12, 2.5)
        .setTranslation(0, -0.185, -0.5)
        .setFriction(0.9)
        .setRestitution(0.02),
    );
    for (const [x, z, hx, hz] of [
      [-3.1, -0.5, 0.08, 2.5],
      [3.1, -0.5, 0.08, 2.5],
      [0, -3, 3.1, 0.08],
      [0, 2, 3.1, 0.08],
    ])
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, 0.7, hz)
          .setTranslation(x, 0.65, z)
          .setRestitution(0.15),
      );
    for (const [i, side] of [-1, 1].entries()) {
      const frame = sparringFrame(0, side as -1 | 1),
        boxes = robotBoxes(frame).filter(
          (b) =>
            ![
              'stance',
              'left shoulder',
              'right shoulder',
              'left elbow',
              'right elbow',
            ].includes(b.name),
        );
      const map = new Map<string, BoxingPart>();
      for (const box of boxes) {
        const glove = box.name.includes('fist');
        const size: [number, number, number] = glove
          ? [0.34, 0.3, 0.34]
          : box.size;
        const rot = new Quaternion().setFromEuler(new Euler(...box.rotation));
        const body = this.world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(...box.center)
            .setRotation(rot)
            .setLinearDamping(0.2)
            .setAngularDamping(0.8)
            .setCcdEnabled(true),
        );
        const mass =
          box.name === 'torso'
            ? 12
            : box.name === 'pelvis'
              ? 7
              : box.name === 'head'
                ? 3
                : glove
                  ? 1.2
                  : box.name.includes('thigh')
                    ? 4
                    : box.name.includes('shin')
                      ? 3
                      : 2;
        const shape = glove
          ? RAPIER.ColliderDesc.roundCuboid(0.135, 0.115, 0.135, 0.035)
          : RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2);
        // Ignore same-robot contacts (adjacent links), retain opponent and ring.
        const group = i === 0 ? 2 : 4,
          filter = i === 0 ? 5 : 3;
        const collider = this.world.createCollider(
          shape
            .setMass(mass)
            // Low foot friction lets the balance controller slide the robot in and out of range.
            .setFriction(glove ? 0.8 : box.name.includes('foot') ? 0.25 : 0.65)
            .setRestitution(glove ? 0.04 : 0.08)
            .setCollisionGroups((group << 16) | filter)
            .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
            .setContactForceEventThreshold(8),
          body,
        );
        this.owners.set(collider.handle, { side: i, name: box.name });
        const part = { body, name: box.name, size, side: i };
        map.set(box.name, part);
        this.parts.push(part);
        if (box.name === 'head') {
          for (const [x, y, z, sx, sy, sz] of [
            [0, 0.23, 0, 0.52, 0.09, 0.46],
            [-0.235, 0, 0, 0.08, 0.4, 0.46],
            [0.235, 0, 0, 0.08, 0.4, 0.46],
            [0, 0, -0.21, 0.46, 0.4, 0.07],
          ]) {
            const c = this.world.createCollider(
              RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2)
                .setTranslation(x, y, z)
                .setMass(0.15)
                .setRestitution(0.03)
                .setCollisionGroups((group << 16) | filter)
                .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
                .setContactForceEventThreshold(8),
              body,
            );
            this.owners.set(c.handle, { side: i, name: 'head guard' });
          }
        }
      }
      this.torsos.push(map.get('torso')!.body);
      this.parts_.push(map);
      const link = (
        parent: string,
        child: string,
        offset: [number, number, number],
        key?: string,
      ) => {
        const a = map.get(parent)!.body,
          b = map.get(child)!.body;
        const anchor = new Vector3(...offset)
          .applyQuaternion(q(b.rotation()))
          .add(v(b.translation()));
        const local = (body: RAPIER.RigidBody) =>
          anchor
            .clone()
            .sub(v(body.translation()))
            .applyQuaternion(q(body.rotation()).invert());
        const data = key
          ? RAPIER.JointData.revolute(local(a), local(b), { x: 1, y: 0, z: 0 })
          : RAPIER.JointData.fixed(
              local(a),
              q(a.rotation()).invert(),
              local(b),
              q(b.rotation()).invert(),
            );
        const joint = this.world.createImpulseJoint(data, a, b, true);
        joint.setContactsEnabled(false);
        if (key) {
          const motor = joint as RAPIER.RevoluteImpulseJoint;
          motor.setLimits(-2.4, 2.4);
          motor.configureMotorModel(RAPIER.MotorModel.ForceBased);
          motor.setMotorMaxForce(240);
          this.motors.push({ joint: motor, key, side: i, parent: a, child: b });
        }
      };
      link('torso', 'head', [0, -0.24, 0]);
      link('torso', 'pelvis', [0, 0, 0]);
      for (const sideName of ['left', 'right']) {
        const cap = sideName === 'left' ? 'left' : 'right';
        link('torso', `${cap} upper arm`, [0, 0.24, 0], `${cap}Arm`);
        link(`${cap} upper arm`, `${cap} forearm`, [0, 0.2, 0], `${cap}Elbow`);
        link(`${cap} forearm`, `${cap} fist`, [0, 0.1, 0]);
        link('pelvis', `${cap} thigh`, [0, 0.22, 0], `${cap}Hip`);
        link(
          `${cap} thigh`,
          `${cap} shin`,
          [0, 0.22, 0],
          cap === 'left' ? 'knee' : 'rightKnee',
        );
        link(`${cap} shin`, `${cap} foot`, [0, 0, -0.1], `${cap}Ankle`);
      }
    }
  }
  step(delta: number) {
    this.accumulator += Math.min(0.05, Math.max(0, delta));
    while (this.accumulator >= PHYSICS_DT) {
      this.tick();
      this.accumulator -= PHYSICS_DT;
    }
  }
  tick() {
    this.elapsed += PHYSICS_DT;
    const frames = (this.commands.frames = [
      sparringFrame(this.elapsed, -1),
      sparringFrame(this.elapsed, 1),
    ]);
    for (const m of this.motors) {
      m.joint.configureMotorPosition(
        // Rapier measures a revolute angle between the two bodies, so the pose angle is the target as-is.
        poseValue(frames[m.side].pose, m.key),
        this.fallen[m.side] ? 0 : 420,
        this.fallen[m.side] ? 1 : 26,
      );
    }
    this.stagger = this.stagger.map((s) => Math.max(0, s - PHYSICS_DT));
    this.reel = this.reel.map((s) => Math.max(0, s - PHYSICS_DT));
    if (this.fallen.some(Boolean)) this.downFor += PHYSICS_DT;
    this.torsos.forEach((body, i) => {
      body.resetForces(true);
      body.resetTorques(true);
      const pos = v(body.translation()),
        vel = v(body.linvel()),
        rot = q(body.rotation());
      const up = new Vector3(0, 1, 0).applyQuaternion(rot);
      // Past ~45° of tilt, or slumped well below standing height, the robot is going down.
      if (up.y < 0.7 || pos.y < 0.95) this.fallen[i] = true;
      if (this.fallen[i]) return;
      const frame = frames[i];
      // Bounded virtual balance controller. Contact impulses still move/rotate the
      // dynamic base. It switches off after a knockdown; no pose teleportation.
      // It only helps a robot that is nearly upright: the help fades out between about
      // 25° and 40° of tilt, so a robot leaning hard is left to gravity instead of held up.
      const assist = this.reel[i] > 0 ? 0 : Math.min(1, Math.max(0, (up.y - 0.77) / (0.9 - 0.77)));
      const target = new Vector3(frame.x, 1.325, -0.5 + (frame.z + 0.5));
      // A staggered robot is held up but not pulled back to its mark, so the hit shows.
      const give = this.stagger[i] > 0 ? 0.15 : 1;
      const force = target
        .sub(pos)
        .multiply(new Vector3(1100 * give, 450, 1100 * give))
        .addScaledVector(vel, -190 * give);
      force.y += 240;
      force.clampLength(0, 2200);
      body.addForce(force.multiplyScalar(assist), true);
      const goal = new Quaternion().setFromEuler(
        new Euler(0, frame.heading, 0),
      );
      const error = goal.multiply(rot.invert());
      if (error.w < 0) error.set(-error.x, -error.y, -error.z, -error.w);
      const torque = new Vector3(error.x, error.y, error.z)
        // Strong enough to beat gravity's tipping torque (~165 N·m at 25°) near upright.
        .multiplyScalar(900)
        .addScaledVector(v(body.angvel()), -70)
        .clampLength(0, 450);
      body.addTorque(torque.multiplyScalar(assist), true);
    });
    this.world.step(this.events);
    this.events.drainContactForceEvents((e) => {
      const a = this.owners.get(e.collider1()),
        b = this.owners.get(e.collider2());
      if (a && b && a.side !== b.side) {
        this.contacts++;
        this.lastImpulse = e.totalForceMagnitude() * PHYSICS_DT;
        for (const [striker, struck] of [[a, b], [b, a]]) this.land(striker, struck, frames);
      }
    });
  }
  /** A clean strike from the attacker knocks the opponent back and starts a short stagger. */
  private land(striker: { side: number; name: string }, struck: { side: number; name: string }, frames: ReturnType<typeof sparringFrame>[]) {
    if (!frames[striker.side].attacking || this.stagger[struck.side] > 0 || this.fallen[struck.side]) return;
    if (!STRIKERS.some((s) => striker.name.includes(s)) || !TARGETS.includes(struck.name)) return;
    const from = v(this.torsos[striker.side].translation()),
      body = this.torsos[struck.side],
      to = v(body.translation());
    const push = to.clone().sub(from).setY(0).normalize();
    const kick = frames[striker.side].action === 'kick';
    // Most clean hits only rock the opponent; every sixth is a heavy one that can drop them.
    const heavy = (this.hits + 1) % 6 === 0;
    body.applyImpulse(push.clone().multiplyScalar(heavy ? 42 : kick ? 16 : 12).setY(2), true);
    // Rock the upper body back about the axis across the punch.
    const across = new Vector3(0, 1, 0).cross(push);
    body.applyTorqueImpulse(across.multiplyScalar(heavy ? 34 : struck.name.startsWith('head') ? 2.5 : 1.5), true);
    this.stagger[struck.side] = 0.4;
    if (heavy) this.reel[struck.side] = 0.6;
    const fist = this.parts_[striker.side].get(striker.name)?.body.translation() ?? to;
    this.lastHit = { id: ++this.hits, side: struck.side, position: [fist.x, fist.y, fist.z] };
  }
  /** Each motor's measured angle beside the operator's commanded one, for checking that the robot follows. */
  jointAngles() {
    return this.motors.map((m) => {
      const relative = q(m.parent.rotation()).invert().multiply(q(m.child.rotation()));
      return { key: m.key, side: m.side, actual: 2 * Math.atan2(relative.x, relative.w), target: poseValue(this.commands.frames[m.side].pose, m.key) };
    });
  }
  dispose() {
    this.events.free();
    this.world.free();
  }
}
