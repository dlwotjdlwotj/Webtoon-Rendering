import { CONFIG, AppState } from './config.js';
import { RenderManager } from './renderer.js';
import { CameraController } from './camera.js';
import { GLBLoader } from './loaders/glbLoader.js';
import { OBJLoader } from './loaders/objLoader.js';
import { UIControls } from './uiControls.js';
import { TransformControls } from './transformControls.js';

const state = new AppState();
let renderManager, cameraController, uiControls, transformControls;

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
    uiControls = new UIControls(state, cameraController, renderManager);
    
    transformControls = new TransformControls(state.camera, state.renderer.domElement);
    state.scene.add(transformControls);
    
    transformControls.onPositionChange = (position) => {
        state.modelPosition = {
            x: position.x,
            y: position.y,
            z: position.z
        };
        uiControls.updateModelPositionUI(state.modelPosition);
    };
    
    setupLighting();
    setupEventListeners();
    
    cameraController.updatePosition();
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
    
    canvas.addEventListener('mousedown', (e) => {
        cameraController.onMouseDown(e);
        handleCanvasClick(e);
    });
    canvas.addEventListener('mousemove', (e) => cameraController.onMouseMove(e));
    canvas.addEventListener('mouseup', () => cameraController.onMouseUp());
    canvas.addEventListener('wheel', (e) => cameraController.onMouseWheel(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    document.addEventListener('keydown', (e) => cameraController.onKeyDown(e));
    document.addEventListener('keyup', (e) => cameraController.onKeyUp(e));
    
    document.getElementById('modelFileInput').addEventListener('change', handleFileUpload);
    
    uiControls.setupEventListeners();
    
    window.addEventListener('resize', onWindowResize);
}

function handleCanvasClick(event) {
    if (!state.currentModel) return;
    
    if (event.button === 2) return; // 우클릭 기즈모 유지
    
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
    
    // 모델 클릭 체크
    const modelObjects = [];
    state.currentModel.traverse((child) => {
        if (child.isMesh) {
            modelObjects.push(child);
        }
    });
    
    const modelIntersects = raycaster.intersectObjects(modelObjects, true);
    
    if (modelIntersects.length > 0) {
        // 모델 클릭 시 기즈모 표시
        transformControls.attach(state.currentModel);
    } else {
        // 빈 공간 클릭 시 기즈모 숨김
        transformControls.detach();
    }
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
            loadModel(model);
        };
        reader.readAsArrayBuffer(file);
    } else if (ext === 'obj') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const loader = new OBJLoader(state);
            const model = loader.load(e.target.result);
            loadModel(model);
        };
        reader.readAsText(file);
    }
}

function loadModel(model) {
    if (state.currentModel) {
        state.scene.remove(state.currentModel);
    }
    state.currentModel = model;
    state.scene.add(state.currentModel);
    
    state.modelPosition = {
        x: model.position.x,
        y: model.position.y,
        z: model.position.z
    };
    
    state.currentModel.scale.set(state.modelScale, state.modelScale, state.modelScale);
    
    uiControls.updateModelPositionUI(state.modelPosition);
    uiControls.updateLightDirection();
    
    // 기즈모 표시
    transformControls.attach(state.currentModel);
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
window.toggleShadows = () => uiControls.toggleShadows();
window.resetCamera = () => cameraController.reset();
window.resetLightDirection = () => uiControls.resetLightDirection();
window.updateOutlineThickness = () => uiControls.updateOutlineThickness();
window.updateDepthSensitivity = () => uiControls.updateDepthSensitivity();
window.updateModelScale = () => uiControls.updateModelScale();
window.updateBrightness = () => uiControls.updateBrightness();
window.takeScreenshot = takeScreenshot;

document.addEventListener('DOMContentLoaded', init);