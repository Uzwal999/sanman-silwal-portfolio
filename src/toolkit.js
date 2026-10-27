import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const PALETTE = [
  { bg: "#5eead4", fg: "#05211d" },
  { bg: "#a78bfa", fg: "#170b33" },
  { bg: "#14161f", fg: "#e7e9ee" },
  { bg: "#e7e9ee", fg: "#0a0b10" },
  { bg: "#f472b6", fg: "#2a0716" },
];

// Equirectangular label texture; three.js maps u = 0.25 to the side facing +z.
function labelTexture(text, { bg, fg }) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 64;
  ctx.font = `700 ${size}px Geist, system-ui, sans-serif`;
  while (ctx.measureText(text).width > 250 && size > 30) {
    size -= 2;
    ctx.font = `700 ${size}px Geist, system-ui, sans-serif`;
  }
  ctx.fillText(text, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createToolkit(canvas, labels) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 22);

  const key = new THREE.DirectionalLight("#ffffff", 1.6);
  key.position.set(4, 6, 10);
  scene.add(key, new THREE.AmbientLight("#ffffff", 0.35));

  const geo = new THREE.SphereGeometry(1, 48, 32);
  const balls = labels.map((text, i) => {
    const colors = PALETTE[i % PALETTE.length];
    const mat = new THREE.MeshPhysicalMaterial({
      map: labelTexture(text, colors),
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const r = 0.78 + Math.random() * 0.32;
    mesh.scale.setScalar(r);
    mesh.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 8 + 8, (Math.random() - 0.5) * 2);
    scene.add(mesh);
    return { mesh, r, v: new THREE.Vector3(), spin: (Math.random() - 0.5) * 0.4 };
  });

  const mouse = new THREE.Vector3(999, 999, 0);
  const mouseVel = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ndc = new THREE.Vector2();

  function pointerToWorld(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, hit);
    return hit;
  }

  canvas.addEventListener("pointermove", (e) => {
    const p = pointerToWorld(e);
    if (mouse.x !== 999) mouseVel.set(p.x - mouse.x, p.y - mouse.y);
    mouse.copy(p);
  });
  canvas.addEventListener("pointerleave", () => mouse.set(999, 999, 0));
  canvas.addEventListener("pointerdown", (e) => {
    const p = pointerToWorld(e);
    balls.forEach((b) => {
      const d = b.mesh.position.clone().sub(p);
      const len = Math.max(d.length(), 0.5);
      b.v.add(d.normalize().multiplyScalar(Math.min(2.2, 14 / (len * len))));
    });
  });

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull the camera back on narrow screens so the cluster still fits.
    camera.position.z = w / h < 1 ? 22 / Math.max(w / h, 0.55) : 22;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let visible = false;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0.05 }).observe(canvas);

  const clock = new THREE.Clock();
  const diff = new THREE.Vector3();

  function step(dt) {
    for (const b of balls) {
      const p = b.mesh.position;
      // Spring toward the centre, flatter in z so the cluster reads as a wall.
      b.v.x += -p.x * 0.9 * dt;
      b.v.y += -p.y * 1.2 * dt;
      b.v.z += -p.z * 3 * dt;

      diff.copy(p).sub(mouse);
      const dist = diff.length();
      const reach = b.r + 2.4;
      if (dist < reach) {
        const f = (1 - dist / reach) * 40 * dt;
        b.v.add(diff.normalize().multiplyScalar(f));
        b.v.x += mouseVel.x * 0.12;
        b.v.y += mouseVel.y * 0.12;
      }
    }
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        diff.copy(b.mesh.position).sub(a.mesh.position);
        const d = diff.length();
        const min = a.r + b.r;
        if (d > 0 && d < min) {
          const n = diff.divideScalar(d);
          const push = (min - d) / 2;
          a.mesh.position.addScaledVector(n, -push);
          b.mesh.position.addScaledVector(n, push);
          const rel = b.v.clone().sub(a.v).dot(n);
          if (rel < 0) {
            a.v.addScaledVector(n, rel * 0.6);
            b.v.addScaledVector(n, -rel * 0.6);
          }
        }
      }
    }
    for (const b of balls) {
      b.v.multiplyScalar(Math.pow(0.18, dt));
      b.mesh.position.addScaledVector(b.v, dt * 6);
      // Keep labels mostly facing the viewer with a little wobble.
      b.mesh.rotation.y = THREE.MathUtils.clamp(b.v.x * 0.15, -0.5, 0.5) + Math.sin(clock.elapsedTime * b.spin) * 0.25;
      b.mesh.rotation.x = THREE.MathUtils.clamp(-b.v.y * 0.15, -0.5, 0.5);
    }
    mouseVel.multiplyScalar(0.8);
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 1 / 30);
    if (!visible) return;
    // Sub-step for stable collisions.
    step(dt / 2);
    step(dt / 2);
    renderer.render(scene, camera);
  }
  frame();
}
