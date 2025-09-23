import { updateAllMaterialUniforms } from './materials.js';

export class UIControls {
    constructor(state, cameraController, renderManager) {
        this.state = state;
        this.cameraController = cameraController;
        this.renderManager = renderManager;
    }

    setupEventListeners() {
        document.getElementById('shadowIntensity').addEventListener('input', () => this.updateShadowIntensity());
        document.getElementById('lightRotX').addEventListener('input', () => this.updateLightRotation());
        document.getElementById('lightRotY').addEventListener('input', () => this.updateLightRotation());
        document.getElementById('lightRotZ').addEventListener('input', () => this.updateLightRotation());
        document.getElementById('moveSpeedSlider').addEventListener('input', () => this.updateMoveSpeed());
        document.getElementById('brightness').addEventListener('input', () => this.updateBrightness());
        
        // 오브젝트 위치 입력 리스너
        document.getElementById('modelPosX').addEventListener('input', () => this.updateModelPosition());
        document.getElementById('modelPosY').addEventListener('input', () => this.updateModelPosition());
        document.getElementById('modelPosZ').addEventListener('input', () => this.updateModelPosition());
    }

    updateModelPosition() {
        this.state.modelPosition.x = parseFloat(document.getElementById('modelPosX').value) || 0;
        this.state.modelPosition.y = parseFloat(document.getElementById('modelPosY').value) || 0;
        this.state.modelPosition.z = parseFloat(document.getElementById('modelPosZ').value) || 0;
        
        this.updateModelPositionUI(this.state.modelPosition);
        
        if (this.state.currentModel) {
            this.state.currentModel.position.set(
                this.state.modelPosition.x,
                this.state.modelPosition.y,
                this.state.modelPosition.z
            );
        }
    }

    updateModelPositionUI(position) {
        document.getElementById('modelPosX').value = position.x.toFixed(1);
        document.getElementById('modelPosY').value = position.y.toFixed(1);
        document.getElementById('modelPosZ').value = position.z.toFixed(1);
        
        document.getElementById('modelPosXValue').textContent = position.x.toFixed(1);
        document.getElementById('modelPosYValue').textContent = position.y.toFixed(1);
        document.getElementById('modelPosZValue').textContent = position.z.toFixed(1);
    }

    updateModelScale() {
        this.state.modelScale = parseFloat(document.getElementById('modelScale').value);
        document.getElementById('modelScaleValue').textContent = this.state.modelScale.toFixed(1);
        if (this.state.currentModel) {
            this.state.currentModel.scale.set(this.state.modelScale, this.state.modelScale, this.state.modelScale);
        }
    }

    updateBrightness() {
        this.state.globalBrightness = parseFloat(document.getElementById('brightness').value);
        document.getElementById('brightnessValue').textContent = this.state.globalBrightness.toFixed(1);
        updateAllMaterialUniforms(this.state.currentModel, 'brightness', this.state.globalBrightness);
    }

    updateOutlineThickness() {
        const value = parseFloat(document.getElementById('outlineThickness').value);
        document.getElementById('outlineValue').textContent = value.toFixed(1);
        if (this.renderManager.outlineMaterial?.uniforms) {
            this.renderManager.outlineMaterial.uniforms.outlineThickness.value = value;
        }
    }

    updateDepthSensitivity() {
        const value = parseFloat(document.getElementById('depthSensitivity').value);
        document.getElementById('depthSensitivityValue').textContent = value.toFixed(1);
        if (this.renderManager.outlineMaterial?.uniforms) {
            this.renderManager.outlineMaterial.uniforms.depthSensitivity.value = value;
        }
    }

    updateShadowIntensity() {
        const value = parseFloat(document.getElementById('shadowIntensity').value);
        document.getElementById('shadowIntensityValue').textContent = value.toFixed(1);
        updateAllMaterialUniforms(this.state.currentModel, 'shadowIntensity', value);
    }

    updateLightRotation() {
        this.state.lightRotation.x = parseFloat(document.getElementById('lightRotX').value);
        this.state.lightRotation.y = parseFloat(document.getElementById('lightRotY').value);
        this.state.lightRotation.z = parseFloat(document.getElementById('lightRotZ').value);
        
        document.getElementById('lightRotXValue').textContent = this.state.lightRotation.x;
        document.getElementById('lightRotYValue').textContent = this.state.lightRotation.y;
        document.getElementById('lightRotZValue').textContent = this.state.lightRotation.z;
        
        this.updateLightDirection();
    }

    updateLightDirection() {
        const x = this.state.lightRotation.x * Math.PI / 180;
        const y = this.state.lightRotation.y * Math.PI / 180;
        
        const dirX = Math.sin(y) * Math.cos(x);
        const dirY = -Math.sin(x);
        const dirZ = Math.cos(y) * Math.cos(x);
        
        this.state.lightDirection.set(dirX, dirY, dirZ);
        updateAllMaterialUniforms(this.state.currentModel, 'lightDirection', this.state.lightDirection);
    }

    updateMoveSpeed() {
        const speed = parseFloat(document.getElementById('moveSpeedSlider').value);
        document.getElementById('moveSpeedValue').textContent = speed.toFixed(2);
        this.cameraController.setMoveSpeed(speed);
    }

    toggleWebtoonMode() {
        this.state.webtoonMode = !this.state.webtoonMode;
        document.getElementById('webtoonBtn').textContent = `웹툰 모드: ${this.state.webtoonMode ? 'ON' : 'OFF'}`;
        
        if (this.state.currentModel) {
            this.state.currentModel.traverse((child) => {
                if (child.isMesh && child.userData.webtoonMaterial && child.userData.standardMaterial) {
                    child.material = this.state.webtoonMode ? child.userData.webtoonMaterial : child.userData.standardMaterial;
                }
            });
        }
    }

    toggleShadows() {
        this.state.shadowsEnabled = !this.state.shadowsEnabled;
        document.getElementById('shadowBtn').textContent = `그림자: ${this.state.shadowsEnabled ? 'ON' : 'OFF'}`;
        updateAllMaterialUniforms(this.state.currentModel, 'shadowsEnabled', this.state.shadowsEnabled);
    }

    toggleControls() {
        const controls = document.getElementById('controls');
        controls.classList.toggle('collapsed');
        document.getElementById('toggle-btn').textContent = controls.classList.contains('collapsed') ? '▶' : '◀';
    }

    resetLightDirection() {
        this.state.lightRotation = { x: 30, y: 45, z: 0 };
        document.getElementById('lightRotX').value = 30;
        document.getElementById('lightRotY').value = 45;
        document.getElementById('lightRotZ').value = 0;
        this.updateLightRotation();
    }
}