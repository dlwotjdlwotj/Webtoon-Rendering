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
        this.models = new Map();
        this.selectedModels = new Set();
        this.lastSelectedModel = null;
        this.modelCounter = 0;
        this.webtoonMode = true;
        this.outlineEnabled = true;
        this.shadowsEnabled = true;
        this.globalBrightness = CONFIG.defaults.brightness;
        this.lightRotation = { ...CONFIG.defaults.lightRotation };
        // 초기 빛 방향 계산
        const x = this.lightRotation.x * Math.PI / 180;
        const y = this.lightRotation.y * Math.PI / 180;
        const dirX = Math.sin(y) * Math.cos(x);
        const dirY = -Math.sin(x);
        const dirZ = Math.cos(y) * Math.cos(x);
        this.lightDirection = new THREE.Vector3(dirX, dirY, dirZ);
    }

    addModel(model, filename) {
        const modelId = `model_${this.modelCounter++}`;
        const modelData = {
            id: modelId,
            object: model,
            filename: filename || `Model ${this.modelCounter}`,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: CONFIG.defaults.modelScale, y: CONFIG.defaults.modelScale, z: CONFIG.defaults.modelScale }
        };
        
        this.models.set(modelId, modelData);
        this.scene.add(model);
        
        if (this.models.size === 1) {
            this.selectModel(modelId, false);
        }
        
        return modelId;
    }

    removeModel(modelId) {
        const modelData = this.models.get(modelId);
        if (modelData) {
            this.scene.remove(modelData.object);
            this.models.delete(modelId);
            this.selectedModels.delete(modelId);
            
            if (this.lastSelectedModel === modelId) {
                const remaining = Array.from(this.selectedModels);
                this.lastSelectedModel = remaining.length > 0 ? remaining[0] : null;
            }
        }
    }

    selectModel(modelId, multiSelect) {
        if (multiSelect === undefined) {
            multiSelect = false;
        }
        
        if (!multiSelect) {
            this.selectedModels.clear();
        }
        
        if (this.selectedModels.has(modelId)) {
            if (multiSelect) {
                this.selectedModels.delete(modelId);
                if (this.lastSelectedModel === modelId) {
                    const remaining = Array.from(this.selectedModels);
                    this.lastSelectedModel = remaining.length > 0 ? remaining[0] : null;
                }
            }
        } else {
            this.selectedModels.add(modelId);
            this.lastSelectedModel = modelId;
        }
    }

    selectAllModels() {
        this.selectedModels.clear();
        const self = this;
        this.models.forEach(function(modelData, modelId) {
            self.selectedModels.add(modelId);
        });
        
        if (this.selectedModels.size > 0) {
            this.lastSelectedModel = Array.from(this.selectedModels)[0];
        }
    }

    deselectAllModels() {
        this.selectedModels.clear();
        this.lastSelectedModel = null;
    }

    getSelectedModels() {
        const result = [];
        const self = this;
        this.selectedModels.forEach(function(id) {
            const model = self.models.get(id);
            if (model) {
                result.push(model);
            }
        });
        return result;
    }

    getLastSelectedModel() {
        if (this.lastSelectedModel && this.models.has(this.lastSelectedModel)) {
            return this.models.get(this.lastSelectedModel);
        }
        return null;
    }

    deleteSelectedModels() {
        const toDelete = Array.from(this.selectedModels);
        for (let i = 0; i < toDelete.length; i++) {
            this.removeModel(toDelete[i]);
        }
        this.selectedModels.clear();
        this.lastSelectedModel = null;
    }

    getSelectionCenter() {
        const selectedModels = this.getSelectedModels();
        if (selectedModels.length === 0) return new THREE.Vector3(0, 0, 0);
        
        const center = new THREE.Vector3();
        for (let i = 0; i < selectedModels.length; i++) {
            center.add(selectedModels[i].object.position);
        }
        center.divideScalar(selectedModels.length);
        return center;
    }

    moveSelectedModels(deltaPosition) {
        const selectedModels = this.getSelectedModels();
        for (let i = 0; i < selectedModels.length; i++) {
            const modelData = selectedModels[i];
            const newPosition = {
                x: modelData.position.x + deltaPosition.x,
                y: modelData.position.y + deltaPosition.y,
                z: modelData.position.z + deltaPosition.z
            };
            this.updateModelPosition(modelData.id, newPosition);
        }
    }

    rotateSelectedModels(deltaRotation, pivotPoint) {
        const selectedModels = this.getSelectedModels();
        
        for (let i = 0; i < selectedModels.length; i++) {
            const modelData = selectedModels[i];
            const object = modelData.object;
            
            const currentWorldPos = new THREE.Vector3();
            object.getWorldPosition(currentWorldPos);
            
            const relativePosition = new THREE.Vector3();
            relativePosition.subVectors(currentWorldPos, pivotPoint);
            
            const rotationMatrix = new THREE.Matrix4();
            const euler = new THREE.Euler(deltaRotation.x, deltaRotation.y, deltaRotation.z, 'XYZ');
            rotationMatrix.makeRotationFromEuler(euler);
            
            const newRelativePosition = relativePosition.clone();
            newRelativePosition.applyMatrix4(rotationMatrix);
            
            const newWorldPosition = new THREE.Vector3();
            newWorldPosition.addVectors(pivotPoint, newRelativePosition);
            
            this.updateModelPosition(modelData.id, {
                x: newWorldPosition.x,
                y: newWorldPosition.y,
                z: newWorldPosition.z
            });
            
            const currentRotation = new THREE.Euler().setFromQuaternion(object.quaternion);
            const newRotation = new THREE.Euler(
                currentRotation.x + deltaRotation.x,
                currentRotation.y + deltaRotation.y,
                currentRotation.z + deltaRotation.z,
                'XYZ'
            );
            
            object.setRotationFromEuler(newRotation);
            
            modelData.rotation.x = newRotation.x * 180 / Math.PI;
            modelData.rotation.y = newRotation.y * 180 / Math.PI;
            modelData.rotation.z = newRotation.z * 180 / Math.PI;
        }
    }

    updateModelPosition(modelId, position) {
        const modelData = this.models.get(modelId);
        if (modelData) {
            modelData.position = { ...position };
            modelData.object.position.set(position.x, position.y, position.z);
        }
    }

    updateModelRotation(modelId, rotation) {
        const modelData = this.models.get(modelId);
        if (modelData) {
            modelData.rotation = { ...rotation };
            modelData.object.rotation.set(
                rotation.x * Math.PI / 180,
                rotation.y * Math.PI / 180,
                rotation.z * Math.PI / 180
            );
        }
    }

    updateModelScale(modelId, scale) {
        const modelData = this.models.get(modelId);
        if (modelData) {
            if (typeof scale === 'number') {
                modelData.scale = { x: scale, y: scale, z: scale };
                modelData.object.scale.set(scale, scale, scale);
            } else {
                modelData.scale = { ...scale };
                modelData.object.scale.set(scale.x, scale.y, scale.z);
            }
        }
    }

    getAllModels() {
        return Array.from(this.models.values());
    }
}