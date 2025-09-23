import { createMaterials, createSolidTexture } from '../materials.js';

export class OBJLoader {
    constructor(state) {
        this.state = state;
    }

    load(contents) {
        const vertices = [];
        const uvs = [];
        const faces = [];
        
        const lines = contents.split('\n');
        
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('v ')) {
                const parts = line.split(/\s+/);
                vertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            } else if (line.startsWith('vt ')) {
                const parts = line.split(/\s+/);
                uvs.push(parseFloat(parts[1]), parseFloat(parts[2]));
            } else if (line.startsWith('f ')) {
                const parts = line.split(/\s+/).slice(1);
                for (let i = 1; i < parts.length - 1; i++) {
                    faces.push(parts[0], parts[i], parts[i + 1]);
                }
            }
        }
        
        const geometry = this.createGeometry(vertices, uvs, faces);
        const texture = createSolidTexture(new THREE.Color(0xffffff));
        const materials = createMaterials(texture, new THREE.Color(0xffffff), this.state);
        
        const mesh = new THREE.Mesh(geometry, this.state.webtoonMode ? materials.webtoon : materials.standard);
        mesh.userData.webtoonMaterial = materials.webtoon;
        mesh.userData.standardMaterial = materials.standard;
        
        return mesh;
    }

    createGeometry(vertices, uvs, faces) {
        const positions = [];
        const uvArray = [];
        
        for (let face of faces) {
            const vertexData = face.split('/');
            const vIndex = (parseInt(vertexData[0]) - 1) * 3;
            
            positions.push(vertices[vIndex], vertices[vIndex + 1], vertices[vIndex + 2]);
            
            if (vertexData[1] && uvs.length > 0) {
                const uvIndex = (parseInt(vertexData[1]) - 1) * 2;
                uvArray.push(uvs[uvIndex], uvs[uvIndex + 1]);
            } else {
                uvArray.push(0.5, 0.5);
            }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
        geometry.computeVertexNormals();
        
        return geometry;
    }
}