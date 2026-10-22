declare module 'urdf-loader/src/URDFDragControls.js' {
  import type { Object3D, Ray } from 'three';
  import type { URDFJoint } from 'urdf-loader';
  /** urdf-loader's joint dragging: raycasts the robot and turns the grabbed joint about its URDF axis. */
  export class URDFDragControls {
    constructor(scene: Object3D);
    enabled: boolean;
    hovered: URDFJoint | null;
    manipulating: URDFJoint | null;
    moveRay(ray: Ray): void;
    setGrabbed(grabbed: boolean): void;
    updateJoint(joint: URDFJoint, angle: number): void;
    onDragStart(joint: URDFJoint): void;
    onDragEnd(joint: URDFJoint): void;
    onHover(joint: URDFJoint): void;
    onUnhover(joint: URDFJoint): void;
  }
}
