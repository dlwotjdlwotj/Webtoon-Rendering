export class TransformControls extends THREE.Object3D {
    constructor(camera, domElement) {
        super();
        
        this.camera = camera;
        this.domElement = domElement;
        this.object = null;
        this.enabled = true;
        this.dragging = false;
        
        this.gizmo = new THREE.Group();
        this.add(this.gizmo);
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.prevMouse = new THREE.Vector2();
        this.plane = new THREE.Plane();
        this.planeIntersect = new THREE.Vector3();
        this.prevIntersect = new THREE.Vector3();
        
        this.onPositionChange = null;
        
        this.createGizmo();
        this.setupEventListeners();
        
        this.visible = false;
    }
    
    createGizmo() {
        const arrowGeometry = new THREE.CylinderGeometry(0, 0.08, 0.25, 12);
        const shaftGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12);
        
        const planeSize = 0.35;
        const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
        
        const xMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            depthTest: false, 
            depthWrite: false
        });
        const yMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            depthTest: false, 
            depthWrite: false
        });
        const zMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0000ff, 
            depthTest: false, 
            depthWrite: false
        });
        
        // 평면 이동용 재질 (반투명)
        const xyPlaneMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0000ff, 
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthTest: false, 
            depthWrite: false
        });
        const yzPlaneMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthTest: false, 
            depthWrite: false
        });
        const zxPlaneMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthTest: false, 
            depthWrite: false
        });
        
        // X축 (빨강)
        const xArrow = new THREE.Mesh(arrowGeometry, xMaterial);
        const xShaft = new THREE.Mesh(shaftGeometry, xMaterial);
        xArrow.position.set(1, 0, 0);
        xArrow.rotation.z = -Math.PI / 2;
        xShaft.position.set(0.5, 0, 0);
        xShaft.rotation.z = -Math.PI / 2;
        xArrow.userData.axis = 'x';
        xShaft.userData.axis = 'x';
        xArrow.userData.isGizmo = true;
        xShaft.userData.isGizmo = true;
        xArrow.renderOrder = 999;
        xShaft.renderOrder = 999;
        
        // Y축 (초록)
        const yArrow = new THREE.Mesh(arrowGeometry, yMaterial);
        const yShaft = new THREE.Mesh(shaftGeometry, yMaterial);
        yArrow.position.set(0, 1, 0);
        yShaft.position.set(0, 0.5, 0);
        yArrow.userData.axis = 'y';
        yShaft.userData.axis = 'y';
        yArrow.userData.isGizmo = true;
        yShaft.userData.isGizmo = true;
        yArrow.renderOrder = 999;
        yShaft.renderOrder = 999;
        
        // Z축 (파랑)
        const zArrow = new THREE.Mesh(arrowGeometry, zMaterial);
        const zShaft = new THREE.Mesh(shaftGeometry, zMaterial);
        zArrow.position.set(0, 0, 1);
        zArrow.rotation.x = Math.PI / 2;
        zShaft.position.set(0, 0, 0.5);
        zShaft.rotation.x = Math.PI / 2;
        zArrow.userData.axis = 'z';
        zShaft.userData.axis = 'z';
        zArrow.userData.isGizmo = true;
        zShaft.userData.isGizmo = true;
        zArrow.renderOrder = 999;
        zShaft.renderOrder = 999;
        
        const xyPlane = new THREE.Mesh(planeGeometry, xyPlaneMaterial);
        xyPlane.position.set(0.175, 0.175, 0);
        xyPlane.userData.axis = 'xy';
        xyPlane.userData.isGizmo = true;
        xyPlane.renderOrder = 998;
        
        const yzPlane = new THREE.Mesh(planeGeometry, yzPlaneMaterial);
        yzPlane.position.set(0, 0.175, 0.175);
        yzPlane.rotation.y = Math.PI / 2;
        yzPlane.userData.axis = 'yz';
        yzPlane.userData.isGizmo = true;
        yzPlane.renderOrder = 998;
        
        const zxPlane = new THREE.Mesh(planeGeometry, zxPlaneMaterial);
        zxPlane.position.set(0.175, 0, 0.175);
        zxPlane.rotation.x = Math.PI / 2;
        zxPlane.userData.axis = 'zx';
        zxPlane.userData.isGizmo = true;
        zxPlane.renderOrder = 998;
        
        this.gizmo.add(xArrow, xShaft, yArrow, yShaft, zArrow, zShaft);
        this.gizmo.add(xyPlane, yzPlane, zxPlane);
        
        this.handles = [xArrow, xShaft, yArrow, yShaft, zArrow, zShaft, xyPlane, yzPlane, zxPlane];
        this.selectedAxis = null;
    }
    
    attach(object) {
        this.object = object;
        if (object) {
            this.position.copy(object.position);
            this.visible = true;
        } else {
            this.visible = false;
        }
        return this;
    }
    
    detach() {
        this.object = null;
        this.visible = false;
        return this;
    }
    
    setupEventListeners() {
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        
        this.domElement.addEventListener('pointerdown', this.onPointerDown, false);
        this.domElement.addEventListener('pointermove', this.onPointerMove, false);
        this.domElement.addEventListener('pointerup', this.onPointerUp, false);
    }
    
    onPointerDown(event) {
        if (!this.enabled || !this.object || !this.visible) return;
        
        this.mouse.x = (event.clientX / this.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.handles, true);
        
        if (intersects.length > 0) {
            this.selectedAxis = intersects[0].object.userData.axis;
            this.dragging = true;
            
            const planeNormal = new THREE.Vector3();
            
            if (this.selectedAxis === 'x') {
                planeNormal.set(0, 0, 1); // YZ 평면
            } else if (this.selectedAxis === 'y') {
                planeNormal.set(0, 0, 1); // XZ 평면
            } else if (this.selectedAxis === 'z') {
                planeNormal.set(0, 1, 0); // XY 평면
            } else if (this.selectedAxis === 'xy') {
                planeNormal.set(0, 0, 1); // XY 평면 이동
            } else if (this.selectedAxis === 'yz') {
                planeNormal.set(1, 0, 0); // YZ 평면 이동
            } else if (this.selectedAxis === 'zx') {
                planeNormal.set(0, 1, 0); // ZX 평면 이동
            }
            
            this.plane.setFromNormalAndCoplanarPoint(planeNormal, this.position);
            
            if (this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect)) {
                this.prevIntersect.copy(this.planeIntersect);
            }
            
            event.stopPropagation();
            event.preventDefault();
        }
    }
    
    onPointerMove(event) {
        if (!this.dragging || !this.object) return;
        
        this.mouse.x = (event.clientX / this.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        if (this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect)) {
            const delta = new THREE.Vector3().subVectors(this.planeIntersect, this.prevIntersect);
            
            if (this.selectedAxis === 'x') {
                this.position.x += delta.x;
            } else if (this.selectedAxis === 'y') {
                this.position.y += delta.y;
            } else if (this.selectedAxis === 'z') {
                this.position.z += delta.z;
            } else if (this.selectedAxis === 'xy') {
                this.position.x += delta.x;
                this.position.y += delta.y;
            } else if (this.selectedAxis === 'yz') {
                this.position.y += delta.y;
                this.position.z += delta.z;
            } else if (this.selectedAxis === 'zx') {
                this.position.z += delta.z;
                this.position.x += delta.x;
            }
            
            this.object.position.copy(this.position);
            this.prevIntersect.copy(this.planeIntersect);
            
            if (this.onPositionChange) {
                this.onPositionChange(this.position);
            }
        }
        
        event.stopPropagation();
        event.preventDefault();
    }
    
    onPointerUp(event) {
        this.dragging = false;
        this.selectedAxis = null;
    }
    
    update() {
        if (this.object && !this.dragging) {
            this.position.copy(this.object.position);
        }
        
        if (this.visible && this.camera) {
            const distance = this.camera.position.distanceTo(this.position);
            const scaleFactor = distance * 0.1;
            this.gizmo.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.visible = false;
        }
    }
    
    dispose() {
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.domElement.removeEventListener('pointerup', this.onPointerUp);
    }
}