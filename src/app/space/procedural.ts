// Texturas procedurales dibujadas en canvas: no hace falta ninguna imagen externa.
export type RGB = [number, number, number];
export type PlanetId = 'sun' | 'mercury' | 'venus' | 'earth' | 'moon' | 'mars' | 'jupiter' | 'saturn' | 'neptune';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (t: number) => t * t * (3 - 2 * t);

const hash = (x: number, y: number, seed: number): number => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 144665);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

function vnoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
  const w = (i: number) => ((i % period) + period) % period; // se repite en horizontal: sin costura en la esfera
  const a = hash(w(xi), yi, seed), b = hash(w(xi + 1), yi, seed);
  const c = hash(w(xi), yi + 1, seed), d = hash(w(xi + 1), yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

/** Ruido fractal en [0,1]; `base` debe ser un entero. */
export function fbm(u: number, v: number, base: number, oct: number, seed: number): number {
  let sum = 0, amp = 0.5, norm = 0, f = base;
  for (let o = 0; o < oct; o++) {
    sum += amp * vnoise(u * f, (v * f) / 2, f, seed + o * 7);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

function paint(w: number, h: number, fn: (u: number, v: number) => RGB): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x / w, y / h);
      const i = (y * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function planetTexture(id: PlanetId): HTMLCanvasElement {
  const W = 512, H = 256;
  switch (id) {
    case 'earth':
      return paint(W, H, (u, v) => {
        const h = fbm(u, v, 4, 6, 11), lat = Math.abs(v - 0.5) * 2;
        let c: RGB;
        if (h < 0.54) c = mix([6, 24, 68], [30, 100, 170], clamp(h / 0.54));
        else {
          const t = (h - 0.54) / 0.46;
          c = t < 0.3 ? mix([40, 105, 45], [100, 135, 62], t / 0.3) : mix([100, 135, 62], [125, 105, 75], (t - 0.3) / 0.7);
        }
        if (lat > 0.88 - h * 0.1) c = mix(c, [240, 246, 252], 0.92); // hielo polar
        const cloud = clamp((fbm(u, v, 6, 5, 23) - 0.52) * 3.4);
        return mix(c, [255, 255, 255], cloud * 0.78);
      });
    case 'mercury':
      return paint(W, H, (u, v) => {
        const n = fbm(u, v, 8, 6, 3), cr = fbm(u, v, 24, 2, 5);
        const g = 70 + n * 100 - (cr > 0.68 ? 28 : 0);
        return [g * 1.04, g * 0.98, g * 0.92];
      });
    case 'moon':
      return paint(W, H, (u, v) => {
        const n = fbm(u, v, 6, 6, 4), maria = fbm(u, v, 3, 3, 8) < 0.45 ? 0.62 : 1;
        const g = (75 + n * 100) * maria;
        return [g, g, g * 0.97];
      });
    case 'venus':
      return paint(W, H, (u, v) => {
        const w = fbm(u + fbm(u, v, 3, 3, 7) * 0.12, v, 5, 5, 9);
        return mix([238, 208, 148], [196, 134, 66], clamp((w - 0.3) * 2));
      });
    case 'mars':
      return paint(W, H, (u, v) => {
        const n = fbm(u, v, 5, 6, 5), dark = fbm(u, v, 3, 4, 13) > 0.56 ? 0.72 : 1;
        let c = mix([148, 66, 38], [212, 120, 72], n);
        c = [c[0] * dark, c[1] * dark, c[2] * dark];
        return Math.abs(v - 0.5) * 2 > 0.94 ? mix(c, [245, 245, 250], 0.85) : c;
      });
    case 'jupiter':
      return paint(W, H, (u, v) => {
        const warp = (fbm(u, v, 4, 4, 6) - 0.5) * 0.08, n = fbm(u, v, 10, 4, 2);
        const band = Math.sin((v + warp) * Math.PI * 9) * 0.5 + 0.5;
        let c = mix([226, 196, 150], [150, 98, 66], clamp(band * 0.75 + (n - 0.5) * 0.5));
        const dx = (u - 0.3) * 2.4, dy = (v - 0.64) * 5.5, d = Math.hypot(dx, dy); // Gran Mancha Roja
        if (d < 0.4) c = mix(c, [186, 78, 52], (1 - d / 0.4) * 0.88);
        return c;
      });
    case 'saturn':
      return paint(W, H, (u, v) => {
        const band = Math.sin((v + (fbm(u, v, 4, 3, 4) - 0.5) * 0.04) * Math.PI * 14) * 0.5 + 0.5;
        return mix([232, 212, 160], [196, 168, 112], band * 0.7 + (fbm(u, v, 8, 3, 9) - 0.5) * 0.3);
      });
    case 'neptune':
      return paint(W, H, (u, v) => {
        const band = Math.sin(v * Math.PI * 7 + fbm(u, v, 4, 3, 3) * 2) * 0.5 + 0.5;
        return mix([30, 62, 170], [74, 122, 230], band * 0.6 + (fbm(u, v, 6, 4, 5) - 0.5) * 0.5);
      });
    default: // sol
      return paint(W, H, (u, v) => {
        const n = fbm(u, v, 8, 5, 3), s = fbm(u, v, 16, 3, 9);
        return mix([255, 110, 18], [255, 236, 140], clamp(n * 1.3 + (s - 0.5) * 0.4));
      });
  }
}

/** Anillos de Saturno: tira horizontal (el eje u va del borde interior al exterior). */
export function ringTexture(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 4;
  const ctx = c.getContext('2d')!;
  for (let x = 0; x < 512; x++) {
    const t = x / 512;
    let a = 0.35 + 0.5 * vnoise(t * 48, 0.5, 48, 7);
    if (t > 0.56 && t < 0.61) a *= 0.08; // división de Cassini
    if (t > 0.82) a *= 0.5;
    if (t < 0.06 || t > 0.97) a *= 0.2;
    ctx.fillStyle = `rgba(226,206,164,${a})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  return c;
}

/** Disco de acreción: u = ángulo, v = distancia (0 = borde interior, el más caliente). */
export function diskTexture(): HTMLCanvasElement {
  return paint(512, 64, (u, v) => {
    const n = fbm(u, v * 3, 16, 4, 31);
    const k = clamp(Math.pow(1 - v, 1.5) * (0.5 + n * 1.1)) * clamp(Math.min(v * 10, (1 - v) * 3));
    const c = mix([255, 244, 226], [255, 104, 22], Math.pow(v, 0.55));
    return [c[0] * k, c[1] * k, c[2] * k];
  });
}

export function nebulaTexture(c1: RGB, c2: RGB, seed: number): HTMLCanvasElement {
  return paint(256, 256, (u, v) => {
    const n = fbm(u, v * 2, 3, 6, seed), m = fbm(u, v * 2, 4, 4, seed + 50);
    const fall = Math.pow(clamp(1 - Math.hypot(u - 0.5, v - 0.5) * 2), 1.4);
    const k = fall * clamp((n - 0.36) * 2.4);
    const c = mix(c1, c2, m);
    return [c[0] * k, c[1] * k, c[2] * k];
  });
}

export function glowTexture(stops: [number, string][], size = 128): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}