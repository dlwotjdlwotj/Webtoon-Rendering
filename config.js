export const CONFIG = {
    camera: {
        fov: 75,
        near: 0.05,
        far: 200,
        initialDistance: 8
    },
    renderer: {
        backgroundColor: 0xf5f5f5,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputEncoding: THREE.sRGBEncoding
    },
    defaults: {
        modelScale: 1.0,
        brightness: 1.8,
        outlineThickness: 0.5,
        depthSensitivity: 5.0,
        shadowIntensity: 0.3,
        lightRotation: { x: 30, y: 45, z: 0 },
        moveSpeed: 0.1
    }
};

export class AppState {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentModel = null;
        this.currentModelGroup = null;
        this.webtoonMode = true;
        this.shadowsEnabled = true;
        this.globalBrightness = CONFIG.defaults.brightness;
        this.lightDirection = new THREE.Vector3();
        this.modelScale = CONFIG.defaults.modelScale;
        this.lightRotation = { ...CONFIG.defaults.lightRotation };
        this.modelPosition = { x: 0, y: 0, z: 0 };
        this.modelRotation = { x: 0, y: 0, z: 0 };
    }
}