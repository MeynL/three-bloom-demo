import * as THREE from 'three';
export class UnrealBloomMaterial extends THREE.ShaderMaterial {
  constructor(kernelRadius) {
    super({
      defines: {
        'NUM_MIPS': 5,
        'KERNEL_RADIUS': kernelRadius,
        'SIGMA': kernelRadius
      },
      uniforms: {
        'blurTexture1': {
          value: null
        },
        'blurTexture2': {
          value: null
        },
        'blurTexture3': {
          value: null
        },
        'blurTexture4': {
          value: null
        },
        'blurTexture5': {
          value: null
        },
        'bloomStrength': {
          value: 1.5
        },
        'bloomFactors': {
          value: [ 1.0, 0.8, 0.6, 0.4, 0.2 ]
        },
        'bloomTintColors': {
          value: [ new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 1, 1, 1 ) ]
        },
        'bloomRadius': {
          value: 0.0
        },
        'colorTexture': {
          value: null
        },
        'texSize': {
          value: new THREE.Vector2( 0.5, 0.5 )
        },
        'direction': {
          value: new THREE.Vector2( 0.5, 0.5 )
        }
      },
      vertexShader: `varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
      fragmentShader: `
        #include <common>
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;

	vec3 u_color			= vec3(0.1,0.775,0.189);
	float u_edgeThickness	= 2.07; //2.00;
	float u_edgeSharpness	= 35.0; //30.0;
	float u_edgeSubtract	= 0.4; //0.3;
	float u_glowStrength	= 4.0; //10.0;

				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

      varying vec2 vUv;
				uniform sampler2D blurTexture1;

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}

	void main(void){

					vec2 invSize = 1.0 / texSize;
					float fSigma = float(SIGMA);
					float weightSum = gaussianPdf(0.0, fSigma);
					vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianPdf(x, fSigma);
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					vec4 m_color = vec4(diffuseSum/weightSum, 1.0);


		vec2 uv		= abs(vUv - 0.5) * u_edgeThickness;
		uv	= pow(uv, vec2(u_edgeSharpness)) - u_edgeSubtract;

		float c = clamp(uv.x + uv.y, 0.0, 1.0);

		vec3 cc 	= mix(vec3(0.15,0.15,0.15), u_color ,c);

		// gl_FragColor = vec4( cc , 1.0);
		// vec4 m_color = vec4( cc , 1.0);

					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * m_color
					 // +
						// lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture1, vUv) +
						// lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture1, vUv) +
						// lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture1, vUv) +
						// lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture1, vUv)
						 );

	}
				`
    });
  }
}
