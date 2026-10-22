'use client';
/* oxlint-disable react/react-compiler -- Frame callbacks and drag handlers drive the URDF robots directly. */
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import URDFLoader, { type URDFJoint, type URDFLink } from 'urdf-loader';
import { URDFDragControls } from 'urdf-loader/src/URDFDragControls.js';
import { support, type Point } from './balance';
import { showPose, SHOW_SECONDS } from './missions';
import { ROBOTS, ROBOT_IDS, type Joints, type RobotFile, type RobotId } from './urdf-robots';

export type Command = { kind: 'rest' | 'shuffle'; sequence: number };
type Props = {
  /** The robot at the front of the turntable; the only one that can be grabbed. */
  active: RobotId;
  xray: boolean;
  command: Command;
  reduced: boolean;
  /** Live joint values of the front robot, written every frame for the page to sample. */
  values: RefObject<Joints>;
  onFocus: (joint: string | null) => void;
  onMission: (id: RobotId, done: boolean) => void;
  onFall: (id: RobotId, fallen: boolean) => void;
  onSelect: (id: RobotId) => void;
};
type Vec = [number, number, number];

const RUST = new THREE.Color('#b46d4e');
const PLATFORM_TOP = 0.2;
/** Robots stand this far from the turntable's centre; the front slot sits at the world origin. */
const RADIUS = 1.15;
const SLOT = (2 * Math.PI) / ROBOT_IDS.length;
/** Camera per robot, plus a yaw so each faces the viewer at its most readable angle. */
const FRAMING: Record<RobotId, { target: Vec; camera: Vec; yaw: number }> = {
  humanoid: { target: [0, 0.8, 0], camera: [2.5, 1.7, 3.3], yaw: -0.85 },
  arm: { target: [0, 0.55, 0], camera: [1.8, 1.3, 2.4], yaw: -0.85 },
  quadruped: { target: [0, 0.38, 0], camera: [1.9, 1.2, 2.5], yaw: 0.25 },
};
/** Where the arm's block waits, in the robot's own (Y-up) frame: off to the side and back, so a narrow phone view still shows it. */
const BLOCK_HOME = new THREE.Vector3(-0.17, 0.025, -0.41);
const point = new THREE.Vector3(), other = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
/** How far past the support polygon's edge the centre of mass may sit before the robot tips. */
const BALANCE_MARGIN = 0.03;
const ignoreRays = (object: THREE.Object3D) => object.traverse(node => { node.raycast = () => {}; });
const isMimic = (joint: URDFJoint) => Boolean((joint as URDFJoint & { mimicJoint?: string }).mimicJoint);
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

function Block({ at, size, color }: { at: Vec; size: Vec; color: string }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>;
}

/** Parses the file and adds the X-ray layer: a frame at every joint and a bone along every link. */
function build(file: RobotFile) {
  const robot = new URDFLoader().parse(file.urdf);
  const movable = Object.values(robot.joints).filter(joint => joint.jointType !== 'fixed');
  const parts = new Map<string, THREE.MeshStandardMaterial[]>();
  const meshes: THREE.Mesh[] = [];
  const visuals: THREE.Object3D[] = [];
  const xray: THREE.Object3D[] = [];
  robot.traverse(node => {
    const mesh = node as THREE.Mesh;
    if ((node as { isURDFVisual?: boolean }).isURDFVisual) visuals.push(node);
    if (!mesh.isMesh) return;
    mesh.material = new THREE.MeshStandardMaterial({ color: (mesh.material as THREE.MeshPhongMaterial).color, roughness: 0.75, transparent: true });
    mesh.castShadow = true;
    meshes.push(mesh);
  });
  for (const joint of movable) {
    const owned: THREE.MeshStandardMaterial[] = [];
    const walk = (node: THREE.Object3D) => node.children.forEach(child => {
      if ((child as URDFJoint).isURDFJoint && (child as URDFJoint).jointType !== 'fixed') return;
      if ((child as THREE.Mesh).isMesh) owned.push((child as THREE.Mesh).material as THREE.MeshStandardMaterial);
      walk(child);
    });
    walk(joint);
    parts.set(joint.name, owned);
    const axes = new THREE.AxesHelper(0.1);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), new THREE.MeshBasicMaterial({ color: '#b46d4e' }));
    joint.add(axes, dot); xray.push(axes, dot);
  }
  const bone = new THREE.LineBasicMaterial({ color: '#35443f' });
  robot.traverse(node => {
    if (!(node as URDFLink).isURDFLink) return;
    for (const child of node.children) {
      if (!(child as URDFJoint).isURDFJoint) continue;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), child.position.clone()]), bone);
      node.add(line); xray.push(line);
    }
  });
  xray.forEach(ignoreRays);
  return { robot, movable, parts, meshes, visuals, xray };
}

type RobotProps = Omit<Props, 'active'> & { file: RobotFile; active: boolean; slot: number };
function Robot({ file, active, slot, xray, command, reduced, values, onFocus, onMission, onFall, onSelect }: RobotProps) {
  const { robot, movable, parts, meshes, visuals, xray: helpers } = useMemo(() => build(file), [file]);
  const { gl, camera } = useThree();
  const controls = useThree(state => state.controls) as unknown as { enabled: boolean } | null;
  const body = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  // Tipping over: angular speed, how far it has tipped, and whether it has fallen.
  const tip = useRef({ speed: 0, angle: 0, fallen: false });
  // True while easing into a new pose from a button, so a passing in-between pose can't knock it over.
  const settling = useRef(false);
  const targets = useRef<Joints>({ ...file.rest });
  const focus = useRef<URDFJoint | null>(null);
  const grabbed = useRef<URDFJoint | null>(null);
  const born = useRef(0);
  const fade = useRef(active ? 1 : 0);
  // Mission progress: `show` counts up through the reward once the goal is reached.
  const mission = useRef({ done: false, show: SHOW_SECONDS, pose: {} as Joints });
  const block = useMemo(() => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: '#b46d4e', roughness: 0.6, transparent: true }));
    mesh.castShadow = true;
    ignoreRays(mesh);
    return mesh;
  }, []);
  // A pulsing ring and a bobbing arrow mark the block as the arm's target until it is picked up.
  const marker = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ color: '#b46d4e', transparent: true, depthWrite: false });
    const group = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.075, 40), material);
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.022;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.045, 16), material);
    arrow.rotation.x = Math.PI;
    group.add(ring, arrow);
    ignoreRays(group);
    return { group, ring, arrow, material };
  }, []);
  function homeBlock() {
    if (file.id !== 'arm' || !body.current) return;
    body.current.add(block, marker.group);
    block.position.copy(BLOCK_HOME); block.quaternion.identity();
    marker.group.position.copy(BLOCK_HOME);
  }
  // The axis indicator: a ring for turning joints, a rod for sliding ones.
  const indicator = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ color: RUST, transparent: true, opacity: 0.9, depthTest: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.006, 8, 48), material);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 8), material);
    ring.renderOrder = rod.renderOrder = 10;
    [ring, rod].forEach(ignoreRays);
    return { ring, rod };
  }, []);

  useEffect(() => {
    for (const joint of movable) joint.setJointValue(file.rest[joint.name] ?? 0);
    targets.current = { ...file.rest };
    born.current = 0;
    homeBlock();
    // homeBlock only reads refs and the file.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [file, movable]);

  useEffect(() => {
    if (command.sequence === 0 || !active) return;
    const draw = () => {
      const next: Joints = {};
      for (const joint of movable) {
        if (isMimic(joint)) continue;
        const rest = file.rest[joint.name] ?? 0;
        const { lower, upper } = joint.limit;
        next[joint.name] = command.kind === 'rest' ? rest : THREE.MathUtils.clamp(rest + (Math.random() - 0.5) * (upper - lower) * 0.45, lower, upper);
      }
      return next;
    };
    let next = draw();
    // Most surprises should stay on their feet; about one in ten is allowed to topple.
    if (command.kind === 'shuffle' && !file.fixedBase && !tip.current.fallen && Math.random() >= 0.1) {
      for (let tries = 0; tries < 40 && !stands(next); tries++) next = draw();
    }
    targets.current = next;
    settling.current = true;
    if (command.kind === 'rest') {
      mission.current = { done: false, show: SHOW_SECONDS, pose: {} };
      homeBlock();
      onMission(file.id, false);
      tip.current = { speed: 0, angle: 0, fallen: false };
      lean.current?.position.set(0, 0, 0); lean.current?.quaternion.identity();
      onFall(file.id, false);
    }
    // Only a new command should act; becoming the front robot is not a command.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  function setFocus(joint: URDFJoint | null) {
    if (focus.current === joint) return;
    focus.current = joint;
    indicator.ring.removeFromParent(); indicator.rod.removeFromParent();
    if (joint) {
      const prismatic = joint.jointType === 'prismatic';
      const mark = prismatic ? indicator.rod : indicator.ring;
      mark.quaternion.setFromUnitVectors(prismatic ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1), joint.axis.clone().normalize());
      joint.add(mark);
    }
    gl.domElement.style.cursor = joint ? 'grab' : '';
    onFocus(joint?.name ?? null);
  }

  // Only the front robot listens for grabs.
  useEffect(() => {
    if (!active) return;
    const element = gl.domElement;
    const drag = new URDFDragControls(robot);
    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
    drag.updateJoint = (joint, angle) => { moveClear(joint, angle); targets.current[joint.name] = joint.angle; };
    drag.onHover = joint => setFocus(joint);
    drag.onUnhover = () => { if (!drag.manipulating) setFocus(null); };
    drag.onDragStart = joint => { grabbed.current = joint; settling.current = false; mission.current.show = SHOW_SECONDS; if (controls) controls.enabled = false; element.style.cursor = 'grabbing'; };
    drag.onDragEnd = () => { grabbed.current = null; if (controls) controls.enabled = true; element.style.cursor = drag.hovered ? 'grab' : ''; if (!drag.hovered) setFocus(null); };
    const aim = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      drag.moveRay(ray.ray);
    };
    // Capture phase runs before OrbitControls, so grabbing a joint never also orbits the camera.
    const down = (event: PointerEvent) => {
      aim(event); drag.setGrabbed(true);
      if (!drag.manipulating) return;
      event.stopImmediatePropagation();
      // Keeps the drag alive when a finger slides off the canvas; harmless if the browser refuses.
      try { element.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    };
    const up = (event: PointerEvent) => {
      const released = drag.manipulating;
      aim(event); drag.setGrabbed(false);
      // A finger has no hover, so keep showing the joint it just moved rather than whatever is under it now.
      if (released && event.pointerType !== 'mouse') setFocus(released);
    };
    element.addEventListener('pointerdown', down, { capture: true });
    element.addEventListener('pointermove', aim);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    return () => {
      element.removeEventListener('pointerdown', down, { capture: true });
      element.removeEventListener('pointermove', aim);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      grabbed.current = null;
      if (controls) controls.enabled = true;
      setFocus(null);
    };
    // setFocus only touches refs and stable callbacks.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [active, robot, gl, camera, controls]);

  // Meshes that can hit the floor: everything but a bolted-down base.
  const movingMeshes = useMemo(() => meshes.filter(mesh => {
    let node: THREE.Object3D | null = mesh.parent;
    while (node && !(node as URDFLink).isURDFLink) node = node.parent;
    return !file.fixedBase || node !== robot;
  }), [meshes, robot, file.fixedBase]);
  const box = useMemo(() => new THREE.Box3(), []);
  function lowest() {
    robot.updateMatrixWorld(true);
    let low = Infinity;
    for (const mesh of movingMeshes) low = Math.min(low, box.setFromObject(mesh).min.y);
    return low;
  }
  /** Sets a joint on a bolted-down robot, stopping where it would first go through the floor. */
  function moveClear(joint: URDFJoint, angle: number) {
    if (!file.fixedBase) { joint.setJointValue(angle); return; }
    const from = joint.angle;
    joint.setJointValue(angle);
    if (lowest() >= PLATFORM_TOP - 0.002) return;
    // Halve the step until it just touches.
    let clear = from, blocked = joint.angle;
    for (let i = 0; i < 8; i++) {
      const middle = (clear + blocked) / 2;
      joint.setJointValue(middle);
      if (lowest() >= PLATFORM_TOP - 0.002) clear = middle; else blocked = middle;
    }
    joint.setJointValue(clear);
  }
  const centre = useMemo(() => new THREE.Vector3(), []), size = useMemo(() => new THREE.Vector3(), []);
  const pivot = useMemo(() => new THREE.Vector3(), []), axis = useMemo(() => new THREE.Vector3(), []);
  const turn = useMemo(() => new THREE.Quaternion(), []), inverse = useMemo(() => new THREE.Quaternion(), []);
  /** Where the centre of mass is (left in `other`) and whether the support polygon holds it. */
  function measure() {
    robot.updateMatrixWorld(true);
    let low = Infinity, mass = 0;
    other.set(0, 0, 0);
    const boxes = meshes.map(mesh => box.clone().setFromObject(mesh));
    for (const bounds of boxes) {
      low = Math.min(low, bounds.min.y);
      bounds.getSize(size);
      const weight = size.x * size.y * size.z;
      other.addScaledVector(bounds.getCenter(centre), weight); mass += weight;
    }
    other.divideScalar(mass);
    const contacts: Point[] = [];
    for (const bounds of boxes) {
      if (bounds.min.y > low + 0.015) continue;
      contacts.push([bounds.min.x, bounds.min.z], [bounds.max.x, bounds.min.z], [bounds.min.x, bounds.max.z], [bounds.max.x, bounds.max.z]);
    }
    return { result: support([other.x, other.z], contacts, BALANCE_MARGIN), low };
  }
  /** Would the robot stand in this pose? Tries it on and puts the old pose back. */
  function stands(pose: Joints) {
    const before = movable.map(joint => joint.angle);
    for (const joint of movable) if (!isMimic(joint) && joint.name in pose) joint.setJointValue(pose[joint.name]);
    const { balanced } = measure().result;
    movable.forEach((joint, i) => joint.setJointValue(before[i]));
    return balanced;
  }
  /** Gravity, roughly: if the centre of mass leaves the support polygon, rotate over the nearest edge. */
  function balance(step: number) {
    if (!lean.current || !body.current) return;
    const { result, low } = measure();
    if (result.balanced) { tip.current.speed = 0; return; }
    const state = tip.current;
    state.speed = Math.min(state.speed + 10 * step, 5);
    const angle = state.speed * step;
    // Tip the top toward the centre of mass: axis = up × (direction from pivot to centre of mass).
    pivot.set(result.pivot[0], low, result.pivot[1]);
    axis.set(other.x - pivot.x, 0, other.z - pivot.z).normalize();
    axis.crossVectors(UP, axis).normalize();
    // Work in the body's frame, which only turns about vertical.
    body.current.getWorldQuaternion(inverse).invert();
    axis.applyQuaternion(inverse);
    body.current.worldToLocal(pivot);
    turn.setFromAxisAngle(axis, angle);
    lean.current.position.sub(pivot).applyQuaternion(turn).add(pivot);
    lean.current.quaternion.premultiply(turn);
    state.angle += angle;
    if (!state.fallen && state.angle > 0.5) { state.fallen = true; onFall(file.id, true); }
  }
  /** Has the visitor posed the robot into its mission goal? */
  function reached(id: RobotId) {
    const { links } = robot;
    if (id === 'humanoid') return links.right_hand_link.getWorldPosition(point).y > links.head_link.getWorldPosition(other).y;
    if (id === 'quadruped') return links.FL_calf.localToWorld(point.set(0, 0, -0.2)).y > PLATFORM_TOP + 0.13;
    links.hand_link.localToWorld(point.set(0, 0, 0.06));
    return point.distanceTo(block.getWorldPosition(other)) < 0.09;
  }
  const bounds = useMemo(() => new THREE.Box3(), []);
  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 0.05);
    born.current += step;
    // Assemble link by link in file order, so the robot visibly comes from the URDF.
    visuals.forEach((visual, i) => visual.scale.setScalar(reduced ? 1 : Math.max(0.001, smooth((born.current - i * 0.035) / 0.3))));
    const state = mission.current;
    if (active && !state.done && !tip.current.fallen && born.current > 1 && reached(file.id)) {
      state.done = true; state.show = 0; state.pose = { ...targets.current };
      if (file.id === 'arm') {
        robot.links.hand_link.add(block);
        block.position.set(0, 0, 0.075); block.quaternion.identity();
        state.pose.left_finger_joint = 0.014;
      }
      onMission(file.id, true);
    }
    if (state.show < SHOW_SECONDS) {
      state.show += step;
      targets.current = reduced ? { ...state.pose } : showPose(file.id, state.show, state.pose);
    }
    const blend = reduced ? 1 : 1 - Math.exp(-step * 6);
    for (const joint of movable) {
      // Mimic joints follow their leader; the grabbed joint follows the pointer.
      if (isMimic(joint) || joint === grabbed.current) continue;
      const target = targets.current[joint.name] ?? 0;
      if (Math.abs(target - joint.angle) < 1e-4) continue;
      const wanted = joint.angle + (target - joint.angle) * blend;
      moveClear(joint, wanted);
      // A target inside the floor is given up rather than pushed at forever.
      if (Math.abs(joint.angle - wanted) > 1e-4) targets.current[joint.name] = joint.angle;
    }
    if (settling.current && movable.every(joint => isMimic(joint) || Math.abs((targets.current[joint.name] ?? 0) - joint.angle) < 0.01)) settling.current = false;
    // The reward show is choreographed, so gravity waits until it ends.
    if (!file.fixedBase && active && born.current > 1 && !settling.current && mission.current.show >= SHOW_SECONDS) balance(step);
    if (active) values.current = Object.fromEntries(movable.map(joint => [joint.name, joint.angle]));
    if (body.current) {
      if (file.fixedBase) body.current.position.y = PLATFORM_TOP;
      else {
        // Stand on the lowest visual; the bounds already include the current offset.
        robot.updateMatrixWorld(true);
        bounds.makeEmpty();
        meshes.forEach(mesh => bounds.expandByObject(mesh));
        if (!bounds.isEmpty()) body.current.position.y += PLATFORM_TOP - bounds.min.y;
      }
    }
    // Robots waiting at the back fade out, so the front one reads as the one you can touch.
    fade.current += ((active ? 1 : 0) - fade.current) * (reduced ? 1 : 1 - Math.exp(-step * 5));
    const opacity = (xray ? 0.2 : 1) * (0.35 + 0.65 * fade.current);
    const glow = 0.3 + 0.2 * Math.sin(clock.elapsedTime * 6);
    for (const [name, materials] of parts) for (const material of materials) {
      const lit = active && name === focus.current?.name;
      material.emissive.set(lit ? RUST : 0x000000);
      material.emissiveIntensity = lit ? glow : 0;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.99;
    }
    (block.material as THREE.MeshStandardMaterial).opacity = 0.35 + 0.65 * fade.current;
    marker.group.visible = active && !state.done;
    if (marker.group.visible) {
      const beat = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4);
      marker.ring.scale.setScalar(1 + 0.35 * beat);
      marker.material.opacity = 0.9 - 0.5 * beat;
      marker.arrow.position.y = 0.1 + 0.03 * beat;
    }
    for (const mesh of meshes) mesh.castShadow = !xray && fade.current > 0.5;
    for (const helper of helpers) helper.visible = xray && active;
  });
  function pick(event: ThreeEvent<MouseEvent>) {
    if (active || event.delta > 5) return;
    event.stopPropagation();
    onSelect(file.id);
  }
  // Each slot sits on the turntable's rim; URDF is Z-up and faces +X, so stand it up and turn it to the viewer.
  return <group rotation={[0, slot, 0]}>
    <group position={[0, 0, RADIUS]} onClick={pick}
      onPointerOver={() => { if (!active) gl.domElement.style.cursor = 'pointer'; }}
      onPointerOut={() => { if (!active) gl.domElement.style.cursor = ''; }}>
      <group ref={body} rotation={[0, FRAMING[file.id].yaw, 0]}><group ref={lean}><primitive object={robot} rotation={[-Math.PI / 2, 0, 0]} /></group></group>
      <mesh position={[0, PLATFORM_TOP + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.5, 0.53, 64]} /><meshStandardMaterial color="#e7d9b4" /></mesh>
    </group>
  </group>;
}

/** Spins the turntable so the chosen robot's slot comes round to the front. */
function Turntable({ active, reduced, children }: { active: RobotId; reduced: boolean; children: React.ReactNode }) {
  const table = useRef<THREE.Group>(null);
  const goal = useRef(0);
  useEffect(() => {
    const target = -ROBOT_IDS.indexOf(active) * SLOT;
    const current = table.current?.rotation.y ?? target;
    // Turn the short way round.
    goal.current = current + THREE.MathUtils.euclideanModulo(target - current + Math.PI, 2 * Math.PI) - Math.PI;
  }, [active]);
  useFrame((_, delta) => {
    if (!table.current) return;
    const blend = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 5);
    table.current.rotation.y += (goal.current - table.current.rotation.y) * blend;
  });
  return <group position={[0, 0, -RADIUS]}>
    <group ref={table}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow><cylinderGeometry args={[RADIUS + 0.7, RADIUS + 0.75, 0.2, 96]} /><meshStandardMaterial color="#648f82" roughness={0.9} /></mesh>
      {children}
    </group>
  </group>;
}

function Framing({ id, reduced }: { id: RobotId; reduced: boolean }) {
  const { camera, size } = useThree();
  // Portrait phones see less width, so come closer to keep the robot big enough to grab.
  const closeness = size.width < size.height ? 0.8 : 1;
  const controls = useThree(state => state.controls) as unknown as {
    target: THREE.Vector3; update: () => void;
    minDistance: number; maxDistance: number; minAzimuthAngle: number; maxAzimuthAngle: number;
  } | null;
  const moving = useRef(true);
  const goal = useMemo(() => ({ target: new THREE.Vector3(), camera: new THREE.Vector3() }), []);
  useEffect(() => {
    goal.target.set(...FRAMING[id].target);
    goal.camera.set(...FRAMING[id].camera).sub(goal.target).multiplyScalar(closeness).add(goal.target);
    moving.current = true;
    // Let the camera travel freely to the new robot; its own limits apply once it arrives.
    if (controls) Object.assign(controls, { minDistance: 0.1, maxDistance: 20, minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity });
  }, [id, goal, closeness, controls]);
  useFrame((_, delta) => {
    if (!controls || !moving.current) return;
    const blend = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 4);
    camera.position.lerp(goal.camera, blend); controls.target.lerp(goal.target, blend); controls.update();
    if (camera.position.distanceTo(goal.camera) > 0.005) return;
    moving.current = false;
    // Stay on the front robot: a little zoom either way, and only enough orbit to see round it
    // without swinging the robots waiting at the back into view.
    const offset = goal.camera.clone().sub(goal.target);
    const azimuth = Math.atan2(offset.x, offset.z), distance = offset.length();
    Object.assign(controls, { minDistance: distance * 0.65, maxDistance: distance * 1.4, minAzimuthAngle: azimuth - 0.9, maxAzimuthAngle: azimuth + 0.9 });
  });
  return null;
}

export default function UrdfPlayground({ active, ...props }: Props) {
  return <Canvas shadows camera={{ position: FRAMING[active].camera, fov: 35 }} dpr={[1, 1.5]} style={{ touchAction: 'none' }} fallback={<p>WebGL is required to see the robots.</p>}>
    <color attach="background" args={['#b9cec2']} />
    <fog attach="fog" args={['#b9cec2', 4.5, 9]} />
    <ambientLight intensity={1.3} /><hemisphereLight args={['#fff0cf', '#7f765e', 1.5]} />
    <directionalLight position={[-3, 6, 4]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
    <Block at={[0, -0.12, -1]} size={[8, 0.24, 8]} color="#dfd4b2" />
    {Array.from({ length: 13 }, (_, i) => <Block key={i} at={[-3.6 + i * 0.6, 0.001, -1]} size={[0.012, 0.01, 8]} color="#c2b995" />)}
    <Turntable active={active} reduced={props.reduced}>
      {ROBOT_IDS.map((id, i) => <Robot key={id} file={ROBOTS[id]} active={id === active} slot={i * SLOT} {...props} />)}
    </Turntable>
    <Framing id={active} reduced={props.reduced} />
    <OrbitControls makeDefault target={FRAMING[active].target} enablePan={false} minPolarAngle={0.35} maxPolarAngle={1.4} />
  </Canvas>;
}
