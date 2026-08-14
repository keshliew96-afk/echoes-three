// Echoes — boot placeholder. Real architecture lands with the scaffold block.
import * as THREE from 'three';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#221F1B');
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 10, 8);
camera.lookAt(0, 0, 0);

const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: '#E8A23D' })
);
scene.add(box);
scene.add(new THREE.AmbientLight('#8888aa', 0.6));
const key = new THREE.DirectionalLight('#ffdfb0', 1.2);
key.position.set(4, 8, 3);
scene.add(key);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop((t) => {
  box.rotation.y = t / 1000;
  renderer.render(scene, camera);
});
