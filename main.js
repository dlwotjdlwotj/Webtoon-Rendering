import { CONFIG, AppState } from './config.js';
import { RenderManager } from './renderer.js';
import { CameraController } from './camera.js';
import { GLBLoader } from './loaders/glbLoader.js';
import { OBJLoader } from './loaders/objLoader.js';
import { UIControls } from './uiControls.js';
import { TransformControls } from './transformControls.js';
import { HistoryManager } from './historyManager.js';

const state = new AppState();
let renderManager, cameraController, uiControls, transformControls, historyManager;

function init() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(CONFIG.renderer.backgroundColor);
    
    state.camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,
        window.innerWidth / window.innerHeight,
        CONFIG.camera.near,
        CONFIG.camera.far
    );
    
    state.renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        preserveDrawingBuffer: true,
        alpha: true
    });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.toneMapping = CONFIG.renderer.toneMapping;
    state.renderer.outputEncoding = CONFIG.renderer.outputEncoding;
    document.getElementById('container').appendChild(state.renderer.domElement);
    
    renderManager = new RenderManager(state);
    renderManager.setupRenderTargets();
    
    cameraController = new CameraController(state.camera);
    
    // 히스토리 매니저 초기화
    historyManager = new HistoryManager(state);
    
    uiControls = new UIControls(state, cameraController, renderManager, historyManager);
    
    transformControls = new TransformControls(state.camera, state.renderer.domElement);
    transformControls.setState(state); // state 참조 설정
    state.scene.add(transformControls);
    
    transformControls.onPositionChange = (position) => {
        if (state.lastSelectedModel) {
            state.updateModelPosition(state.lastSelectedModel, {
                x: position.x,
                y: position.y,
                z: position.z
            });
            uiControls.updateModelPositionUI(state.getLastSelectedModel().position);
        }
    };
    
    transformControls.onRotationChange = (rotation) => {
        if (state.lastSelectedModel) {
            state.updateModelRotation(state.lastSelectedModel, {
                x: rotation.x * 180 / Math.PI,
                y: rotation.y * 180 / Math.PI,
                z: rotation.z * 180 / Math.PI
            });
            uiControls.updateModelRotationUI(state.getLastSelectedModel().rotation);
        }
    };
    
    transformControls.onScaleChange = (scale) => {
        if (state.lastSelectedModel) {
            uiControls.updateModelScaleUI(scale);
        }
    };
    
    // 드래그 완료 시 히스토리 저장
    transformControls.onPositionDragEnd = () => {
        historyManager.onModelMoved();
    };
    
    transformControls.onRotationDragEnd = () => {
        historyManager.onModelRotated();
    };
    
    transformControls.onScaleDragEnd = () => {
        historyManager.onModelScaled();
    };
    
    setupLighting();
    setupEventListeners();
    
    cameraController.updatePosition();
    
    // 초기 상태를 히스토리에 저장
    historyManager.saveInitialState();
    
    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 2.0);
    state.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 5);
    state.scene.add(directionalLight);
}

function setupEventListeners() {
    const canvas = state.renderer.domElement;
    
    // 캔버스 이벤트 리스너 - 카메라 컨트롤이 우선 
    canvas.addEventListener('mousedown', (e) => {
        // 우클릭은 항상 카메라 컨트롤러가 먼저 처리
        cameraController.onMouseDown(e);
        
        // 좌클릭만 모델 선택 처리
        if (e.button === 0) {
            handleCanvasClick(e);
        }
    });
    
    canvas.addEventListener('mousemove', (e) => cameraController.onMouseMove(e));
    canvas.addEventListener('mouseup', () => cameraController.onMouseUp());
    canvas.addEventListener('wheel', (e) => cameraController.onMouseWheel(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // 키보드 이벤트 처리 - window에서 캡처하여 우선순위 높임
    window.addEventListener('keydown', (e) => {
        // INPUT 태그에 포커스가 있으면 무시
        if (document.activeElement.tagName === 'INPUT') return;
        
        const key = e.key.toLowerCase();
        
        // Ctrl+Z로 실행 취소 (최우선 처리)
        if (e.ctrlKey && key === 'z' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            historyManager.undo();
            console.log('Ctrl+Z 실행됨'); // 디버그용
            return;
        }
        
        // Ctrl+Y 또는 Ctrl+Shift+Z로 다시 실행
        if ((e.ctrlKey && key === 'y') || (e.ctrlKey && e.shiftKey && key === 'z')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            historyManager.redo();
            console.log('Ctrl+Y 실행됨'); // 디버그용
            return;
        }
        
        // Ctrl+A로 모든 모델 선택
        if (e.ctrlKey && key === 'a') {
            e.preventDefault();
            e.stopPropagation();
            state.selectAllModels();
            updateSelectionUI();
            return;
        }
        
        // Delete 키로 선택된 모델들 삭제
        if (e.key === 'Delete' && state.selectedModels.size > 0) {
            e.preventDefault();
            e.stopPropagation();
            deleteSelectedModels();
            return;
        }
        
        // 우클릭 중이면 모든 키를 카메라 이동으로 처리
        if (cameraController.isRightMouseDown()) {
            cameraController.onKeyDown(e);
            return;
        }
        
        // Q, W, E 키로 기즈모 모드 전환 - 모델이 있고 우클릭 중이 아닐 때만
        if (state.lastSelectedModel) {
            if (key === 'q') {
                e.preventDefault();
                e.stopPropagation();
                switchToPositionMode();
                return;
            }
            if (key === 'w') {
                e.preventDefault();
                e.stopPropagation();
                switchToRotationMode();
                return;
            }
            if (key === 'e') {
                e.preventDefault();
                e.stopPropagation();
                switchToScaleMode();
                return;
            }
        }
        
        // 나머지 키들은 카메라 컨트롤러로 전달
        cameraController.onKeyDown(e);
    }, true); // true로 캡처링 단계에서 처리
    
    document.addEventListener('keyup', (e) => cameraController.onKeyUp(e));
    
    document.getElementById('modelFileInput').addEventListener('change', handleFileUpload);
    
    // 드래그 앤 드롭 기능 추가
    setupDragAndDrop();
    
    uiControls.setupEventListeners();
    
    // 기즈모 모드 전환 아이콘 이벤트 리스너 - 수정된 부분
    const transformIcons = document.querySelectorAll('.icon-indicator');
    transformIcons.forEach((icon, index) => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 선택된 모델이 있을 때만 작동
            if (state.selectedModels.size > 0) {
                if (index === 0) {
                    switchToPositionMode();
                } else if (index === 1) {
                    switchToRotationMode();
                } else if (index === 2) {
                    switchToScaleMode();
                }
            }
        });
    });
    
    // 초기 position 모드 아이콘 활성화
    if (transformIcons.length > 0) {
        transformIcons[0].classList.add('active');
    }
    
    window.addEventListener('resize', onWindowResize);
}

function switchToPositionMode() {
    if (transformControls && state.selectedModels.size > 0) {
        transformControls.setMode('position');
        updateIconState(0);
        console.log('Position 모드로 변경됨'); // 디버그용
    }
}

function switchToRotationMode() {
    if (transformControls && state.selectedModels.size > 0) {
        transformControls.setMode('rotation');
        updateIconState(1);
        console.log('Rotation 모드로 변경됨'); // 디버그용
    }
}

function switchToScaleMode() {
    if (transformControls && state.selectedModels.size > 0) {
        transformControls.setMode('scale');
        updateIconState(2);
        console.log('Scale 모드로 변경됨'); // 디버그용
    }
}

function updateIconState(activeIndex) {
    const transformIcons = document.querySelectorAll('.icon-indicator');
    transformIcons.forEach((icon, index) => {
        icon.classList.remove('active');
        if (index === activeIndex) {
            icon.classList.add('active');
        }
    });
}

function handleCanvasClick(event) {
    // 좌클릭만 처리 (우클릭은 이미 카메라 컨트롤러에서 처리됨)
    if (event.button !== 0) return;
    
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, state.camera);
    
    // 기즈모 핸들 체크
    const gizmoIntersects = raycaster.intersectObjects(transformControls.handles, true);
    if (gizmoIntersects.length > 0) {
        return; // 기즈모 클릭 시 아무것도 안함
    }
    
    // 모든 모델 오브젝트 수집
    const modelObjects = [];
    const modelMap = new Map(); // 오브젝트 -> 모델ID 매핑
    
    state.getAllModels().forEach(modelData => {
        modelData.object.traverse((child) => {
            if (child.isMesh) {
                modelObjects.push(child);
                modelMap.set(child, modelData.id);
            }
        });
    });
    
    const modelIntersects = raycaster.intersectObjects(modelObjects, true);
    
    if (modelIntersects.length > 0) {
        // 모델 클릭 시 해당 모델 선택
        const clickedObject = modelIntersects[0].object;
        const modelId = modelMap.get(clickedObject);
        
        const multiSelect = event.shiftKey;
        selectModel(modelId, multiSelect);
    } else {
        // 빈 공간 클릭 시 선택 해제 (Shift 클릭이 아닐 때만)
        if (!event.shiftKey) {
            deselectAllModels();
        }
    }
}

function selectModel(modelId, multiSelect = false) {
    state.selectModel(modelId, multiSelect);
    updateSelectionUI();
}

function deselectAllModels() {
    state.deselectAllModels();
    updateSelectionUI();
}

function updateSelectionUI() {
    const lastSelected = state.getLastSelectedModel();
    
    if (lastSelected && state.selectedModels.size > 0) {
        // 선택된 모델들의 중심점에 기즈모 위치 설정
        const center = state.getSelectionCenter();
        transformControls.position.copy(center);
        
        transformControls.attach(lastSelected.object);
        showTransformPanel();
        uiControls.updateSelectedModelUI(lastSelected);
        
        // 기즈모가 보이는 상태에서 아이콘 활성화
        const transformIcons = document.querySelectorAll('.icon-indicator');
        if (transformIcons.length > 0) {
            // 현재 모드에 따라 아이콘 상태 업데이트
            if (transformControls.mode === 'position') {
                updateIconState(0);
            } else if (transformControls.mode === 'rotation') {
                updateIconState(1);
            } else if (transformControls.mode === 'scale') {
                updateIconState(2);
            }
        }
    } else {
        transformControls.detach();
        hideTransformPanel();
        
        // 모든 아이콘 비활성화
        const transformIcons = document.querySelectorAll('.icon-indicator');
        transformIcons.forEach(icon => icon.classList.remove('active'));
    }
    
    uiControls.updateModelListUI();
}

function showTransformPanel() {
    document.getElementById('transform-panel').style.display = 'block';
}

function hideTransformPanel() {
    document.getElementById('transform-panel').style.display = 'none';
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const ext = file.name.toLowerCase().split('.').pop();
    
    if (ext === 'glb' || ext === 'gltf') {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const loader = new GLBLoader(state);
            const model = await loader.load(e.target.result);
            loadModel(model, file.name);
        };
        reader.readAsArrayBuffer(file);
    } else if (ext === 'obj') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const loader = new OBJLoader(state);
            const model = loader.load(e.target.result);
            loadModel(model, file.name);
        };
        reader.readAsText(file);
    }
    
    // 파일 입력 초기화 (같은 파일 다시 선택 가능)
    event.target.value = '';
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('container');
    const overlay = createDropOverlay();
    
    // 드래그 오버 시 오버레이 표시
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        overlay.style.display = 'flex';
    });
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 컨테이너를 완전히 벗어났을 때만 오버레이 숨김
        if (e.target === dropZone) {
            overlay.style.display = 'none';
        }
    });
    
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        overlay.style.display = 'none';
        
        const files = Array.from(e.dataTransfer.files);
        const modelFiles = files.filter(file => {
            const ext = file.name.toLowerCase().split('.').pop();
            return ext === 'glb' || ext === 'gltf' || ext === 'obj';
        });
        
        if (modelFiles.length === 0) {
            alert('GLB, GLTF 또는 OBJ 파일만 지원됩니다.');
            return;
        }
        
        // 여러 파일 순차 로딩
        for (const file of modelFiles) {
            await processDroppedFile(file);
        }
    });
}

function createDropOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'drop-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(74, 158, 255, 0.9);
        backdrop-filter: blur(10px);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        pointer-events: none;
    `;
    
    const message = document.createElement('div');
    message.style.cssText = `
        color: white;
        font-size: 48px;
        font-weight: bold;
        text-align: center;
        text-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    message.innerHTML = `
        <div style="font-size: 72px; margin-bottom: 20px;">📁</div>
        <div>파일을 놓으세요</div>
        <div style="font-size: 24px; margin-top: 15px; opacity: 0.9;">GLB, GLTF, OBJ 지원</div>
    `;
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    return overlay;
}

async function processDroppedFile(file) {
    return new Promise((resolve, reject) => {
        const ext = file.name.toLowerCase().split('.').pop();
        
        if (ext === 'glb' || ext === 'gltf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const loader = new GLBLoader(state);
                    const model = await loader.load(e.target.result);
                    loadModel(model, file.name);
                    resolve();
                } catch (error) {
                    console.error('모델 로딩 실패:', error);
                    alert(`${file.name} 로딩 실패: ${error.message}`);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        } else if (ext === 'obj') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const loader = new OBJLoader(state);
                    const model = loader.load(e.target.result);
                    loadModel(model, file.name);
                    resolve();
                } catch (error) {
                    console.error('모델 로딩 실패:', error);
                    alert(`${file.name} 로딩 실패: ${error.message}`);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        } else {
            resolve();
        }
    });
}

function loadModel(model, filename) {
    const modelId = state.addModel(model, filename);
    
    // 모델 기본 스케일 적용
    model.scale.set(CONFIG.defaults.modelScale, CONFIG.defaults.modelScale, CONFIG.defaults.modelScale);
    
    // 히스토리에 모델 추가 기록 (선택하기 전에)
    historyManager.onModelAdded(filename);
    
    // 새로 추가된 모델 자동 선택
    selectModel(modelId, false);
    
    uiControls.updateLightDirection();
    uiControls.updateModelListUI();
    
    switchToPositionMode(); // 기본값은 position 모드
}

function deleteSelectedModels() {
    if (state.selectedModels.size > 0) {
        // 삭제할 모델들의 이름 저장 (히스토리용)
        const deletedNames = [];
        state.selectedModels.forEach(modelId => {
            const model = state.models.get(modelId);
            if (model) {
                deletedNames.push(model.filename);
            }
        });
        
        state.deleteSelectedModels();
        updateSelectionUI();
        uiControls.updateModelListUI();
        
        // 히스토리에 삭제 기록
        const names = deletedNames.length > 1 ? 
            `${deletedNames.length}개 모델` : 
            deletedNames[0];
        historyManager.onModelDeleted(names);
    }
}

// 호환성을 위한 단일 삭제 함수
function deleteSelectedModel() {
    deleteSelectedModels();
}

function takeScreenshot() {
    const originalBg = state.scene.background;
    state.scene.background = null;
    
    // 기즈모 숨김
    const wasVisible = transformControls.visible;
    transformControls.visible = false;
    
    renderManager.render();
    
    const dataURL = state.renderer.domElement.toDataURL('image/png', 1.0);
    
    state.scene.background = originalBg;
    transformControls.visible = wasVisible;
    
    const link = document.createElement('a');
    link.download = `webtoon-3d-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}

function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    renderManager.onResize();
}

function animate() {
    requestAnimationFrame(animate);
    cameraController.handleMovement();
    transformControls.update();
    renderManager.render();
}

// Global functions
window.toggleControls = () => uiControls.toggleControls();
window.toggleWebtoonMode = () => uiControls.toggleWebtoonMode();
window.toggleOutline = () => uiControls.toggleOutline();
window.toggleShadows = () => uiControls.toggleShadows();
window.resetCamera = () => cameraController.reset();
window.resetLightDirection = () => uiControls.resetLightDirection();
window.updateOutlineThickness = () => uiControls.updateOutlineThickness();
window.toggleModelBilateralFilter = () => uiControls.toggleModelBilateralFilter();
window.updateModelSigmaColor = () => uiControls.updateModelSigmaColor();
window.updateModelScale = () => uiControls.updateModelScale();
window.updateBrightness = () => uiControls.updateBrightness();
window.takeScreenshot = takeScreenshot;
window.deleteSelectedModel = deleteSelectedModel;
window.selectModel = selectModel;

// Global objects for UI access
window.state = state;
window.transformControls = transformControls;
window.uiControls = uiControls;
window.historyManager = historyManager;

document.addEventListener('DOMContentLoaded', init);