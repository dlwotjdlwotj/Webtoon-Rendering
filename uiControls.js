import { updateAllMaterialUniforms } from './materials.js';

export class UIControls {
    constructor(state, cameraController, renderManager, historyManager) {
        this.state = state;
        this.cameraController = cameraController;
        this.renderManager = renderManager;
        this.historyManager = historyManager;
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

        // 개별 스케일 입력 리스너
        document.getElementById('modelScaleX').addEventListener('input', () => this.updateModelScaleFromUI());
        document.getElementById('modelScaleY').addEventListener('input', () => this.updateModelScaleFromUI());
        document.getElementById('modelScaleZ').addEventListener('input', () => this.updateModelScaleFromUI());
        
        // Bilateral filter 입력 리스너
        document.getElementById('modelSigmaColor').addEventListener('input', () => this.updateModelSigmaColor());
    }

    updateModelPositionFromUI() {
        if (!this.state.lastSelectedModel) return;
        
        const position = {
            x: parseFloat(document.getElementById('modelPosX').value) || 0,
            y: parseFloat(document.getElementById('modelPosY').value) || 0,
            z: parseFloat(document.getElementById('modelPosZ').value) || 0
        };
        
        this.state.updateModelPosition(this.state.lastSelectedModel, position);
        this.historyManager.onModelMoved();
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
        this.historyManager.onModelRotated();
    }

    updateModelRotationUI(rotation) {
        document.getElementById('modelRotX').value = rotation.x.toFixed(0);
        document.getElementById('modelRotY').value = rotation.y.toFixed(0);
        document.getElementById('modelRotZ').value = rotation.z.toFixed(0);
    }

    updateModelScaleFromUI() {
        if (!this.state.lastSelectedModel) return;
        
        const scale = {
            x: parseFloat(document.getElementById('modelScaleX').value) || 1.0,
            y: parseFloat(document.getElementById('modelScaleY').value) || 1.0,
            z: parseFloat(document.getElementById('modelScaleZ').value) || 1.0
        };
        
        this.state.updateModelScale(this.state.lastSelectedModel, scale);
        this.historyManager.onModelScaled();
        
        // 기존 스케일 컨트롤과 동기화 (평균값 사용)
        const avgScale = (scale.x + scale.y + scale.z) / 3;
        document.getElementById('modelScale').value = avgScale;
        document.getElementById('modelScaleValue').textContent = avgScale.toFixed(1);
    }

    updateModelScaleUI(scale) {
        // scale이 숫자인 경우 (기존 호환성)
        if (typeof scale === 'number') {
            document.getElementById('modelScaleX').value = scale.toFixed(1);
            document.getElementById('modelScaleY').value = scale.toFixed(1);
            document.getElementById('modelScaleZ').value = scale.toFixed(1);
        } else {
            // scale이 객체인 경우
            document.getElementById('modelScaleX').value = scale.x.toFixed(1);
            document.getElementById('modelScaleY').value = scale.y.toFixed(1);
            document.getElementById('modelScaleZ').value = scale.z.toFixed(1);
        }
    }

    updateSelectedModelUI(modelData) {
        document.getElementById('selectedModelName').textContent = modelData.filename;
        this.updateModelPositionUI(modelData.position);
        this.updateModelRotationUI(modelData.rotation);
        
        // 스케일 UI 업데이트
        this.updateModelScaleUI(modelData.scale);
        
        // 기존 스케일 슬라이더 업데이트
        const avgScale = typeof modelData.scale === 'number' ? 
            modelData.scale : 
            (modelData.scale.x + modelData.scale.y + modelData.scale.z) / 3;
            
        document.getElementById('modelScale').value = avgScale;
        document.getElementById('modelScaleValue').textContent = avgScale.toFixed(1);
        
        // Bilateral filter UI 업데이트
        const bilateralBtn = document.getElementById('modelBilateralBtn');
        if (bilateralBtn) {
            bilateralBtn.textContent = '텍스처 단순화';
            bilateralBtn.style.background = modelData.bilateralFilterEnabled ? '#4a9eff' : '#666';
        }
        
        const sigmaColorSlider = document.getElementById('modelSigmaColor');
        if (sigmaColorSlider) {
            sigmaColorSlider.value = modelData.sigmaColor || 0.2;
        }
    }

    updateModelScale() {
        if (!this.state.lastSelectedModel) return;
        
        const scale = parseFloat(document.getElementById('modelScale').value);
        document.getElementById('modelScaleValue').textContent = scale.toFixed(1);
        
        // 기존 방식으로 균등 스케일 적용
        this.state.updateModelScale(this.state.lastSelectedModel, scale);
        this.historyManager.onModelScaled();
        
        // Transform Panel의 스케일 UI도 동기화
        document.getElementById('modelScaleX').value = scale;
        document.getElementById('modelScaleY').value = scale;
        document.getElementById('modelScaleZ').value = scale;
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
        const btn = document.getElementById('webtoonBtn');
        btn.textContent = '웹툰 모드';
        btn.style.background = this.state.webtoonMode ? '#4a9eff' : '#666';
        
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
        const btn = document.getElementById('shadowBtn');
        btn.textContent = '그림자';
        btn.style.background = this.state.shadowsEnabled ? '#4a9eff' : '#666';
        
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

    toggleModelBilateralFilter() {
        const modelData = this.state.getLastSelectedModel();
        if (!modelData) return;
        
        modelData.bilateralFilterEnabled = !modelData.bilateralFilterEnabled;
        
        const btn = document.getElementById('modelBilateralBtn');
        if (btn) {
            btn.textContent = '텍스처 단순화';
            btn.style.background = modelData.bilateralFilterEnabled ? '#4a9eff' : '#666';
        }
        
        // 해당 모델의 material uniform 업데이트
        updateAllMaterialUniforms(modelData.object, 'celShadingEnabled', modelData.bilateralFilterEnabled);
    }

    updateModelSigmaColor() {
        const modelData = this.state.getLastSelectedModel();
        if (!modelData) return;
        
        const slider = document.getElementById('modelSigmaColor');
        
        if (slider) {
            const value = parseFloat(slider.value);
            modelData.sigmaColor = value;
            
            // 해당 모델의 material uniform 업데이트
            updateAllMaterialUniforms(modelData.object, 'celLevels', value);
        }
    }
}

// 전역 함수로 모델 삭제 (HTML onclick에서 사용)
window.deleteModelById = function(modelId) {
    if (window.state && window.state.models.has(modelId)) {
        // 삭제할 모델의 이름 저장
        const modelData = window.state.models.get(modelId);
        const modelName = modelData ? modelData.filename : '알 수 없는 모델';
        
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
                    const remainingModelData = window.state.models.get(window.state.lastSelectedModel);
                    if (remainingModelData && window.transformControls) {
                        window.transformControls.attach(remainingModelData.object);
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
        
        // 히스토리에 삭제 기록
        if (window.historyManager) {
            window.historyManager.onModelDeleted(modelName);
        }
    }
};