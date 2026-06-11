import { CanvasTexture, SRGBColorSpace } from 'three'

type Stop = readonly [number, string]

function radialTexture(size: number, stops: readonly Stop[]): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const half = size / 2
    const g = ctx.createRadialGradient(half, half, 0, half, half, half)
    for (const [offset, color] of stops) g.addColorStop(offset, color)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Warm star halo — bridges the corona shell into bloom. */
export function makeHaloTexture(): CanvasTexture {
  return radialTexture(256, [
    [0, 'rgba(255, 214, 140, 0.6)'],
    [0.3, 'rgba(255, 170, 70, 0.34)'],
    [0.6, 'rgba(255, 120, 35, 0.13)'],
    [1, 'rgba(255, 90, 20, 0)'],
  ])
}

/** Neutral white radial glow — tint via material color. */
export function makeGlowTexture(): CanvasTexture {
  return radialTexture(128, [
    [0, 'rgba(255, 255, 255, 0.9)'],
    [0.35, 'rgba(255, 255, 255, 0.32)'],
    [0.7, 'rgba(255, 255, 255, 0.08)'],
    [1, 'rgba(255, 255, 255, 0)'],
  ])
}

/** Anamorphic streak for the lens flare — a thin horizontal gaussian. */
export function makeStreakTexture(): CanvasTexture {
  const w = 512
  const h = 64
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = Math.abs(x - w / 2) / (w / 2)
        const dy = (y - h / 2) / (h / 2)
        const v = Math.exp(-dx * 5.5) * Math.exp(-dy * dy * 18)
        const i = (y * w + x) * 4
        img.data[i] = 200 * v + 55 * v * v
        img.data[i + 1] = 215 * v + 40 * v * v
        img.data[i + 2] = 255 * v
        img.data[i + 3] = 255 * v
      }
    }
    ctx.putImageData(img, 0, 0)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
