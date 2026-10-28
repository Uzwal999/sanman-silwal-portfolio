import * as THREE from "three";
import landPoints from "./land-points.json";

const R = 1;
const DEG = Math.PI / 180;

const HOME = { name: "Kathmandu", label: "Kathmandu, Nepal", lat: 27.7, lng: 85.32 };
const CITIES = [
  { name: "London", label: "London, UK", lat: 51.5, lng: -0.13 },
  { name: "New York", label: "New York, USA", lat: 40.71, lng: -74.0 },
  { name: "Toronto", label: "Toronto, Canada", lat: 43.65, lng: -79.38, below: true },
  { name: "Dubai", label: "Dubai, UAE", lat: 25.2, lng: 55.27 },
  { name: "Sydney", label: "Sydney, Australia", lat: -33.87, lng: 151.21 },
];

function toVec(lat, lng, r = R) {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function makeDots() {
  const count = landPoints.length / 2;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    toVec(landPoints[i * 2], landPoints[i * 2 + 1], R * 1.002).toArray(pos, i * 3);
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 2.2 },
      uColorA: { value: new THREE.Color("#5eead4") },
      uColorB: { value: new THREE.Color("#a78bfa") },
    },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime;
      uniform float uSize;
      varying float vSeed;
      varying float vFacing;
      void main() {
        vSeed = seed;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(position));
        vFacing = dot(n, normalize(-mv.xyz));
        gl_PointSize = uSize * (0.8 + 0.4 * sin(uTime * 1.5 + seed * 30.0)) * (3.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vSeed;
      varying float vFacing;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float edge = smoothstep(0.5, 0.15, d);
        vec3 col = mix(uColorA, uColorB, smoothstep(0.55, 1.0, vSeed));
        float a = edge * smoothstep(-0.05, 0.35, vFacing);
        gl_FragColor = vec4(col, a * 0.95);
      }
    `,
  });
  return new THREE.Points(geo, mat);
}

function makeAtmosphere() {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#3cc7b8") } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float i = pow(0.72 + dot(vNormal, vView), 3.0);
        gl_FragColor = vec4(uColor, clamp(i, 0.0, 1.0) * 0.55);
      }
    `,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 64, 64), mat);
}

function makeArc(from, to) {
  const a = toVec(from.lat, from.lng);
  const b = toVec(to.lat, to.lng);
  const dist = a.distanceTo(b);
  const lift = R + dist * 0.42;
  const mid1 = a.clone().lerp(b, 0.25).normalize().multiplyScalar(lift);
  const mid2 = a.clone().lerp(b, 0.75).normalize().multiplyScalar(lift);
  const curve = new THREE.CubicBezierCurve3(a, mid1, mid2, b);
  const geo = new THREE.TubeGeometry(curve, 96, 0.0065, 6, false);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uOffset: { value: Math.random() },
      uColor: { value: new THREE.Color("#5eead4") },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOffset;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float head = fract(uTime * 0.22 + uOffset) * 1.6 - 0.3;
        float trail = smoothstep(head - 0.35, head, vUv.x) * step(vUv.x, head);
        float base = 0.14;
        float glow = max(base, trail);
        gl_FragColor = vec4(mix(uColor, vec3(1.0), trail * 0.5), glow);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

function makeMarker(city, color) {
  const group = new THREE.Group();
  const p = toVec(city.lat, city.lng, R * 1.004);
  group.position.copy(p);
  group.lookAt(p.clone().multiplyScalar(2));
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true })
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.037, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  group.add(dot, ring);
  group.userData = { ring, phase: Math.random() };
  return group;
}

export function createGlobe(canvas, labelsEl) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 4.6);

  const globe = new THREE.Group();
  scene.add(globe);

  // Dark core hides the dots on the far side and gives the globe some body.
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.995, 64, 64),
    new THREE.MeshBasicMaterial({ color: "#0c1018", transparent: true, opacity: 0.92 })
  );
  globe.add(core);

  const grid = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.001, 24, 16)),
    new THREE.LineBasicMaterial({ color: "#5eead4", transparent: true, opacity: 0.045 })
  );
  globe.add(grid);

  const dots = makeDots();
  globe.add(dots);
  scene.add(makeAtmosphere());

  const arcs = CITIES.map((c) => makeArc(HOME, c));
  arcs.forEach((a) => globe.add(a));

  const markers = [makeMarker(HOME, "#fbbf24"), ...CITIES.map((c) => makeMarker(c, "#5eead4"))];
  markers.forEach((m) => globe.add(m));

  // HTML labels that follow the markers.
  const labelData = [HOME, ...CITIES].map((c, i) => {
    const el = document.createElement("span");
    el.className = "globe-label" + (i === 0 ? " globe-label--home" : "") + (c.below ? " globe-label--below" : "");
    el.textContent = c.label;
    labelsEl.appendChild(el);
    return { el, city: c, marker: markers[i], local: toVec(c.lat, c.lng, R * 1.02) };
  });

  // Rotation that brings a lat/lng to the front of the globe.
  const facing = (lat, lng) => ({ x: THREE.MathUtils.clamp(lat * DEG, -0.6, 1.1), y: -(lng + 90) * DEG });

  // Start facing the North Atlantic so Nepal and North America sit on either limb.
  const base = facing(32, 20);
  const rot = { x: base.x, y: base.y };
  let focus = null;
  let focusHold = 0;
  let active = null;
  const shortest = (d) => {
    const twoPi = Math.PI * 2;
    return ((((d + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
  };
  const vel = { x: 0, y: 0 };
  let dragging = false;
  let last = { x: 0, y: 0 };
  let idle = 0;
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    last = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    focus = null;
    vel.y = dx * 0.006;
    vel.x = dy * 0.004;
    rot.y += vel.y;
    rot.x = THREE.MathUtils.clamp(rot.x + vel.x, -0.6, 1.1);
    idle = 0;
  });
  const end = () => {
    dragging = false;
    canvas.classList.remove("is-dragging");
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  window.addEventListener("pointermove", (e) => {
    parallax.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    parallax.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dots.material.uniforms.uSize.value = 2.6 * Math.min(window.devicePixelRatio, 2) * (h / 700);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const normal = new THREE.Vector3();

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    const t = clock.elapsedTime;

    if (focus) {
      // Fly to a chosen city along the shortest path, hold, then resume spinning.
      const k = 1 - Math.exp(-dt * 3.2);
      rot.y += shortest(focus.y - rot.y) * k;
      rot.x += (focus.x - rot.x) * k;
      focusHold -= dt;
      if (focusHold <= 0) focus = null;
    } else if (!dragging) {
      idle += dt;
      rot.y += vel.y;
      rot.x = THREE.MathUtils.clamp(rot.x + vel.x, -0.6, 1.1);
      vel.x *= 0.92;
      vel.y *= 0.95;
      if (idle > 2.5) {
        // Slow continuous spin so every hiring route comes into view.
        const k = 1 - Math.exp(-dt * 0.6);
        rot.y += dt * 0.14 * Math.min(1, (idle - 2.5) / 2);
        rot.x += (base.x - rot.x) * k;
      }
    }

    parallax.x += (parallax.tx - parallax.x) * 0.05;
    parallax.y += (parallax.ty - parallax.y) * 0.05;
    globe.rotation.set(rot.x + parallax.y * 0.06, rot.y + parallax.x * 0.12, 0);

    dots.material.uniforms.uTime.value = t;
    arcs.forEach((a) => (a.material.uniforms.uTime.value = t));
    markers.forEach((m) => {
      const p = (t * 0.7 + m.userData.phase) % 1;
      const boost = m === active ? 1.8 : 1;
      m.userData.ring.scale.setScalar((1 + p * 1.8) * boost);
      m.userData.ring.material.opacity = 1 - p;
    });

    renderer.render(scene, camera);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    globe.updateMatrixWorld();
    const left = canvas.getBoundingClientRect().left;
    labelData.forEach(({ el, local }) => {
      tmp.copy(local).applyMatrix4(globe.matrixWorld);
      normal.copy(tmp).normalize();
      const towardCam = normal.dot(tmp.clone().sub(camera.position).normalize().negate());
      tmp.project(camera);
      const x = ((tmp.x + 1) / 2) * w;
      const y = ((1 - tmp.y) / 2) * h;
      const flip = left + x + el.offsetWidth + 24 > window.innerWidth;
      el.style.transform = `translate(${flip ? x - el.offsetWidth - 24 : x}px, ${y}px)`;
      el.style.opacity = towardCam > 0.15 ? Math.min(1, (towardCam - 0.15) * 5) : 0;
    });
  }
  frame();

  return {
    flyTo(name) {
      const entry = labelData.find((l) => l.city.name === name);
      if (!entry) return;
      // Land the city just right of centre so it isn't hidden behind the portrait.
      const f = facing(entry.city.lat, entry.city.lng);
      focus = { x: THREE.MathUtils.clamp(f.x - 0.12, -0.6, 1.1), y: f.y + 0.62 };
      focusHold = 5;
      idle = 0;
      vel.x = vel.y = 0;
      active = entry.marker;
      labelData.forEach((l) => l.el.classList.toggle("is-active", l === entry));
    },
  };
}
