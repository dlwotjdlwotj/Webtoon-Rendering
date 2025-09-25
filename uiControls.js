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
        document.getElementById('modelPosX').addEventListener('input', () => this.updateModelPositionFromUI());
        document.getElementById('modelPosY').addEventListener('input', () => this.updateModelPositionFromUI());
        document.getElementById('modelPosZ').addEventListener('input', () => this.updateModelPositionFromUI());

        // 오브젝트 회전 입력 리스너
        document.getElementById('modelRotX').addEventListener('input', () => this.updateModelRotationFromUI());
        document.getElementById('modelRotY').addEventListener('input', () => this.updateModelRotationFromUI());
        document.getElementById('modelRotZ').addEventListener('input', () => this.updateModelRotationFromUI());
    }

    updateModelPositionFromUI() {
        if (!this.state.lastSelectedModel) return;
        
        const position = {
            x: parseFloat(document.getElementById('modelPosX').value) || 0,
            y: parseFloat(document.getElementById('modelPosY').value) || 0,
            z: parseFloat(document.getElementById('modelPosZ').value) || 0
        };
        
        this.state.updateModelPosition(this.state.lastSelectedModel, position);
    }

    updateModelPositionUI(position) {
        document.getElementById('modelPosX').value = position.x.toFixed(1);
        document.getElementById('modelPosY').value = position.y.toFixed(1);
        document.getElementById('modelPosZ').value = position.z.toFixed(1);
    }
    
    updateModelRotationFromUI() {
        if (!this.state.lastSelectedModel) return;
        
        const rotation = {
            x: parseFloat(document.getElementById('modelRotX').value) || 0,
            y: parseFloat(document.getElementById('modelRotY').value) || 0,
            z: parseFloat(document.getElementById('modelRotZ').value) || 0
        };
        
        this.state.updateModelRotation(this.state.lastSelectedModel, rotation);
    }

    updateModelRotationUI(rotation) {
        document.getElementById('modelRotX').value = rotation.x.toFixed(0);
        document.getElementById('modelRotY').value = rotation.y.toFixed(0);
        document.getElementById('modelRotZ').value = rotation.z.toFixed(0);
    }

    updateSelectedModelUI(modelData) {
        document.getElementById('selectedModelName').textContent = modelData.filename;
        this.updateModelPositionUI(modelData.position);
        this.updateModelRotationUI(modelData.rotation);
        
        // 스케일 슬라이더 업데이트
        document.getElementById('modelScale').value = modelData.scale;
        document.getElementById('modelScaleValue').textContent = modelData.scale.toFixed(1);
    }

    updateModelScale() {
        if (!this.state.lastSelectedModel) return;
        
        const scale = parseFloat(document.getElementById('modelScale').value);
        document.getElementById('modelScaleValue').textContent = scale.toFixed(1);
        
        this.state.updateModelScale(this.state.lastSelectedModel, scale);
    }

    updateBrightness() {
        this.state.globalBrightness = parseFloat(document.getElementById('brightness').value);
        document.getElementById('brightnessValue').textContent = this.state.globalBrightness.toFixed(1);
        
        // 모든 모델에 적용
        const allModels = this.state.getAllModels();
        for (let i = 0; i < allModels.length; i++) {
            updateAllMaterialUniforms(allModels[i].object, 'brightness', this.state.globalBrightness);
        }
    }

    updateOutlineThickness() {
        const value = parseFloat(document.getElementById('outlineThickness').value);
        document.getElementById('outlineValue').textContent = value.toFixed(1);
        if (this.renderManager.outlineMaterial && this.renderManager.outlineMaterial.uniforms) {
            this.renderManager.outlineMaterial.uniforms.outlineThickness.value = value;
        }
    }

    updateDepthSensitivity() {
        const value = parseFloat(document.getElementById('depthSensitivity').value);
        document.getElementById('depthSensitivityValue').textContent = value.toFixed(1);
        if (this.renderManager.outlineMaterial && this.renderManager.outlineMaterial.uniforms) {
            this.renderManager.outlineMaterial.uniforms.depthSensitivity.value = value;
        }
    }

    updateShadowIntensity() {
        const value = parseFloat(document.getElementById('shadowIntensity').value);
        document.getElementById('shadowIntensityValue').textContent = value.toFixed(1);
        
        // 모든 모델에 적용
        const allModels = this.state.getAllModels();
        for (let i = 0; i < allModels.length; i++) {
            updateAllMaterialUniforms(allModels[i].object, 'shadowIntensity', value);
        }
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
        
        // 모든 모델에 적용
        const allModels = this.state.getAllModels();
        for (let i = 0; i < allModels.length; i++) {
            updateAllMaterialUniforms(allModels[i].object, 'lightDirection', this.state.lightDirection);
        }
    }

    updateMoveSpeed() {
        const speed = parseFloat(document.getElementById('moveSpeedSlider').value);
        document.getElementById('moveSpeedValue').textContent = speed.toFixed(2);
        this.cameraController.setMoveSpeed(speed);
    }

    toggleWebtoonMode() {
        this.state.webtoonMode = !this.state.webtoonMode;
        document.getElementById('webtoonBtn').textContent = `웹툰 모드: ${this.state.webtoonMode ? 'ON' : 'OFF'}`;
        
        // 모든 모델에 적용
        const allModels = this.state.getAllModels();
        for (let i = 0; i < allModels.length; i++) {
            const model = allModels[i].object;
            model.traverse((child) => {
                if (child.isMesh && child.userData.webtoonMaterial && child.userData.standardMaterial) {
                    child.material = this.state.webtoonMode ? child.userData.webtoonMaterial : child.userData.standardMaterial;
                }
            });
        }
    }

    toggleShadows() {
        this.state.shadowsEnabled = !this.state.shadowsEnabled;
        document.getElementById('shadowBtn').textContent = `그림자: ${this.state.shadowsEnabled ? 'ON' : 'OFF'}`;
        
        // 모든 모델에 적용
        const allModels = this.state.getAllModels();
        for (let i = 0; i < allModels.length; i++) {
            updateAllMaterialUniforms(allModels[i].object, 'shadowsEnabled', this.state.shadowsEnabled);
        }
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

    // 모델 목록 UI 업데이트
    updateModelListUI() {
        const modelListElement = document.getElementById('modelList');
        modelListElement.innerHTML = '';
        
        const models = this.state.getAllModels();
        
        if (models.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = '모델이 없습니다';
            emptyMessage.style.color = '#888';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.fontSize = '12px';
            modelListElement.appendChild(emptyMessage);
            return;
        }
        
        const self = this;
        for (let i = 0; i < models.length; i++) {
            const modelData = models[i];
            const modelItem = document.createElement('div');
            modelItem.className = 'model-item';
            
            // 선택된 모델들 표시
            if (this.state.selectedModels.has(modelData.id)) {
                modelItem.classList.add('selected');
            }
            
            // 마지막 선택된 모델 (transform control 대상) 특별 표시
            if (this.state.lastSelectedModel === modelData.id) {
                modelItem.classList.add('last-selected');
            }
            
            modelItem.innerHTML = `
                <div class="model-name" title="${modelData.filename}">${modelData.filename}</div>
                <div class="model-actions">
                    <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteModelById('${modelData.id}')">×</button>
                </div>
            `;
            
            modelItem.addEventListener('click', function(e) {
                const multiSelect = e.shiftKey;
                window.selectModel(modelData.id, multiSelect);
            });
            
            modelListElement.appendChild(modelItem);
        }
    }
}

// 전역 함수로 모델 삭제 (HTML onclick에서 사용)
window.deleteModelById = function(modelId) {
    if (window.state && window.state.models.has(modelId)) {
        // 모델 삭제
        window.state.removeModel(modelId);
        
        // 선택된 모델이 삭제된 경우 UI 업데이트
        if (window.state.selectedModels.has(modelId)) {
            window.state.selectedModels.delete(modelId);
            
            // 마지막 선택된 모델이 삭제된 경우 다른 모델로 변경
            if (window.state.lastSelectedModel === modelId) {
                const remaining = Array.from(window.state.selectedModels);
                window.state.lastSelectedModel = remaining.length > 0 ? remaining[0] : null;
                
                // Transform control 업데이트
                if (window.state.lastSelectedModel) {
                    const modelData = window.state.models.get(window.state.lastSelectedModel);
                    if (modelData && window.transformControls) {
                        window.transformControls.attach(modelData.object);
                    }
                } else {
                    document.getElementById('transform-panel').style.display = 'none';
                    if (window.transformControls) {
                        window.transformControls.detach();
                    }
                }
            }
        }
        
        // 모델 목록 UI 즉시 업데이트
        if (window.uiControls) {
            window.uiControls.updateModelListUI();
            
            // 선택된 모델이 있으면 UI 업데이트
            if (window.state.lastSelectedModel) {
                const lastSelected = window.state.getLastSelectedModel();
                if (lastSelected) {
                    window.uiControls.updateSelectedModelUI(lastSelected);
                }
            }
        }
    }
};