export class TransformControls extends THREE.Object3D {
    constructor(camera, domElement) {
        super();
        
        this.camera = camera;
        this.domElement = domElement;
        this.object = null;
        this.enabled = true;
        this.dragging = false;
        
        this.mode = 'position'; // 'position', 'rotation', 'scale'
        
        this.positionGizmo = new THREE.Group();
        this.rotationGizmo = new THREE.Group();
        this.scaleGizmo = new THREE.Group();
        this.add(this.positionGizmo);
        this.add(this.rotationGizmo);
        this.add(this.scaleGizmo);
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.prevMouse = new THREE.Vector2();
        this.plane = new THREE.Plane();
        this.planeIntersect = new THREE.Vector3();
        this.prevIntersect = new THREE.Vector3();
        
        // 다중 선택 지원을 위한 변수들
        this.state = null;
        this.initialPositions = new Map(); // 드래그 시작 시 모든 모델의 초기 위치/스케일
        this.pivotPoint = new THREE.Vector3(); // 회전 중심점
        
        this.onPositionChange = null;
        this.onRotationChange = null;
        this.onScaleChange = null;
        
        this.createPositionGizmo();
        this.createRotationGizmo();
        this.createScaleGizmo();
        this.setupEventListeners();
        
        this.visible = false;
        this.updateGizmoVisibility();
    }
    
    // State 참조 설정
    setState(state) {
        this.state = state;
    }
    
    createPositionGizmo() {
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
        
        this.positionGizmo.add(xArrow, xShaft, yArrow, yShaft, zArrow, zShaft);
        this.positionGizmo.add(xyPlane, yzPlane, zxPlane);
        
        this.positionHandles = [xArrow, xShaft, yArrow, yShaft, zArrow, zShaft, xyPlane, yzPlane, zxPlane];
    }

    createRotationGizmo() {
        const torusGeometry = new THREE.TorusGeometry(1.0, 0.04, 12, 32);
        
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
        
        // X축 회전 고리 (빨강) - YZ 평면
        const xTorus = new THREE.Mesh(torusGeometry, xMaterial);
        xTorus.rotation.y = Math.PI / 2;
        xTorus.userData.axis = 'x';
        xTorus.userData.isGizmo = true;
        xTorus.renderOrder = 999;
        
        // Y축 회전 고리 (초록) - XZ 평면
        const yTorus = new THREE.Mesh(torusGeometry, yMaterial);
        yTorus.rotation.x = Math.PI / 2;
        yTorus.userData.axis = 'y';
        yTorus.userData.isGizmo = true;
        yTorus.renderOrder = 999;
        
        // Z축 회전 고리 (파랑) - XY 평면
        const zTorus = new THREE.Mesh(torusGeometry, zMaterial);
        zTorus.userData.axis = 'z';
        zTorus.userData.isGizmo = true;
        zTorus.renderOrder = 999;
        
        this.rotationGizmo.add(xTorus, yTorus, zTorus);
        this.rotationHandles = [xTorus, yTorus, zTorus];
    }

    createScaleGizmo() {
        const cubeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const shaftGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 12);
        
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
        const uniformMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            depthTest: false, 
            depthWrite: false
        });
        
        // X축 스케일 핸들 (빨강)
        const xCube = new THREE.Mesh(cubeGeometry, xMaterial);
        const xShaft = new THREE.Mesh(shaftGeometry, xMaterial);
        xCube.position.set(1, 0, 0);
        xShaft.position.set(0.5, 0, 0);
        xShaft.rotation.z = -Math.PI / 2;
        xCube.userData.axis = 'x';
        xShaft.userData.axis = 'x';
        xCube.userData.isGizmo = true;
        xShaft.userData.isGizmo = true;
        xCube.renderOrder = 999;
        xShaft.renderOrder = 999;
        
        // Y축 스케일 핸들 (초록)
        const yCube = new THREE.Mesh(cubeGeometry, yMaterial);
        const yShaft = new THREE.Mesh(shaftGeometry, yMaterial);
        yCube.position.set(0, 1, 0);
        yShaft.position.set(0, 0.5, 0);
        yCube.userData.axis = 'y';
        yShaft.userData.axis = 'y';
        yCube.userData.isGizmo = true;
        yShaft.userData.isGizmo = true;
        yCube.renderOrder = 999;
        yShaft.renderOrder = 999;
        
        // Z축 스케일 핸들 (파랑)
        const zCube = new THREE.Mesh(cubeGeometry, zMaterial);
        const zShaft = new THREE.Mesh(shaftGeometry, zMaterial);
        zCube.position.set(0, 0, 1);
        zShaft.position.set(0, 0, 0.5);
        zShaft.rotation.x = Math.PI / 2;
        zCube.userData.axis = 'z';
        zShaft.userData.axis = 'z';
        zCube.userData.isGizmo = true;
        zShaft.userData.isGizmo = true;
        zCube.renderOrder = 999;
        zShaft.renderOrder = 999;
        
        // 균등 스케일 핸들 (중앙, 흰색)
        const uniformCube = new THREE.Mesh(cubeGeometry, uniformMaterial);
        uniformCube.position.set(0, 0, 0);
        uniformCube.scale.set(1.2, 1.2, 1.2); // 조금 더 크게
        uniformCube.userData.axis = 'uniform';
        uniformCube.userData.isGizmo = true;
        uniformCube.renderOrder = 999;
        
        this.scaleGizmo.add(xCube, xShaft, yCube, yShaft, zCube, zShaft, uniformCube);
        this.scaleHandles = [xCube, xShaft, yCube, yShaft, zCube, zShaft, uniformCube];
    }

    updateGizmoVisibility() {
        this.positionGizmo.visible = (this.mode === 'position');
        this.rotationGizmo.visible = (this.mode === 'rotation');
        this.scaleGizmo.visible = (this.mode === 'scale');
    }

    setMode(mode) {
        this.mode = mode;
        this.updateGizmoVisibility();
        this.selectedAxis = null;
        this.dragging = false;
    }
    
    attach(object) {
        this.object = object;
        if (object && this.state) {
            // 선택된 모든 모델의 중심점으로 기즈모 위치 설정
            const center = this.state.getSelectionCenter();
            this.position.copy(center);
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
        
        const currentHandles = this.getCurrentHandles();
        const intersects = this.raycaster.intersectObjects(currentHandles, true);
        
        if (intersects.length > 0) {
            this.selectedAxis = intersects[0].object.userData.axis;
            this.dragging = true;
            
            // 마우스 위치 저장
            this.prevMouse.copy(this.mouse);
            
            if (this.mode === 'position') {
                this.handlePositionStart();
            } else if (this.mode === 'rotation') {
                this.handleRotationStart();
            } else if (this.mode === 'scale') {
                this.handleScaleStart();
            }
            
            event.stopPropagation();
            event.preventDefault();
        }
    }

    getCurrentHandles() {
        switch (this.mode) {
            case 'position': return this.positionHandles;
            case 'rotation': return this.rotationHandles;
            case 'scale': return this.scaleHandles;
            default: return [];
        }
    }

    handlePositionStart() {
        // 다중 선택된 모델들의 초기 위치 저장
        if (this.state) {
            this.initialPositions.clear();
            const selectedModels = this.state.getSelectedModels();
            for (let i = 0; i < selectedModels.length; i++) {
                const model = selectedModels[i];
                this.initialPositions.set(model.id, {
                    x: model.position.x,
                    y: model.position.y,
                    z: model.position.z
                });
            }
        }
        
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
    }

    handleRotationStart() {
        // 회전 중심점을 기즈모 위치로 설정
        this.pivotPoint.copy(this.position);
        
        // 다중 선택된 모델들의 초기 상태 저장 (더 정확하게)
        if (this.state) {
            this.initialPositions.clear();
            const selectedModels = this.state.getSelectedModels();
            for (let i = 0; i < selectedModels.length; i++) {
                const model = selectedModels[i];
                const object = model.object;
                
                // 현재 월드 위치와 쿼터니언 저장
                const worldPos = new THREE.Vector3();
                const worldQuat = new THREE.Quaternion();
                object.getWorldPosition(worldPos);
                object.getWorldQuaternion(worldQuat);
                
                this.initialPositions.set(model.id, {
                    worldPosition: worldPos.clone(),
                    worldQuaternion: worldQuat.clone(),
                    localPosition: { ...model.position },
                    localRotation: { ...model.rotation }
                });
            }
        }
    }

    handleScaleStart() {
        // 다중 선택된 모델들의 초기 스케일 저장
        if (this.state) {
            this.initialPositions.clear();
            const selectedModels = this.state.getSelectedModels();
            for (let i = 0; i < selectedModels.length; i++) {
                const model = selectedModels[i];
                this.initialPositions.set(model.id, {
                    scale: typeof model.scale === 'number' ? 
                        { x: model.scale, y: model.scale, z: model.scale } :
                        { ...model.scale }
                });
            }
        }
    }
    
    onPointerMove(event) {
        if (!this.dragging || !this.object) return;
        
        this.mouse.x = (event.clientX / this.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.domElement.clientHeight) * 2 + 1;
        
        if (this.mode === 'position') {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            this.handlePositionMove();
        } else if (this.mode === 'rotation') {
            this.handleRotationMove();
        } else if (this.mode === 'scale') {
            this.handleScaleMove();
        }
        
        event.stopPropagation();
        event.preventDefault();
    }

    handlePositionMove() {
        if (this.raycaster.ray.intersectPlane(this.plane, this.planeIntersect)) {
            const delta = new THREE.Vector3().subVectors(this.planeIntersect, this.prevIntersect);
            
            // 기즈모 위치 업데이트
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
            
            // 선택된 모든 모델들에 동일한 이동량 적용
            if (this.state) {
                const moveDelta = new THREE.Vector3();
                if (this.selectedAxis === 'x') {
                    moveDelta.set(delta.x, 0, 0);
                } else if (this.selectedAxis === 'y') {
                    moveDelta.set(0, delta.y, 0);
                } else if (this.selectedAxis === 'z') {
                    moveDelta.set(0, 0, delta.z);
                } else if (this.selectedAxis === 'xy') {
                    moveDelta.set(delta.x, delta.y, 0);
                } else if (this.selectedAxis === 'yz') {
                    moveDelta.set(0, delta.y, delta.z);
                } else if (this.selectedAxis === 'zx') {
                    moveDelta.set(delta.x, 0, delta.z);
                }
                
                this.state.moveSelectedModels(moveDelta);
            }
            
            // 개별 오브젝트도 업데이트 (메인 모델)
            if (this.object) {
                this.object.position.copy(this.position);
            }
            
            this.prevIntersect.copy(this.planeIntersect);
            
            if (this.onPositionChange) {
                this.onPositionChange(this.position);
            }
        }
    }

    handleRotationMove() {
        // 마우스 이동량 계산
        const deltaX = this.mouse.x - this.prevMouse.x;
        const deltaY = this.mouse.y - this.prevMouse.y;
        
        const rotationSpeed = 1.5;
        
        const deltaRotation = { x: 0, y: 0, z: 0 };
        
        if (this.selectedAxis === 'x') {
            // X축 회전 - 마우스 Y 이동으로 제어
            deltaRotation.x = -deltaY * rotationSpeed;
        } else if (this.selectedAxis === 'y') {
            // Y축 회전 - 마우스 X 이동으로 제어
            deltaRotation.y = deltaX * rotationSpeed;
        } else if (this.selectedAxis === 'z') {
            // Z축 회전 - 다른 축과 동일한 방식으로 제어
            deltaRotation.z = -deltaY * rotationSpeed;
        }
        
        // 선택된 모든 모델들에 회전 적용
        if (this.state) {
            this.state.rotateSelectedModels(deltaRotation, this.pivotPoint);
        }
        
        // 메인 객체는 별도로 회전하지 않음 (이미 rotateSelectedModels에서 처리됨)
        
        this.prevMouse.copy(this.mouse);
        
        // UI 업데이트를 위한 콜백 (마지막 선택된 객체 기준)
        if (this.onRotationChange && this.object) {
            this.onRotationChange(this.object.rotation);
        }
    }

    handleScaleMove() {
        // 마우스 이동량 계산
        const deltaX = this.mouse.x - this.prevMouse.x;
        const deltaY = this.mouse.y - this.prevMouse.y;
        
        const scaleSpeed = 2.0;
        const scaleDelta = -deltaY * scaleSpeed; // Y축 이동으로 스케일 조절
        
        // 선택된 모든 모델들에 스케일 적용
        if (this.state) {
            const selectedModels = this.state.getSelectedModels();
            
            for (let i = 0; i < selectedModels.length; i++) {
                const model = selectedModels[i];
                const initialScale = this.initialPositions.get(model.id).scale;
                let newScale;
                
                if (this.selectedAxis === 'uniform') {
                    // 균등 스케일
                    const factor = 1 + scaleDelta;
                    newScale = {
                        x: Math.max(0.1, initialScale.x * factor),
                        y: Math.max(0.1, initialScale.y * factor),
                        z: Math.max(0.1, initialScale.z * factor)
                    };
                } else if (this.selectedAxis === 'x') {
                    // X축만 스케일
                    const factor = 1 + scaleDelta;
                    newScale = {
                        x: Math.max(0.1, initialScale.x * factor),
                        y: initialScale.y,
                        z: initialScale.z
                    };
                } else if (this.selectedAxis === 'y') {
                    // Y축만 스케일
                    const factor = 1 + scaleDelta;
                    newScale = {
                        x: initialScale.x,
                        y: Math.max(0.1, initialScale.y / factor),
                        z: initialScale.z
                    };
                } else if (this.selectedAxis === 'z') {
                    // Z축만 스케일
                    const factor = 1 + scaleDelta;
                    newScale = {
                        x: initialScale.x,
                        y: initialScale.y,
                        z: Math.max(0.1, initialScale.z * factor)
                    };
                }
                
                this.state.updateModelScale(model.id, newScale);
            }
        }
        
        // UI 업데이트를 위한 콜백
        if (this.onScaleChange && this.state.lastSelectedModel) {
            const lastSelected = this.state.getLastSelectedModel();
            if (lastSelected) {
                this.onScaleChange(lastSelected.scale);
            }
        }
    }
    
    onPointerUp(event) {
        this.dragging = false;
        this.selectedAxis = null;
    }
    
    update() {
        // 드래그 중이 아닐 때만 위치 업데이트
        if (!this.dragging && this.state && this.visible) {
            // 선택된 모델들의 중심점으로 기즈모 위치 업데이트
            const center = this.state.getSelectionCenter();
            this.position.copy(center);
        }
        
        if (this.visible && this.camera) {
            const distance = this.camera.position.distanceTo(this.position);
            const scaleFactor = distance * 0.1;
            this.positionGizmo.scale.set(scaleFactor, scaleFactor, scaleFactor);
            this.rotationGizmo.scale.set(scaleFactor, scaleFactor, scaleFactor);
            this.scaleGizmo.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
    }
    
    // 핸들 접근자 (호환성을 위해)
    get handles() {
        return this.getCurrentHandles();
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