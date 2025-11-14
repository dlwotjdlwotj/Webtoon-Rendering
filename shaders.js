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
    uniform bool celShadingEnabled;
    uniform float celLevels;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    
    float calculateLighting() {
        vec3 normalizedLightDir = normalize(-lightDirection);
        vec3 normalizedWorldNormal = normalize(vWorldNormal);
        
        // 조명 강도 계산 (0.0 ~ 1.0)
        float NdotL = dot(normalizedWorldNormal, normalizedLightDir);
        
        // 0.0 ~ 1.0 범위로 정규화
        float lightIntensity = NdotL * 0.5 + 0.5;
        
        return lightIntensity;
    }
    
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
    
    // Bilateral Filtering 적용
    vec3 applyBilateralFilter(sampler2D tex, vec2 uv, float sigmaColor) {
        if (!celShadingEnabled) {
            return texture2D(tex, uv).rgb;  // OFF: 원본 텍스처 그대로
        }
        
        // Bilateral filter 파라미터
        float sigmaSpace = 1.5;   // 공간 가우시안 표준편차
        
        vec3 sum = vec3(0.0);
        float weightSum = 0.0;
        
        // 픽셀 크기
        float pixelSize = 0.002;
        
        // 중심 픽셀 색상
        vec3 centerColor = texture2D(tex, uv).rgb;
        
        // 5x5 커널 순회
        for (int x = -2; x <= 2; x++) {
            for (int y = -2; y <= 2; y++) {
                vec2 offset = vec2(float(x), float(y)) * pixelSize;
                vec2 sampleUV = uv + offset;
                
                // 경계 체크
                if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) {
                    continue;
                }
                
                // 텍스처 샘플링
                vec3 sampleColor = texture2D(tex, sampleUV).rgb;
                
                // 공간 거리 가중치 (가우시안)
                float spatialDist = length(vec2(float(x), float(y)));
                float spatialWeight = exp(-spatialDist * spatialDist / (2.0 * sigmaSpace * sigmaSpace));
                
                // 색상 차이 가중치 (가우시안) - sigmaColor 파라미터 사용
                vec3 colorDiff = sampleColor - centerColor;
                float colorDist = dot(colorDiff, colorDiff); // 제곱 거리
                float colorWeight = exp(-colorDist / (2.0 * sigmaColor * sigmaColor));
                
                // 최종 가중치
                float weight = spatialWeight * colorWeight;
                
                sum += sampleColor * weight;
                weightSum += weight;
            }
        }
        
        // 정규화된 결과
        vec3 filtered = sum / max(weightSum, 0.0001);
        
        return filtered;
    }
    
    void main() {
        vec4 texColor = texture2D(map, vUv);
        
        // 1. 텍스처에 bilateral filtering 적용 (celLevels를 sigmaColor로 사용)
        vec3 filteredTexture = applyBilateralFilter(map, vUv, celLevels);
        
        vec3 finalColor;
        
        if (celShadingEnabled) {
            // Bilateral Filter ON: 필터링된 텍스처 표시
            float shadowFactor = calculateBasicShadow();
            finalColor = filteredTexture * shadowFactor * brightness * 1.1;
        } else {
            // Bilateral Filter OFF: 원본 텍스처 표시
            float shadowFactor = calculateBasicShadow();
            finalColor = texColor.rgb * shadowFactor * brightness * 1.1;
        }
        
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