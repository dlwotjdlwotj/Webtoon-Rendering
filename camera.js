export class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.mouseDown = false;
        this.mouseButton = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.cameraDistance = 8;
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.onGizmoModeChange = null;
        
        this.keys = { w: false, a: false, s: false, d: false, q: false, e: false, g: false };
        this.moveSpeed = 0.1;
    }

    onMouseDown(event) {
        this.mouseDown = true;
        this.mouseButton = event.button;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        // 우클릭이면 카메라 컨트롤을 위해 이벤트 전파를 중단
        if (event.button === 2) {
            event.stopPropagation();
        }
    }

    onMouseMove(event) {
        if (!this.mouseDown) return;
        
        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;
        
        if (this.mouseButton === 2) {  // 우클릭일 때 카메라 회전
            const rotationSpeed = 0.005;
            
            const direction = new THREE.Vector3();
            direction.subVectors(this.cameraTarget, this.camera.position).normalize();
            
            const yRotation = new THREE.Matrix4().makeRotationY(-deltaX * rotationSpeed);
            direction.applyMatrix4(yRotation);
            
            const up = new THREE.Vector3(0, 1, 0);
            const right = new THREE.Vector3().crossVectors(direction, up).normalize();
            const xRotation = new THREE.Matrix4().makeRotationAxis(right, -deltaY * rotationSpeed);
            direction.applyMatrix4(xRotation);
            
            const lookDistance = 10;
            this.cameraTarget.copy(this.camera.position).add(direction.multiplyScalar(lookDistance));
            
            this.camera.lookAt(this.cameraTarget);
            this.syncWithCamera();
            
            // 우클릭 드래그 시 이벤트 전파 중단
            event.stopPropagation();
        }
        
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    onMouseUp() {
        this.mouseDown = false;
    }

    onMouseWheel(event) {
        const zoomFactor = this.cameraDistance * 0.001;
        const zoomSpeed = Math.max(0.001, Math.min(10, zoomFactor));
        
        this.cameraDistance += event.deltaY * zoomSpeed;
        this.cameraDistance = Math.max(0.001, Math.min(10000, this.cameraDistance));
        
        this.updatePosition();
        
        // 휠 이벤트도 카메라 컨트롤 우선
        event.stopPropagation();
    }

    onKeyDown(event) {
        if (document.activeElement.tagName === 'INPUT') return;
        
        const key = event.key.toLowerCase();
        
        // 이동 키들만 처리 (기즈모 모드 변경은 main.js에서 이미 처리됨)
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
            event.preventDefault();
        }
    }

    onKeyUp(event) {
        const key = event.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
            event.preventDefault();
        }
    }

    handleMovement() {
        if (!Object.values(this.keys).some(pressed => pressed)) return;
        
        // 우클릭일 때만 이동
        if (!this.mouseDown || this.mouseButton !== 2) return;
        
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        
        forward.subVectors(this.cameraTarget, this.camera.position).normalize();
        right.crossVectors(forward, up).normalize();
        up.crossVectors(right, forward).normalize();
        
        const moveVector = new THREE.Vector3();
        
        if (this.keys.w) moveVector.add(forward.clone().multiplyScalar(this.moveSpeed));
        if (this.keys.s) moveVector.add(forward.clone().multiplyScalar(-this.moveSpeed));
        if (this.keys.a) moveVector.add(right.clone().multiplyScalar(-this.moveSpeed));
        if (this.keys.d) moveVector.add(right.clone().multiplyScalar(this.moveSpeed));
        if (this.keys.q) moveVector.add(up.clone().multiplyScalar(-this.moveSpeed));
        if (this.keys.e) moveVector.add(up.clone().multiplyScalar(this.moveSpeed));
        
        this.camera.position.add(moveVector);
        this.cameraTarget.add(moveVector);
        
        this.camera.lookAt(this.cameraTarget);
        this.syncWithCamera();
    }

    updatePosition() {
        const x = this.cameraDistance * Math.cos(this.cameraRotationX) * Math.sin(this.cameraRotationY);
        const y = this.cameraDistance * Math.sin(this.cameraRotationX);
        const z = this.cameraDistance * Math.cos(this.cameraRotationX) * Math.cos(this.cameraRotationY);
        
        this.camera.position.set(
            this.cameraTarget.x + x,
            this.cameraTarget.y + y,
            this.cameraTarget.z + z
        );
        this.camera.lookAt(this.cameraTarget);
    }

    syncWithCamera() {
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, this.cameraTarget);
        
        this.cameraDistance = direction.length();
        
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(direction);
        
        this.cameraRotationX = Math.PI/2 - spherical.phi;
        this.cameraRotationY = spherical.theta;
        
        this.cameraRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.cameraRotationX));
    }

    reset() {
        this.cameraDistance = 8;
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        this.cameraTarget.set(0, 0, 0);
        this.updatePosition();
    }

    setMoveSpeed(speed) {
        this.moveSpeed = speed;
    }

    // 우클릭 상태 확인 메서드 추가
    isRightMouseDown() {
        return this.mouseDown && this.mouseButton === 2;
    }
}