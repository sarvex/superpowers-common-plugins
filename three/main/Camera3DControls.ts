import Camera from "./Camera";

const tmpVector3 = new THREE.Vector3();
const tmpQuaternion = new THREE.Quaternion();
const upVector = new THREE.Vector3(0, 1, 0);

const moveSpeed = 0.3;
const lerpFactor = 0.25;
const minOrbitingRadius = 0.5;

export default class Camera3DControls {
  private isPanning = false;

  private isOrbiting = false;
  private orbitingPivot: THREE.Vector3;

  private radius = 10;

  // Horizontal angle
  private theta: number;
  private targetTheta: number;
  // Vertical angle
  private phi: number;
  private targetPhi: number;

  private moveVector = new THREE.Vector3();

  constructor(private camera: Camera, private canvas: HTMLCanvasElement) {
    this.orbitingPivot = new THREE.Vector3(0, 0, -this.radius).applyQuaternion(this.camera.threeCamera.quaternion).add(this.camera.threeCamera.position);

    tmpQuaternion.setFromUnitVectors(this.camera.threeCamera.up, upVector);
    tmpVector3.copy(this.camera.threeCamera.position).sub(this.orbitingPivot).applyQuaternion(tmpQuaternion);

    this.theta = Math.atan2(tmpVector3.x, tmpVector3.z);
    this.targetTheta = this.theta;
    this.phi = Math.atan2(Math.sqrt(tmpVector3.x * tmpVector3.x + tmpVector3.z * tmpVector3.z), tmpVector3.y);
    this.targetPhi = this.phi;

    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("wheel", this.onWheel);
    canvas.addEventListener("keydown", this.onKeyDown);
    canvas.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("mouseout", this.onMouseUp);
    canvas.addEventListener("contextmenu", (event) => { event.preventDefault(); });
  }

  private onMouseDown = (event: MouseEvent) => {
    if (this.isPanning || this.isOrbiting) return;

    if (event.button === 2) {
      this.isPanning = true;

    } else if (event.button === 1 || (event.button === 0 && event.altKey)) {
      this.isOrbiting = true;
      this.orbitingPivot = new THREE.Vector3(0, 0, -this.radius).applyQuaternion(this.camera.threeCamera.quaternion).add(this.camera.threeCamera.position);

      tmpQuaternion.setFromUnitVectors(this.camera.threeCamera.up, upVector);
      tmpVector3.copy(this.camera.threeCamera.position).sub(this.orbitingPivot).applyQuaternion(tmpQuaternion);

      this.theta = Math.atan2(tmpVector3.x, tmpVector3.z);
      this.targetTheta = this.theta;
      this.phi = Math.atan2(Math.sqrt(tmpVector3.x * tmpVector3.x + tmpVector3.z * tmpVector3.z), tmpVector3.y);
      this.targetPhi = this.phi;
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (this.isPanning) {
      tmpVector3.set(-event.movementX / 10, event.movementY / 10, 0).applyQuaternion(this.camera.threeCamera.quaternion);
      this.orbitingPivot.add(tmpVector3);
      this.camera.threeCamera.position.add(tmpVector3);
      this.camera.threeCamera.updateMatrixWorld(false);

    } else if (this.isOrbiting) {
      this.targetTheta -= event.movementX / 50;
      this.targetPhi -= event.movementY / 50;

      this.targetPhi = Math.max(0.001, Math.min(Math.PI - 0.001, this.targetPhi));
    }
  };

  private onWheel = (event: WheelEvent) => {
    const multiplicator = event.deltaY / 100 * 1.3;
    if (event.deltaY > 0) this.radius *= multiplicator;
    else if (event.deltaY < 0) this.radius /= -multiplicator;
    this.radius = Math.max(this.radius, minOrbitingRadius);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 87 /* W */ || event.keyCode === 90 /* Z */) {
      this.moveVector.z = -1;
    } else if (event.keyCode === 83 /* S */) {
      this.moveVector.z = 1;
    } else if (event.keyCode === 81 /* W */ || event.keyCode === 65 /* A */) {
      this.moveVector.x = -1;
    } else if (event.keyCode === 68 /* D */) {
      this.moveVector.x = 1;
    } else if (event.keyCode === 32 /* SPACE */) {
      this.moveVector.y = 1;
    } else if (event.keyCode === 16 /* SHIFT */) {
      this.moveVector.y = -1;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (event.keyCode === 87 /* W */ || event.keyCode === 90 /* Z */) {
      this.moveVector.z = 0;
    } else if (event.keyCode === 83 /* S */) {
      this.moveVector.z = 0;
    } else if (event.keyCode === 81 /* W */ || event.keyCode === 65 /* A */) {
      this.moveVector.x = 0;
    } else if (event.keyCode === 68 /* D */) {
      this.moveVector.x = 0;
    } else if (event.keyCode === 32 /* SPACE */) {
      this.moveVector.y = 0;
    } else if (event.keyCode === 16 /* SHIFT */) {
      this.moveVector.y = 0;
    }
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 2) this.isPanning = false;
    else if (event.button === 1 || event.button === 0) this.isOrbiting = false;
  };

  update() {
    if (this.moveVector.length() !== 0) {
      let rotatedMoveVector = this.moveVector.clone();
      rotatedMoveVector.applyQuaternion(this.camera.threeCamera.quaternion).normalize().multiplyScalar(moveSpeed);
      this.camera.threeCamera.position.add(rotatedMoveVector);
      this.orbitingPivot.add(rotatedMoveVector);
    }

    this.theta += (this.targetTheta - this.theta) * lerpFactor;
    this.phi += (this.targetPhi - this.phi) * lerpFactor;

    tmpVector3.x = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    tmpVector3.y = this.radius * Math.cos(this.phi);
    tmpVector3.z = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    tmpVector3.applyQuaternion(tmpQuaternion.clone().inverse());

    this.camera.threeCamera.position.copy(this.orbitingPivot).add(tmpVector3);
    this.camera.threeCamera.lookAt(this.orbitingPivot);
    this.camera.threeCamera.updateMatrixWorld(false);
  }
}