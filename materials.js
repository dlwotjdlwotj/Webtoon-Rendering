import { webtoonVertexShader, webtoonFragmentShader } from './shaders.js';

export function createMaterials(texture, color, state, doubleSided = false) {
    const hasTexture = !!texture;

    const webtoonMaterial = new THREE.ShaderMaterial({
        uniforms: {
            map: { value: texture },
            lightDirection: { value: state.lightDirection },
            shadowsEnabled: { value: state.shadowsEnabled },
            shadowIntensity: { value: 0.3 },
            brightness: { value: state.globalBrightness },
            celShadingEnabled: { value: false },
            celLevels: { value: 0.2 }
        },
        vertexShader: webtoonVertexShader,
        fragmentShader: webtoonFragmentShader,
        side: doubleSided ? THREE.DoubleSide : THREE.FrontSide
    });

    const standardMaterial = new THREE.MeshPhongMaterial({
        map: texture || null,
        color: hasTexture ? new THREE.Color(0xffffff) : color.clone(),
        shininess: 30,
        specular: 0x111111,
        emissive: hasTexture ? new THREE.Color(0x000000) : color.clone().multiplyScalar(0.15),
        emissiveIntensity: hasTexture ? 0.0 : 1.0,
        side: doubleSided ? THREE.DoubleSide : THREE.FrontSide
    });

    if (hasTexture) {
        standardMaterial.map.encoding = THREE.sRGBEncoding;
        standardMaterial.map.flipY = false;
        standardMaterial.map.needsUpdate = true;
    }

    return { webtoon: webtoonMaterial, standard: standardMaterial };
}

export function createSolidTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

export function updateAllMaterialUniforms(model, uniformName, value) {
    if (model) {
        model.traverse((child) => {
            if (child.isMesh && child.userData.webtoonMaterial && child.userData.webtoonMaterial.uniforms) {
                child.userData.webtoonMaterial.uniforms[uniformName].value = value;
            }
        });
    }
}