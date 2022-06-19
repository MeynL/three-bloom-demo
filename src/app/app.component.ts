import {AfterViewInit, Component, OnInit} from "@angular/core";
import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {Float32BufferAttribute, Vector3} from "three";
import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
import {Line2} from "three/examples/jsm/lines/Line2";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnInit{
  public matLine;

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;
    const view = document.getElementById('view');
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    // camera.position.set(0, 20, 100);
    camera.position.set( - 40, 0, 60 );

    // const box = new THREE.BoxGeometry(10, 10, 10, 1, 1, 1);
    // const material = new THREE.MeshPhysicalMaterial({color: '#fff'});
    // const mesh = new THREE.Mesh(box, material);
    // mesh.layers.toggle( BLOOM_SCENE );
    // mesh.position.x = 15;
    // scene.add(mesh);
    const line = this.makeLine();
    line.layers.toggle( BLOOM_SCENE );
    scene.add(line);


    const light = new THREE.PointLight();
    light.position.set(0, 20, 10);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight('#fff', .2);
    scene.add(ambientLight);
    const shape = this.makeShape();
    scene.add(shape);

    const bloomLayer = new THREE.Layers();
    bloomLayer.set( BLOOM_SCENE );

    const params = {
      exposure: 1.4,
      bloomStrength: 3,
      bloomThreshold: 0,
      bloomRadius: 1,
      scene: 'Scene with Glow'
    };

    const materials = {};
    const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );

    const renderScene = new RenderPass( scene, camera );

    const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    const bloomComposer = new EffectComposer( renderer );
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass( renderScene );
    bloomComposer.addPass( bloomPass );

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial( {
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: vertexshader,
        fragmentShader: fragmentshader,
        defines: {}
      } ), 'baseTexture'
    );
    finalPass.needsSwap = true;

    const finalComposer = new EffectComposer( renderer );
    finalComposer.addPass( renderScene );
    finalComposer.addPass( finalPass );

    function restoreMaterial( obj ) {

      if ( materials[ obj.uuid ] ) {

        obj.material = materials[ obj.uuid ];
        delete materials[ obj.uuid ];

      }

    }

    function darkenNonBloomed( obj ) {

      if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {

        materials[ obj.uuid ] = obj.material;
        obj.material = darkMaterial;

      }

    }

    function renderBloom( mask ) {

      if ( mask === true ) {

        scene.traverse( darkenNonBloomed );
        bloomComposer.render();
        scene.traverse( restoreMaterial );

      } else {

        camera.layers.set( BLOOM_SCENE );
        bloomComposer.render();
        camera.layers.set( ENTIRE_SCENE );

      }

    }

    const start = () => {
      requestAnimationFrame(start);
      orbitControls.update();
      this.matLine.resolution.set( window.innerWidth, window.innerHeight ); // resolution of the viewport
      renderBloom( true );
      finalComposer.render();
    };
    start();
  }

  private makeShape() {
    const shape = this.makeRect(5, 5, 10, 10, 2);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/assets/lena.jpeg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    const extrudeSettings = {
      steps: 0,
      depth: .1,
      bevelEnabled: true,
      bevelThickness: .1,
      bevelSize: 0,
      bevelOffset: 0,
      bevelSegments: 1
    };

    const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
    geometry.computeBoundingBox();

    const newUv = [];
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.array.length; i+=position.itemSize) {
      if (position.array[i + 2] === geometry.boundingBox.max.z) {
        newUv.push(position.array[i] / 10);
        newUv.push(position.array[i + 1] / 10);
      } else {
        newUv.push(1);
        newUv.push(1);
      }
    }
    geometry.setAttribute('uv', new Float32BufferAttribute(newUv, 2))
    geometry.center();

    const material = new THREE.MeshPhongMaterial({color: '#fff', side: THREE.DoubleSide, map: texture});
    const mesh = new THREE.Mesh( geometry, material ) ;
    return mesh;
  }

  private exportGeo(geo: any) {
    const exporter = new GLTFExporter();
    exporter.parse(new THREE.Mesh(geo, new THREE.MeshBasicMaterial()), (buffer) => {
      console.log(buffer);
      this.saveString(JSON.stringify( buffer, null, 2 ), 'fuck.gltf');

    }, (e) => console.error(e));

  }

  private saveBuffer(buffer: any, filename: any) {
    this.save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
  }

  private saveString( text: any, filename: any ) {

    this.save( new Blob( [ text ], { type: 'text/plain' } ), filename );

  }

  private save( blob: any, filename: any ) {

    const link = document.createElement( 'a' );
    if ( link.href ) {

      URL.revokeObjectURL( link.href );

    }

    link.href = URL.createObjectURL( blob );
    link.download = filename || 'data.json';
    link.dispatchEvent( new MouseEvent( 'click' ) );

  }

  private makeRect(x: number, y: number, width: number, height: number, r: number) {
    var path = new THREE.Shape();
    const w = width / 2;
    const h = height / 2;
    path.moveTo(x - w, y - h + r);
    path.quadraticCurveTo(x - w, y - h, x - w + r, y - h);
    path.lineTo(x + w - r, y - h );
    path.quadraticCurveTo(x + w, y - h, x + w, y - h + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x - w + r, y + h);
    path.quadraticCurveTo(x - w, y + h, x - w, y + h - r);
    return path;
  }

  private makeLine() {

    const positions = [];
    const colors = [];

    const points = [
      new Vector3(-10, -10, 0),
      new Vector3(10, -10, 0),
      new Vector3(10, 10, 0),
      new Vector3(-10, 10, 0),
      new Vector3(-10, -10, 0),
    ];

    // const spline = new THREE.CatmullRomCurve3( points );
    // const divisions = Math.round( 12 * points.length );
    // const point = new THREE.Vector3();
    const color = new THREE.Color();
    console.log(points);

    for ( let i = 0; i < points.length; i ++ ) {

      const t = i / points.length;
      //
      // spline.getPoint( t, point );
      // positions.push( point.x, point.y, point.z );
      //
      // color.setHSL( t, 1.0, 0.5 );
      // colors.push( color.r, color.g, color.b );
      //
      positions.push( points[i].x, points[i].y, points[i].z );

      color.setHSL( t, 1.0, 0.5 );
      colors.push( color.r, color.g, color.b );
    }


    // Line2 ( LineGeometry, LineMaterial )

    const geometry = new LineGeometry();
    geometry.setPositions( positions );
    geometry.setColors( colors );

    this.matLine = new LineMaterial( {

      color: 0xffffff,
      linewidth: 1, // in world units with size attenuation, pixels otherwise
      vertexColors: true,

      //resolution:  // to be set by renderer, eventually
      dashed: false,
      alphaToCoverage: true,

    } );

    const line = new Line2( geometry, this.matLine );
    line.computeLineDistances();
    return line;
  }

}

const vertexshader = `
varying vec2 vUv;

void main() {

vUv = uv;

gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}`;

const fragmentshader = `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;

varying vec2 vUv;

void main() {

gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );

}
`;


