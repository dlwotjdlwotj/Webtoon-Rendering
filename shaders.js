export const webtoonVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vViewPosition = -vPosition;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const webtoonFragmentShader = `
    uniform sampler2D map;
    uniform vec3 lightDirection;
    uniform bool shadowsEnabled;
    uniform float shadowIntensity;
    uniform float brightness;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    
    float calculateBasicShadow() {
        if (!shadowsEnabled) return 1.0;
        
        vec3 normalizedLightDir = normalize(-lightDirection);
        vec3 normalizedWorldNormal = normalize(vWorldNormal);
        
        float NdotL = dot(normalizedWorldNormal, normalizedLightDir);
        
        if (NdotL < 0.0) {
            return 1.0 - shadowIntensity;
        } else {
            return 1.0;
        }
    }
    
    void main() {
        vec4 texColor = texture2D(map, vUv);
        
        float shadowFactor = calculateBasicShadow();
        
        vec3 finalColor = texColor.rgb * shadowFactor * brightness * 1.1;
        
        gl_FragColor = vec4(finalColor, texColor.a);
    }
`;

export const outlineVertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const outlineFragmentShader = `
    uniform sampler2D colorTexture;
    uniform sampler2D depthTexture;
    uniform sampler2D normalTexture;
    uniform vec2 resolution;
    uniform float outlineThickness;
    uniform float depthSensitivity;
    uniform float normalSensitivity;
    varying vec2 vUv;

    float getDepth(vec2 uv){ return texture2D(depthTexture, uv).r; }
    vec3  getNormal(vec2 uv){ return texture2D(normalTexture, uv).rgb * 2.0 - 1.0; }

    float sobelDepth(vec2 uv){
        vec2 texel = 1.0 / resolution;
        float px = outlineThickness;
        float s00 = getDepth(uv + vec2(-1.0,-1.0)*px*texel);
        float s01 = getDepth(uv + vec2( 0.0,-1.0)*px*texel);
        float s02 = getDepth(uv + vec2( 1.0,-1.0)*px*texel);
        float s10 = getDepth(uv + vec2(-1.0, 0.0)*px*texel);
        float s12 = getDepth(uv + vec2( 1.0, 0.0)*px*texel);
        float s20 = getDepth(uv + vec2(-1.0, 1.0)*px*texel);
        float s21 = getDepth(uv + vec2( 0.0, 1.0)*px*texel);
        float s22 = getDepth(uv + vec2( 1.0, 1.0)*px*texel);
        float gx = (s20 + 2.0*s21 + s22) - (s00 + 2.0*s01 + s02);
        float gy = (s02 + 2.0*s12 + s22) - (s00 + 2.0*s10 + s20);
        return sqrt(max(0.0, gx*gx + gy*gy));
    }

    void main(){
        vec4 col = texture2D(colorTexture, vUv);

        float depthMult = pow(2.0, depthSensitivity - 5.0);

        float edge = sobelDepth(vUv) * depthMult;
        float threshold = 0.02;
        
        gl_FragColor = (edge > threshold) ? vec4(0.0,0.0,0.0,1.0) : col;
    }
`;