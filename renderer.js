import { outlineVertexShader, outlineFragmentShader } from './shaders.js';

export class RenderManager {
    constructor(state) {
        this.state = state;
        this.colorTarget = null;
        this.depthTarget = null;
        this.outlineScene = null;
        this.outlineCamera = null;
        this.outlineMaterial = null;
        this.depthMaterial = null;
    }

    setupRenderTargets() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const pixelRatio = window.devicePixelRatio;
        
        this.colorTarget = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            encoding: THREE.sRGBEncoding
        });
        
        this.depthTarget = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType
        });
        
        this.depthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                cameraNear: { value: this.state.camera.near },
                cameraFar: { value: this.state.camera.far }
            },
            vertexShader: `
                varying float vViewZ;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewZ = -mvPosition.z;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float cameraNear;
                uniform float cameraFar;
                varying float vViewZ;
                
                void main() {
                    float normalizedDepth = (vViewZ - cameraNear) / (cameraFar - cameraNear);
                    gl_FragColor = vec4(normalizedDepth, normalizedDepth, normalizedDepth, 1.0);
                }
            `
        });
        
        this.outlineScene = new THREE.Scene();
        this.outlineCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        this.outlineMaterial = new THREE.ShaderMaterial({
            uniforms: {
                colorTexture: { value: this.colorTarget.texture },
                depthTexture: { value: this.depthTarget.texture },
                resolution: { value: new THREE.Vector2(width * pixelRatio, height * pixelRatio) },
                outlineThickness: { value: 0.5 },
                depthSensitivity: { value: 5.0 },
                cameraNear: { value: this.state.camera.near },
                cameraFar: { value: this.state.camera.far }
            },
            vertexShader: outlineVertexShader,
            fragmentShader: outlineFragmentShader
        });
        
        this.outlineScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.outlineMaterial));
    }

    render() {
        if (this.state.webtoonMode && this.state.currentModel) {
            // Color pass
            this.state.renderer.setRenderTarget(this.colorTarget);
            this.state.renderer.clear();
            this.state.renderer.render(this.state.scene, this.state.camera);
            
            // 기즈모 depth test 제외
            const gizmoObjects = [];
            this.state.scene.traverse((child) => {
                if (child.isMesh) {
                    if (child.userData.isGizmo) {
                        child.visible = false;
                        gizmoObjects.push(child);
                    } else {
                        child.userData.currentMaterial = child.material;
                        child.material = this.depthMaterial;
                    }
                }
            });
            
            this.depthMaterial.uniforms.cameraNear.value = this.state.camera.near;
            this.depthMaterial.uniforms.cameraFar.value = this.state.camera.far;
            
            if (this.outlineMaterial && this.outlineMaterial.uniforms) {
                this.outlineMaterial.uniforms.cameraNear.value = this.state.camera.near;
                this.outlineMaterial.uniforms.cameraFar.value = this.state.camera.far;
            }
            
            this.state.renderer.setRenderTarget(this.depthTarget);
            this.state.renderer.clear();
            this.state.renderer.render(this.state.scene, this.state.camera);
            
            // Restore materials and visibility
            this.state.scene.traverse((child) => {
                if (child.isMesh && child.userData.currentMaterial) {
                    child.material = child.userData.currentMaterial;
                    delete child.userData.currentMaterial;
                }
            });
            
            // 기즈모 다시 보이게
            gizmoObjects.forEach(obj => {
                obj.visible = true;
            });
            
            // Final composite
            this.state.renderer.setRenderTarget(null);
            this.state.renderer.clear();
            this.state.renderer.render(this.outlineScene, this.outlineCamera);
        } else {
            this.state.renderer.setRenderTarget(null);
            this.state.renderer.render(this.state.scene, this.state.camera);
        }
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const pixelRatio = window.devicePixelRatio;
        
        if (this.colorTarget && this.depthTarget) {
            this.colorTarget.setSize(width * pixelRatio, height * pixelRatio);
            this.depthTarget.setSize(width * pixelRatio, height * pixelRatio);
            
            if (this.outlineMaterial && this.outlineMaterial.uniforms) {
                this.outlineMaterial.uniforms.resolution.value.set(width * pixelRatio, height * pixelRatio);
            }
        }
    }
}