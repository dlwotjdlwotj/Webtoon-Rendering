export class HistoryManager {
    constructor(state) {
        this.state = state;
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50;
        
        // 디바운스를 위한 타이머들 (작업별로 분리)
        this.debounceTimers = new Map();
        this.debounceDelay = 300; // 300ms
    }

    // 현재 상태 스냅샷 생성
    createSnapshot() {
        const models = new Map();
        
        this.state.models.forEach((modelData, modelId) => {
            models.set(modelId, {
                id: modelData.id,
                filename: modelData.filename,
                position: { ...modelData.position },
                rotation: { ...modelData.rotation },
                scale: typeof modelData.scale === 'number' ? 
                    modelData.scale : 
                    { ...modelData.scale }
            });
        });
        
        return {
            models: models,
            timestamp: Date.now()
        };
    }

    // 스냅샷을 현재 상태에 적용
    applySnapshot(snapshot) {
        // 기존 모델들 제거 (3D 씬에서만)
        this.state.models.forEach((modelData) => {
            this.state.scene.remove(modelData.object);
        });
        
        // 새로운 상태 적용
        const newModels = new Map();
        snapshot.models.forEach((modelData, modelId) => {
            const existingModel = this.state.models.get(modelId);
            if (existingModel) {
                // 기존 모델 업데이트
                existingModel.position = { ...modelData.position };
                existingModel.rotation = { ...modelData.rotation };
                existingModel.scale = typeof modelData.scale === 'number' ? 
                    modelData.scale : 
                    { ...modelData.scale };
                
                // 3D 오브젝트 위치/회전/스케일 업데이트
                existingModel.object.position.set(
                    modelData.position.x,
                    modelData.position.y,
                    modelData.position.z
                );
                
                existingModel.object.rotation.set(
                    modelData.rotation.x * Math.PI / 180,
                    modelData.rotation.y * Math.PI / 180,
                    modelData.rotation.z * Math.PI / 180
                );
                
                if (typeof modelData.scale === 'number') {
                    existingModel.object.scale.set(modelData.scale, modelData.scale, modelData.scale);
                } else {
                    existingModel.object.scale.set(modelData.scale.x, modelData.scale.y, modelData.scale.z);
                }
                
                newModels.set(modelId, existingModel);
                this.state.scene.add(existingModel.object);
            }
        });
        
        // 상태 업데이트 (선택 상태는 복원하지 않음)
        this.state.models = newModels;
        
        // 선택 상태 초기화
        this.state.selectedModels.clear();
        this.state.lastSelectedModel = null;
        
        // UI 업데이트
        this.updateUI();
    }

    // UI 업데이트
    updateUI() {
        // Transform Controls 해제 (선택 상태를 복원하지 않음)
        if (window.transformControls) {
            window.transformControls.detach();
            document.getElementById('transform-panel').style.display = 'none';
            
            // 모든 아이콘 비활성화
            const transformIcons = document.querySelectorAll('.icon-indicator');
            transformIcons.forEach(icon => icon.classList.remove('active'));
        }
        
        // UI Controls 업데이트
        if (window.uiControls) {
            window.uiControls.updateModelListUI();
        }
    }

    // 히스토리에 상태 저장
    saveState(actionType, debounce = false) {
        if (debounce) {
            // 작업별로 개별 타이머 관리
            const timerKey = actionType.split(' ')[1] || actionType; // '모델 이동' -> '이동'
            
            // 기존 타이머가 있으면 취소
            if (this.debounceTimers.has(timerKey)) {
                clearTimeout(this.debounceTimers.get(timerKey));
            }
            
            // 새 타이머 설정
            const timer = setTimeout(() => {
                this._saveStateImmediate(actionType);
                this.debounceTimers.delete(timerKey);
            }, this.debounceDelay);
            
            this.debounceTimers.set(timerKey, timer);
        } else {
            this._saveStateImmediate(actionType);
        }
    }

    _saveStateImmediate(actionType) {
        const snapshot = this.createSnapshot();
        snapshot.actionType = actionType;
        
        // 현재 인덱스 이후의 히스토리 제거 (새로운 액션이 추가될 때)
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }
        
        // 새로운 스냅샷 추가
        this.history.push(snapshot);
        this.currentIndex = this.history.length - 1;
        
        // 최대 히스토리 크기 제한
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }
        
        console.log(`히스토리 저장: ${actionType} (${this.currentIndex + 1}/${this.history.length})`);
    }

    // 실행 취소
    undo() {
        if (!this.canUndo()) {
            console.log('실행 취소할 항목이 없습니다.');
            return false;
        }
        
        // 모든 디바운스 타이머 정리
        this.debounceTimers.forEach((timer) => {
            clearTimeout(timer);
        });
        this.debounceTimers.clear();
        
        this.currentIndex--;
        const snapshot = this.history[this.currentIndex];
        
        console.log(`실행 취소: ${snapshot.actionType} (${this.currentIndex + 1}/${this.history.length})`);
        
        this.applySnapshot(snapshot);
        return true;
    }

    // 다시 실행
    redo() {
        if (!this.canRedo()) {
            console.log('다시 실행할 항목이 없습니다.');
            return false;
        }
        
        this.currentIndex++;
        const snapshot = this.history[this.currentIndex];
        
        console.log(`다시 실행: ${snapshot.actionType} (${this.currentIndex + 1}/${this.history.length})`);
        
        this.applySnapshot(snapshot);
        return true;
    }

    // 실행 취소 가능 여부
    canUndo() {
        return this.currentIndex > 0;
    }

    // 다시 실행 가능 여부
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    // 초기 상태 저장
    saveInitialState() {
        this.history = [];
        this.currentIndex = -1;
        this._saveStateImmediate('초기 상태');
    }

    // 모델 추가 시 히스토리 저장
    onModelAdded(filename) {
        this.saveState(`모델 추가: ${filename}`);
    }

    // 모델 삭제 시 히스토리 저장
    onModelDeleted(filename) {
        this.saveState(`모델 삭제: ${filename}`);
    }

    // 모델 이동 시 히스토리 저장 (즉시 저장)
    onModelMoved() {
        this.saveState('모델 이동');
    }

    // 모델 회전 시 히스토리 저장 (즉시 저장)
    onModelRotated() {
        this.saveState('모델 회전');
    }

    // 모델 스케일 변경 시 히스토리 저장 (즉시 저장)
    onModelScaled() {
        this.saveState('모델 크기 변경');
    }

    // 히스토리 정보 출력 (디버그용)
    printHistory() {
        console.log('=== 히스토리 상태 ===');
        this.history.forEach((snapshot, index) => {
            const marker = index === this.currentIndex ? '→ ' : '  ';
            console.log(`${marker}${index}: ${snapshot.actionType} (${snapshot.models.size}개 모델)`);
        });
        console.log(`현재 인덱스: ${this.currentIndex}`);
        console.log('==================');
    }

    // 히스토리 클리어
    clear() {
        this.history = [];
        this.currentIndex = -1;
        
        // 모든 디바운스 타이머 정리
        this.debounceTimers.forEach((timer) => {
            clearTimeout(timer);
        });
        this.debounceTimers.clear();
    }
}