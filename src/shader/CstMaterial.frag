varying float vInstanceDelay;
varying vec2 vUv;
varying vec2 vUv2;
varying vec3 vPosition;

uniform bool uColorChanging;
uniform bool uIsOutro;
uniform sampler2D uTexture;
uniform float uProgress;
uniform float uTime;
uniform float uTotalPetals;

varying float vIsCircle;
varying vec3 vColorPale;
varying vec3 vColorDark;

varying vec3 vTangent;

vec3 desaturate(vec3 color,float amount)
{
    float gray=dot(color,vec3(.299,.587,.114));
    return mix(color,vec3(gray),amount);
}

float hash(vec2 p)
{
    p=fract(p*vec2(123.34,456.21));
    p+=dot(p,p+45.32);
    return fract(p.x*p.y);
}

float saturate_(float value)
{
    return clamp(value,0.,1.);
}

float mapRangeNormalized(float value,float inMin,float inMax)
{
    return(value-inMin)/(inMax-inMin);
}

float mapRangeNormalizedClamped(float value,float inMin,float inMax)
{
    return saturate_(mapRangeNormalized(value,inMin,inMax));
}

vec2 heightSlopeRoof0(float x)
{
    float height;
    float slope;
    
    if(x<.5)
    {
        height=x*2.;
        slope=2.;
    }
    else
    {
        height=(1.-x)*2.;
        slope=-2.;
    }
    
    return vec2(height,slope);
}
vec2 heightSlopeRoof(float x)
{
    float height=1.-4.*(x-.5)*(x-.5);
    float slope=-8.*(x-.5);
    
    return vec2(height,slope);
}
vec2 heightSlopeTube(float x)
{
    float height=sqrt(x*(2.-x));
    height=max(height,.000001);
    
    float slope=1.-x;
    slope=slope/height;
    
    return vec2(height,slope);
}
vec2 heightSlope(float x){
    // return heightSlopeRoof(x);
    return heightSlopeTube(x*2.);
}

void main()
{
    vec2 TexCoord=vPosition.xz*22.5;
    TexCoord*=.3*10.;
    
    float noise=texture2D(uTexture,TexCoord).r;
    
    float noiseValue2=noise*.4+.3;
    noise=noise*2.-1.;
    
    // Gradient
    /*
    vec2 gradOffset = vec2(
        0.5,
        0.5 * vIsCircle
    );
    vec2 grad = vUv2 - gradOffset;
    vec2 center = vec2(0.0, 0.0);
    float m_c = mix(1.8, 1.8, vIsCircle);
    float a_c = mix(0.35, 0.0, vIsCircle);
    */
    vec2 gradOffset = vec2(0.5, 0.0);
    vec2 grad = vUv2 - gradOffset;
    vec2 center = vec2(0.0, 0.0);
    float m_c = 1.8;
    float a_c = 0.35;
    float dist = (distance(center, grad) - a_c) * m_c;
    dist = saturate_(dist);
    dist = mix(dist, (distance(center, grad))*2.0, vIsCircle);
    float distDiscard = dist;
    dist*=1.0 + 0.2*vIsCircle;
    distDiscard*= 1.0 + 0.5*vIsCircle;
    // dist = step(dist, 0.8);
    
    // Petal reveal
    float thresholdPetal = vInstanceDelay / uTotalPetals;
    
    thresholdPetal = mix(
        thresholdPetal,
        1.0 - thresholdPetal,
        uIsOutro
    );
    
    if (uColorChanging && uIsOutro)
    {
    }
    else
    {
        if (
            distDiscard * 0.4 +
            thresholdPetal * 0.4 +
            0.2 * (noiseValue2 * 2.0 - 1.0)
            > uProgress
        )
        {
            discard;
        }
    }
    
    // Petal profile
    float x = 1.0 - vUv.y;
    float d1 = 0.48;
    float d2 = 0.15;
    d2 = 0.10;

    
    d2 += 0.05;
    d1 -= 0.05;
    
    float x2 = mapRangeNormalizedClamped(
        x,
        d1 + d2,
        1.0
    );
    
    x2 = max(
        0.0,
        x2 + mix(0.4, 0.0, x2)
    );
    
    float marginGrain = 0.05*0.5;
    float stepBorderInner = mapRangeNormalized(
        x,
        d1 + d2,
        d1 + d2+marginGrain
    );
    stepBorderInner = step(
        stepBorderInner,
        ((noise+1.0)*0.5)
    );
    float stepBorderOuter = mapRangeNormalized(
        x,
        d1,
        d1-marginGrain
    );
    stepBorderOuter = step(
        stepBorderOuter,
        ((noise+1.0)*0.5)
    );
    
    
    
    float shadowsStep = saturate_(
        step(x, d1)
    );
    
    float emojiMask=0.;
    emojiMask=step(
        1.,
        vUv.y
    );


    // Alpha
    {
        float alpha=stepBorderOuter+=step(
            d1,
            x
        );
        
        gl_FragColor.a=alpha;
        
        float coefShadow=1.;
        
        if(uColorChanging&&uIsOutro)
        {
            coefShadow=
            1.-
            pow(
                1.-uProgress,
                2.
            );
        }
        
        float alphaShadow=mix(
            1.,
            .8*coefShadow,
            shadowsStep
        );
        
        gl_FragColor.a*=alphaShadow;
        
        gl_FragColor.a=mix(
            gl_FragColor.a,
            step((noise+1.)*.5,(vUv.y-2.)/.4)*.1,
            emojiMask
        );
        
        if(gl_FragColor.a<.05){
            discard;
        }
        
    }










    float innerStep = 1.0 - stepBorderInner;
    
    
    float innershadow = mix(
        1.0,
        x2,
        innerStep
    );
    
    
    // Color
    vec3 innerColor = mix(
        vColorPale,
        vColorDark,
        dist * dist
    );
    
    innerColor = mix(
        vColorDark * 0.8,
        innerColor,
        mix(innershadow, 1.0, vIsCircle)
    );
    
    
    // Normal
    vec3 normalUp = vec3(
        0.0,
        1.0,
        0.0
    );
    
    vec3 normal;
    
    vec3 bitTangent = vec3(
        vTangent.z,
        0.0,
        -vTangent.x
    );
    
    bitTangent = mix(
        vec3(1.0, 0.0, 0.0),
        bitTangent,
        vec3(step(x, 0.99))
    );
    
    float x001 = mapRangeNormalizedClamped(
        x,
        d1,
        d1 + d2
    );
    
    float x002 = mapRangeNormalizedClamped(
        x,
        d1 + d2,
        d1 + d2+0.1
    );
    
    vec2 height_slope1 = heightSlope(
        x001
    );
    
    vec2 height_slope = height_slope1;
    
    normal = normalize(
        (normalUp * height_slope.x) -
        (bitTangent * height_slope.y)
    );
    
    normal = mix(
        normal,
        vec3(0.0, 1.0, 0.0),
        step(vUv.y, -1.0)
    );
    
    
    // Lighting
    vec3 lightDir = vec3(0.0, 0.70710678, -0.70710678);
    
    float l1 = dot(
        normal,
        lightDir
    );
    
    
    l1 = max(
        0.0,
        l1 + mix(0.75, 0.0, l1)
    );
    
    innerColor=mix(
        vec3(l1),
        innerColor,
        innerStep
    );
    
    gl_FragColor.rgb=innerColor;
    
    // emoji Color
    gl_FragColor.rgb=mix(
        gl_FragColor.rgb,
        mix(vec3(1.0),vColorDark,.1),
        step(vUv.y,-1.)
    );
    // gl_FragColor.rgb=mix(
    //     gl_FragColor.rgb,
    //     mix(vColorDark,vColorPale,.25),
    //     step(vUv.y,-1.)
    // );
    
    // Emoji shadow
    float emojiAlpha=1.;
    
    float emojiG=vUv.y-2.;
    
    
    gl_FragColor.rgb=mix(
        gl_FragColor.rgb,
        mix(vColorDark,vColorPale,1.),
        emojiMask
    );
    
    emojiAlpha=(emojiG/.4)*.9;
    
    // Noise
gl_FragColor.rgb+=noise*mix(
        .075,
        .075,
        innerStep
    );
    gl_FragColor.a=1.;    
}