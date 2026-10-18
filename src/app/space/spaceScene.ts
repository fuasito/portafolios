import * as THREE from 'three';
import { PlanetId, diskTexture, glowTexture, nebulaTexture, planetTexture, ringTexture } from './procedural';

// Distancias y tamaños comprimidos (no están a escala real, o no cabrían en pantalla).
const DEFS: { id: PlanetId; x: number; r: number; spin: number; bump?: number }[] = [
  { id: 'sun', x: 0, r: 14, spin: 0.02 },
  { id: 'mercury', x: 48, r: 1.8, spin: 0.05, bump: 1.2 },
  { id: 'venus', x: 84, r: 3.6, spin: -0.03 },
  { id: 'earth', x: 124, r: 3.8, spin: 10.12 },
  { id: 'mars', x: 166, r: 2.4, spin: 0.1, bump: 1.5 },
  { id: 'jupiter', x: 235, r: 10, spin: 0.2 },
  { id: 'saturn', x: 320, r: 8.5, spin: 0.18 },
  { id: 'neptune', x: 400, r: 4.6, spin: 0.14 },
];

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (t: number) => t * t * (3 - 2 * t);
const tick = () => new Promise<void>(r => setTimeout(r));

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Reasigna las UV de un anillo: 'polar' (u = ángulo, v = radio) o 'radial' (u = radio). */
function ringUV(geo: THREE.RingGeometry, inner: number, outer: number, mode: 'polar' | 'radial') {
  const pos = geo.attributes['position'], uv = geo.attributes['uv'], p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const k = (Math.hypot(p.x, p.y) - inner) / (outer - inner);
    if (mode === 'radial') uv.setXY(i, k, 0.5);
    else uv.setXY(i, (Math.atan2(p.y, p.x) + Math.PI) / (2 * Math.PI), 1 - k);
  }
}

function glow(stops: [number, string][], size: number, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex(glowTexture(stops)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity,
  }));
  s.scale.set(size, size, 1);
  return s;
}

export class SpaceScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
  private bodies = new Map<string, { pos: THREE.Vector3; r: number }>();
  private spins: { obj: THREE.Object3D; speed: number }[] = [];
  private moonPivot = new THREE.Group();
  private pulsarCore!: THREE.Sprite;
  private quasarCore!: THREE.Sprite;
  private comets: { group: THREE.Group; start: THREE.Vector3; end: THREE.Vector3; duration: number; elapsed: number; phase: number }[] = [];
  private blackDisk!: THREE.Mesh;
  private camPos = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private first = true;
  private raf = 0;
  private last = performance.now();
  private time = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private onResize = () => this.resize();

  private constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setClearColor(0x000000);
  }

  /** Crea la escena por fases para no bloquear la página mientras se generan las texturas. */
  static async create(canvas: HTMLCanvasElement): Promise<SpaceScene> {
    const s = new SpaceScene(canvas);
    s.resize();
    window.addEventListener('resize', s.onResize);
    s.buildSky(); await tick();
    s.buildBodies(); await tick();
    s.buildExotic();
    s.loop();
    return s;
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- Cielo: estrellas y nebulosas ----------
  private buildSky() {
    const star = tex(glowTexture([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']], 64));
    const layer = (n: number, place: (i: number, out: number[]) => void, size: number) => {
      const pos: number[] = [], col: number[] = [];
      for (let i = 0; i < n; i++) {
        place(i, pos);
        const k = Math.random(), c = k < 0.6 ? [1, 1, 1] : k < 0.8 ? [0.7, 0.8, 1] : k < 0.93 ? [1, 0.9, 0.7] : [1, 0.68, 0.55];
        const b = 0.45 + Math.random() * 0.55;
        col.push(c[0] * b, c[1] * b, c[2] * b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({
        size, sizeAttenuation: false, map: star, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })));
    };
    // estrellas lejanas (casi no se mueven) y cercanas (dan sensación de viaje)
    layer(5500, (_i, o) => {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = 1500 + Math.random() * 800;
      o.push(200 + r * s * Math.cos(t), r * u, r * s * Math.sin(t));
    }, 2.4);
    layer(900, (_i, o) => o.push(-100 + Math.random() * 620, (Math.random() - 0.5) * 520, -150 + (Math.random() - 0.5) * 700), 3.4);

    const neb: [number, number, number, [number, number, number], [number, number, number], number][] = [
      [-60, 130, -950, [120, 60, 200], [60, 90, 255], 1], [160, -160, -1050, [255, 80, 140], [140, 60, 220], 2],
      [310, 170, -850, [40, 160, 200], [80, 80, 255], 3], [430, -90, -950, [255, 130, 70], [220, 60, 120], 4],
      [30, -210, -1150, [70, 120, 255], [160, 80, 220], 5],
    ];
    for (const [x, y, z, c1, c2, seed] of neb) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex(nebulaTexture(c1, c2, seed * 13)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6,
      }));
      s.position.set(x, y, z);
      s.scale.set(1150, 1150, 1);
      this.scene.add(s);
    }
  }

  // ---------- Sol, planetas y Luna ----------
  private buildBodies() {
    this.scene.add(new THREE.AmbientLight(0x3a4a77, 0.9));
    const sun = new THREE.PointLight(0xfff1dc, 5, 0, 0); // sin atenuación: ilumina todo el recorrido
    this.scene.add(sun);

    for (const d of DEFS) {
      const map = tex(planetTexture(d.id));
      const mat = d.id === 'sun'
        ? new THREE.MeshBasicMaterial({ map, toneMapped: false })
        : new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0, bumpMap: d.bump ? map : null, bumpScale: d.bump ?? 0 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.r, 64, 48), mat);
      const holder = new THREE.Group();
      holder.position.set(d.x, 0, 0);
      holder.rotation.z = d.id === 'saturn' ? 0.2 : 0.14;
      if (d.id === 'saturn') holder.rotation.x = 0.42; // inclinado hacia la cámara para ver los anillos
      holder.add(mesh);
      this.scene.add(holder);
      this.spins.push({ obj: mesh, speed: d.spin });
      this.bodies.set(d.id, { pos: holder.position, r: d.r });

      if (d.id === 'sun') {
        holder.add(glow([[0, 'rgba(255,225,150,1)'], [0.3, 'rgba(255,150,40,0.55)'], [1, 'rgba(255,90,0,0)']], d.r * 9));
        holder.add(glow([[0, 'rgba(255,180,80,0.5)'], [1, 'rgba(255,100,20,0)']], d.r * 20, 0.5));
      }
      if (d.id === 'earth' || d.id === 'venus') {
        const atm = new THREE.Mesh(new THREE.SphereGeometry(d.r * 1.07, 48, 32), new THREE.MeshBasicMaterial({
          color: d.id === 'earth' ? 0x4f9bff : 0xffd9a0, transparent: true, opacity: 0.16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        holder.add(atm);
      }
      if (d.id === 'saturn') {
        const inner = d.r * 1.35, outer = d.r * 2.45, g = new THREE.RingGeometry(inner, outer, 160, 1);
        ringUV(g, inner, outer, 'radial');
        const ring = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
          map: tex(ringTexture()), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: 0xe8e0d0,
        }));
        ring.rotation.x = -Math.PI / 2;
        holder.add(ring);
      }
      if (d.id === 'earth') {
        this.moonPivot.position.copy(holder.position);
        this.moonPivot.rotation.x = 0.18;
        this.moonPivot.rotation.y = 2.2;
        const moon = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 32), new THREE.MeshStandardMaterial({
          map: tex(planetTexture('moon')), roughness: 1, bumpMap: tex(planetTexture('moon')), bumpScale: 1.2,
        }));
        moon.position.set(9, 0, 0);
        this.moonPivot.add(moon);
        this.scene.add(this.moonPivot);
        this.spins.push({ obj: moon, speed: 1.05 });
      }
    }
  }

  // ---------- Objetos exóticos: agujero negro, púlsar y cuásar ----------
  private buildExotic() {
    // Agujero negro con disco de acreción
    const bh = new THREE.Group();
    bh.position.set(290, 70, -260);
    bh.add(new THREE.Mesh(new THREE.SphereGeometry(9, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })));
    const diskMat = new THREE.MeshBasicMaterial({
      map: tex(diskTexture()), transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const gd = new THREE.RingGeometry(12, 30, 128, 1);
    ringUV(gd, 12, 30, 'polar');
    this.blackDisk = new THREE.Mesh(gd, diskMat);
    this.blackDisk.rotation.x = -1.35;
    bh.add(this.blackDisk);
    const gl = new THREE.RingGeometry(9.4, 17, 96, 1); // arco de luz curvada por detrás del agujero
    ringUV(gl, 9.4, 17, 'polar');
    const lens = new THREE.Mesh(gl, diskMat.clone());
    (lens.material as THREE.MeshBasicMaterial).opacity = 0.55;
    bh.add(lens);
    const halo = glow([[0, 'rgba(255,170,90,0.45)'], [1, 'rgba(255,100,20,0)']], 95, 0.7);
    halo.position.z = -2;
    bh.add(halo);
    this.scene.add(bh);

    // Púlsar y cuásar: núcleos lejanos
    const pulsar = new THREE.Group();
    pulsar.position.set(140, 90, -320);
    this.pulsarCore = glow([[0, 'rgba(230,245,255,1)'], [0.24, 'rgba(120,175,255,0.55)'], [1, 'rgba(60,100,255,0)']], 20);
    pulsar.add(this.pulsarCore);
    pulsar.add(glow([[0, 'rgba(170,205,255,0.24)'], [1, 'rgba(90,120,255,0)']], 52, 0.7));
    this.scene.add(pulsar);

    const quasar = new THREE.Group();
    quasar.position.set(-170, -40, -520);
    this.quasarCore = glow([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(160,210,255,0.7)'], [1, 'rgba(90,120,255,0)']], 42);
    quasar.add(this.quasarCore, glow([[0, 'rgba(170,110,255,0.3)'], [1, 'rgba(120,60,255,0)']], 125, 0.6));
    this.scene.add(quasar);

    // Cometas: órbitas visuales lentas, con diferentes profundidades, tamaños y colores.
    // Las trayectorias atraviesan el fondo y no giran sobre sí mismas.
    this.createComet(new THREE.Vector3(-520, 230, -760), new THREE.Vector3(520, -180, -900), 24, 0, 0x9fdcff, 34, 5.8, 0.28);
    this.createComet(new THREE.Vector3(500, 250, -1120), new THREE.Vector3(-520, -190, -980), 31, 13.5, 0xffd5a0, 28, 5.2, 0.24);
    this.createComet(new THREE.Vector3(-460, -100, -640), new THREE.Vector3(460, 190, -820), 27, 8, 0xd5b6ff, 24, 4.8, 0.2);
    this.createComet(new THREE.Vector3(430, -210, -1300), new THREE.Vector3(-500, 120, -1180), 35, 21, 0x9fffe0, 32, 5.2, 0.22);
    this.createComet(new THREE.Vector3(-300, 280, -1450), new THREE.Vector3(480, -70, -1320), 38, 28, 0xffb7d5, 26, 4.5, 0.18);

    // Estrellas fugaces: trazos más cortos y rápidos, separados de los cometas principales.
    this.createComet(new THREE.Vector3(-520, 150, -520), new THREE.Vector3(180, -180, -650), 5.2, 1.2, 0xffffff, 10, 1.9, 0.16);
    this.createComet(new THREE.Vector3(500, 130, -700), new THREE.Vector3(-180, -160, -760), 4.4, 3.4, 0xb9d8ff, 8, 1.7, 0.14);
    this.createComet(new THREE.Vector3(-350, -190, -880), new THREE.Vector3(360, 120, -920), 6.1, 4.7, 0xffe0b0, 9, 1.8, 0.13);
    this.createComet(new THREE.Vector3(400, 240, -1050), new THREE.Vector3(-260, -80, -990), 5.7, 2.6, 0xe4c5ff, 8, 1.6, 0.13);
    this.createComet(new THREE.Vector3(-500, 40, -1180), new THREE.Vector3(240, -230, -1100), 4.8, 6.5, 0xc9fff4, 7, 1.6, 0.12);
    this.createComet(new THREE.Vector3(480, -120, -560), new THREE.Vector3(-200, 180, -680), 5.5, 8.2, 0xffffff, 9, 1.7, 0.14);
    this.createComet(new THREE.Vector3(-250, 260, -1250), new THREE.Vector3(420, 30, -1200), 6.4, 10.1, 0xffc8a0, 8, 1.6, 0.12);
    this.createComet(new THREE.Vector3(520, 20, -900), new THREE.Vector3(-320, 220, -1000), 5.1, 11.4, 0xaecbff, 8, 1.7, 0.13);
  }

  private createComet(
    start: THREE.Vector3,
    end: THREE.Vector3,
    duration: number,
    phase: number,
    color: number,
    tailLength = 30,
    headSize = 5.5,
    tailOpacity = 0.28,
  ) {
    const group = new THREE.Group();
    const direction = end.clone().sub(start).normalize();
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(1.25, tailLength, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: tailOpacity, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    // El cono apunta hacia atrás; el extremo estrecho queda junto al núcleo.
    tail.position.y = -tailLength * 0.5;
    tail.rotation.x = Math.PI;
    group.add(tail);

    const head = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex(glowTexture([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(220,240,255,0.95)'], [0.48, 'rgba(150,205,255,0.35)'], [1, 'rgba(100,170,255,0)']], 64)),
      color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    head.scale.set(headSize, headSize, 1);
    group.add(head);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.scene.add(group);
    group.position.copy(start);
    this.comets.push({ group, start, end, duration, elapsed: -phase, phase });
  }

  private updateComets(dt: number) {
    for (const comet of this.comets) {
      comet.elapsed += dt;
      const progress = ((comet.elapsed % comet.duration) + comet.duration) % comet.duration / comet.duration;
      // Entrada y salida suaves: evita que el cometa aparezca/desaparezca de golpe.
      const fadeIn = clamp(progress / 0.12, 0, 1);
      const fadeOut = clamp((1 - progress) / 0.12, 0, 1);
      const fade = Math.min(fadeIn, fadeOut);
      const eased = smooth(progress);
      comet.group.position.copy(comet.start).lerp(comet.end, eased);
      comet.group.visible = fade > 0.01;
      comet.group.traverse(obj => {
        const material = (obj as THREE.Sprite | THREE.Mesh).material;
        if (material) {
          const materials = Array.isArray(material) ? material : [material];
          for (const m of materials) {
            if ('opacity' in m) {
              const baseOpacity = (m.userData['baseOpacity'] as number | undefined) ?? m.opacity;
              m.userData['baseOpacity'] = baseOpacity;
              m.opacity = baseOpacity * fade;
            }
          }
        }
      });
    }
  }

  // ---------- Cámara guiada por el scroll ----------
  private pose(id: string) {
    const b = this.bodies.get(id) ?? this.bodies.get('sun')!;

    // Distancia base: permite conservar el encuadre cinematográfico.
    const d = 58;

    const halfW =
      Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
      d * this.camera.aspect;

    const shift = halfW * (this.camera.aspect > 1.1 ? 0.5 : 0.15);

    return {
      pos: new THREE.Vector3(
        b.pos.x - shift,
        b.r * 0.35 + 1,
        b.pos.z + d
      ),
      target: new THREE.Vector3(
        b.pos.x - shift,
        b.r * 0.1,
        b.pos.z
      )
    };
  }


  
  private updateCamera(dt: number) {
    const stops = Array.from(
      document.querySelectorAll<HTMLElement>('.stop[data-planet]')
    );

    if (!stops.length) return;

    const y = window.scrollY + window.innerHeight * 0.5;

    const centers = stops.map(e => {
      const r = e.getBoundingClientRect();
      return r.top + window.scrollY + r.height / 2;
    });

    let i = 0;
    while (i < stops.length - 1 && y >= centers[i + 1]) i++;

    const next = Math.min(i + 1, stops.length - 1);
    const rawT = i < stops.length - 1 ? clamp((y - centers[i]) / Math.max(1, centers[next] - centers[i]),0,1) : 0;

    const t = smooth(rawT);

    const a = this.pose(stops[i].dataset['planet']!);
    const b = this.pose(stops[next].dataset['planet']!);

    const pos = a.pos.clone().lerp(b.pos, t);
    const target = a.target.clone().lerp(b.target, t);

    // Zoom cinematográfico: acercamiento y alejamiento gradual.
    // El planeta entrante se aproxima y después recupera distancia.
    const zoomAmount = Math.sin(Math.PI * rawT);
    const zoomDistance = 30 * zoomAmount;

    const viewDirection = pos.clone().sub(target).normalize();
    pos.addScaledVector(viewDirection, -zoomDistance);

    if (this.first || this.reduced) {
      this.camPos.copy(pos);
      this.camTarget.copy(target);
      this.first = false;
    } else {
      const k = 1 - Math.exp(-dt * 3.5);
      this.camPos.lerp(pos, k);
      this.camTarget.lerp(target, k);
    }

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }


  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now(), dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now; this.time += dt;
    if (!this.reduced) {
      for (const s of this.spins) s.obj.rotation.y += dt * s.speed;
      this.moonPivot.rotation.y += dt * 0.12;
      this.blackDisk.rotation.z += dt * 0.35;
      const beat = Math.pow(Math.abs(Math.sin(this.time * 3)), 8);
      this.pulsarCore.material.opacity = 0.55 + 0.45 * beat;
      this.quasarCore.material.opacity = 0.82 + 0.12 * Math.sin(this.time * 0.65);
      this.updateComets(dt);
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mt of mats) { (mt as THREE.MeshBasicMaterial).map?.dispose(); mt.dispose(); }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
