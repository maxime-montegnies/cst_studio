attribute vec2 uv1;
attribute float aInstanceDelay;
attribute float aIsCircle;
attribute vec3 aColorPale;
attribute vec3 aColorDark;
varying float vIsCircle;
varying float vInstanceDelay;
varying vec2 vUv;
varying vec2 vUv2;
varying vec3 vPosition;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vColorPale;
varying vec3 vColorDark;
uniform float uProgress;
uniform float uTotalPetals;
uniform bool uIsOutro;
uniform bool uColorChanging;
attribute vec4 tangent;
varying vec3 vTangent;

void main() {
    // vTangent = tangent;
    vInstanceDelay = aInstanceDelay;
    vIsCircle = aIsCircle;
    vColorPale = aColorPale;
    vColorDark = aColorDark;
    vUv = 1.0-uv;
    vUv.x = uv.x;
    vUv2 = 1.0-uv1;
    vUv2.x = uv1.x;
    vec3 mPosition = position;
    
    
    
    vec2 grad = vUv2-vec2(0.5, 0.0);
    vec2 center = vec2(0.0, 0.5*vIsCircle);
    vec2 scaler = vec2(1.5-0.5*vIsCircle, 1.0);
    float dist = distance(center, grad*scaler);
    
    scaler = vec2(1.2-0.2*vIsCircle, 1.0);
    float dist2 = distance(center, grad*scaler);
    float c;
    c = pow(dist2, 10.0);
    c *= 1.0-uProgress;
    
    float noiseValue = 0.0;
    float thresholdPetal = vInstanceDelay/uTotalPetals;
    thresholdPetal = mix(thresholdPetal, 1.0-thresholdPetal, uIsOutro);
    float threshold = dist2 * 0.4 + thresholdPetal * 0.5 + 0.1 * (noiseValue * 2.0 - 1.0);

    float bb = smoothstep(
        threshold,
        threshold + 0.1,
        uProgress - 0.1
    );

    bb = 1.0-bb;
    bb = mix(bb*0.01, -bb*0.005, uIsOutro);
    // float bb = step(dist2*0.4+vInstanceDelay/uTotalPetals*0.5+0.1*(noiseValue*2.0-1.0), uProgress-.2);
    // bb = (uProgress-.1) / (dist2*0.4+vInstanceDelay/uTotalPetals*0.5+0.1*(noiseValue*2.0-1.0));
    // bb = max(0.0, bb);
    // bb = min(1.0, bb);
    // bb = step(dist2, uProgress-.02);
    // bb = step(dist2, .5);
    float a = atan(mPosition.z, mPosition.x);
    // float d = pow(mPosition.z*mPosition.z+mPosition.x*mPosition.x,0.5);
    
    // float coef = 1.0;
    float coef = mix(1.0, 0.5, uColorChanging);
    // if(uColorChanging && !uIsOutro){
    // if(!uColorChanging || uColorChanging && !uIsOutro){
    float coefColorChange = mix(0.75, 0.0, uIsOutro);
    coefColorChange = mix(1.0, coefColorChange, uColorChanging);
    coef *= coefColorChange;
    // if(!uColorChanging){
        mPosition.x += cos(a)*bb*0.2 * coef;
        mPosition.z += sin(a)*bb*0.2 * coef;

    // }



    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(mPosition, 1.0);
    vec4 instancePosition = instanceMatrix * vec4(mPosition, 1.0);
    vPosition = instancePosition.xyz;
    vViewPosition = normalize(cameraPosition - worldPosition.xyz);
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vTangent = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * tangent.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
}