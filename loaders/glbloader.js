import { createMaterials, createSolidTexture } from '../materials.js';

export class GLBLoader {
    constructor(state) {
        this.state = state;
    }

    async load(arrayBuffer) {
        try {
            const headerView = new DataView(arrayBuffer, 0, 12);
            const magic = headerView.getUint32(0, true);
            
            if (magic !== 0x46546C67) {
                throw new Error(`유효하지 않은 GLB 파일입니다.`);
            }
            
            let offset = 12;
            const jsonChunkHeader = new DataView(arrayBuffer, offset, 8);
            const jsonLength = jsonChunkHeader.getUint32(0, true);
            
            offset += 8;
            const jsonData = new Uint8Array(arrayBuffer, offset, jsonLength);
            const jsonString = new TextDecoder().decode(jsonData);
            const gltfJson = JSON.parse(jsonString);
            
            offset += jsonLength;
            let binaryData = null;
            
            if (offset < arrayBuffer.byteLength) {
                const binaryChunkHeader = new DataView(arrayBuffer, offset, 8);
                const binaryLength = binaryChunkHeader.getUint32(0, true);
                const binaryType = binaryChunkHeader.getUint32(4, true);
                
                if (binaryType === 0x004E4942) {
                    offset += 8;
                    binaryData = new Uint8Array(arrayBuffer, offset, binaryLength);
                }
            }
            
            const textures = this.extractTextures(gltfJson, binaryData);
            const model = this.createModel(gltfJson, binaryData, textures);
            
            return model;
        } catch (error) {
            console.error('GLB 로딩 실패:', error);
            throw error;
        }
    }

    extractTextures(gltfJson, binaryData) {
        const textures = new Map();
        
        if (!gltfJson.textures || !gltfJson.images) return textures;
        
        try {
            gltfJson.textures.forEach((textureDef, textureIndex) => {
                if (textureDef.source !== undefined) {
                    const imageDef = gltfJson.images[textureDef.source];
                    if (imageDef) {
                        const texture = this.createTextureFromImage(imageDef, gltfJson, binaryData);
                        if (texture) textures.set(textureIndex, texture);
                    }
                }
            });
        } catch (error) {
            console.warn('텍스처 추출 중 오류:', error);
        }
        
        return textures;
    }

    createTextureFromImage(imageDef, gltfJson, binaryData) {
        try {
            if (imageDef.bufferView !== undefined) {
                const bufferView = gltfJson.bufferViews[imageDef.bufferView];
                if (!bufferView || !binaryData) return null;
                
                const byteOffset = bufferView.byteOffset || 0;
                const byteLength = bufferView.byteLength;
                const imageData = new Uint8Array(binaryData.buffer, binaryData.byteOffset + byteOffset, byteLength);
                
                const mimeType = imageDef.mimeType || 'image/jpeg';
                const blob = new Blob([imageData], { type: mimeType });
                const imageUrl = URL.createObjectURL(blob);
                
                const loader = new THREE.TextureLoader();
                const texture = loader.load(imageUrl);
                texture.encoding = THREE.sRGBEncoding;
                texture.flipY = false;
                
                return texture;
            }
        } catch (error) {
            console.warn('텍스처 생성 실패:', error);
        }
        return null;
    }

    createModel(gltfJson, binaryData, textures) {
        const modelGroup = new THREE.Group();
        
        if (gltfJson.scenes && gltfJson.scenes.length > 0) {
            const scene = gltfJson.scenes[0];
            if (scene.nodes) {
                scene.nodes.forEach(nodeIndex => {
                    const meshes = this.processNode(nodeIndex, gltfJson, binaryData, textures, new THREE.Matrix4());
                    meshes.forEach(mesh => modelGroup.add(mesh));
                });
            }
        }
        
        return modelGroup;
    }

    processNode(nodeIndex, gltfJson, binaryData, textures, parentTransform) {
        const meshes = [];
        const node = gltfJson.nodes[nodeIndex];
        
        const nodeTransform = new THREE.Matrix4();
        
        if (node.matrix) {
            nodeTransform.fromArray(node.matrix);
        } else {
            const t = node.translation ? new THREE.Vector3(...node.translation) : new THREE.Vector3();
            const r = node.rotation ? new THREE.Quaternion(...node.rotation) : new THREE.Quaternion();
            const s = node.scale ? new THREE.Vector3(...node.scale) : new THREE.Vector3(1, 1, 1);
            nodeTransform.compose(t, r, s);
        }
        
        const worldTransform = new THREE.Matrix4().multiplyMatrices(parentTransform, nodeTransform);
        
        if (node.mesh !== undefined) {
            const meshDef = gltfJson.meshes[node.mesh];
            if (meshDef.primitives) {
                meshDef.primitives.forEach(primitive => {
                    const geometry = this.createGeometry(primitive, gltfJson, binaryData);
                    if (geometry) {
                        geometry.applyMatrix4(worldTransform);
                        const materialData = this.getMaterialData(primitive, gltfJson, textures);
                        const materials = createMaterials(materialData.texture, materialData.color, this.state);
                        
                        const mesh = new THREE.Mesh(geometry, this.state.webtoonMode ? materials.webtoon : materials.standard);
                        mesh.userData.webtoonMaterial = materials.webtoon;
                        mesh.userData.standardMaterial = materials.standard;
                        mesh.userData.originalColor = materialData.color;
                        
                        meshes.push(mesh);
                    }
                });
            }
        }
        
        if (node.children) {
            node.children.forEach(childIndex => {
                const childMeshes = this.processNode(childIndex, gltfJson, binaryData, textures, worldTransform);
                meshes.push(...childMeshes);
            });
        }
        
        return meshes;
    }

    getMaterialData(primitive, gltfJson, textures) {
        let texture = null;
        let color = new THREE.Color(0xffffff);
        
        if (primitive.material !== undefined && gltfJson.materials) {
            const materialDef = gltfJson.materials[primitive.material];
            if (materialDef.pbrMetallicRoughness) {
                const pbr = materialDef.pbrMetallicRoughness;
                if (pbr.baseColorFactor) {
                    color = new THREE.Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2]);
                }
                if (pbr.baseColorTexture && textures.has(pbr.baseColorTexture.index)) {
                    texture = textures.get(pbr.baseColorTexture.index);
                }
            }
        }
        
        if (!texture) texture = createSolidTexture(color);
        return { texture, color };
    }

    createGeometry(primitive, gltfJson, binaryData) {
        const geometry = new THREE.BufferGeometry();
        
        try {
            const positions = this.extractAccessorData(primitive.attributes.POSITION, gltfJson, binaryData);
            if (!positions) throw new Error('Position 데이터 추출 실패');
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            
            if (primitive.attributes.NORMAL) {
                const normals = this.extractAccessorData(primitive.attributes.NORMAL, gltfJson, binaryData);
                if (normals) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            } else {
                geometry.computeVertexNormals();
            }
            
            if (primitive.attributes.TEXCOORD_0) {
                const uvs = this.extractAccessorData(primitive.attributes.TEXCOORD_0, gltfJson, binaryData);
                if (uvs) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            } else {
                const uvArray = new Float32Array(positions.length / 3 * 2).fill(0.5);
                geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
            }
            
            if (primitive.indices !== undefined) {
                const indices = this.extractAccessorData(primitive.indices, gltfJson, binaryData);
                if (indices) geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            }
            
            return geometry;
        } catch (error) {
            console.error('지오메트리 생성 실패:', error);
            return null;
        }
    }

    extractAccessorData(accessorIndex, gltfJson, binaryData) {
        try {
            const accessor = gltfJson.accessors[accessorIndex];
            const bufferView = gltfJson.bufferViews[accessor.bufferView];

            if (!binaryData) return null;

            const componentType = accessor.componentType;
            const count = accessor.count;
            const type = accessor.type;

            const componentSizeMap = {
                5120: 1,
                5121: 1,
                5122: 2,
                5123: 2,
                5125: 4,
                5126: 4
            };

            const numComponentsMap = {
                SCALAR: 1,
                VEC2: 2,
                VEC3: 3,
                VEC4: 4,
                MAT2: 4,
                MAT3: 9,
                MAT4: 16
            };

            const componentSize = componentSizeMap[componentType];
            const numComponents = numComponentsMap[type] || 1;

            const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
            const byteStride = bufferView.byteStride || (componentSize * numComponents);
            const littleEndian = true;

            if (type === 'SCALAR' && (componentType === 5123 || componentType === 5125)) {
                if (byteStride !== componentSize) {
                    const out =
                        (componentType === 5125)
                            ? new Uint32Array(count)
                            : new Uint16Array(count);
                    const dv = new DataView(binaryData.buffer, binaryData.byteOffset + byteOffset, byteStride * count);
                    for (let i = 0; i < count; i++) {
                        const offs = i * byteStride;
                        out[i] = (componentType === 5125)
                            ? dv.getUint32(offs, littleEndian)
                            : dv.getUint16(offs, littleEndian);
                    }
                    return out;
                } else {
                    if (componentType === 5125) {
                        return new Uint32Array(binaryData.buffer, binaryData.byteOffset + byteOffset, count);
                    } else {
                        return new Uint16Array(binaryData.buffer, binaryData.byteOffset + byteOffset, count);
                    }
                }
            }

            const out = new Float32Array(count * numComponents);
            const dv = new DataView(binaryData.buffer, binaryData.byteOffset + byteOffset, byteStride * count);

            const readComp = (off) => {
                switch (componentType) {
                    case 5126: return dv.getFloat32(off, littleEndian);
                    case 5121: {
                        const v = dv.getUint8(off);
                        return accessor.normalized ? v / 255.0 : v;
                    }
                    case 5120: {
                        const v = dv.getInt8(off);
                        return accessor.normalized ? Math.max(v / 127.0, -1.0) : v;
                    }
                    case 5123: {
                        const v = dv.getUint16(off, littleEndian);
                        return accessor.normalized ? v / 65535.0 : v;
                    }
                    case 5122: {
                        const v = dv.getInt16(off, littleEndian);
                        return accessor.normalized ? Math.max(v / 32767.0, -1.0) : v;
                    }
                    case 5125: {
                        const v = dv.getUint32(off, littleEndian);
                        return accessor.normalized ? v / 4294967295.0 : v;
                    }
                    default: return 0;
                }
            };

            for (let i = 0; i < count; i++) {
                const base = i * byteStride;
                for (let c = 0; c < numComponents; c++) {
                    out[i * numComponents + c] = readComp(base + c * componentSize);
                }
            }
            return out;

        } catch (error) {
            console.error('데이터 추출 실패:', error);
            return null;
        }
    }
}