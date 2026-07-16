import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
for (const dir of [ROOT, join(ROOT, 'fonts')]) {
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir)) {
    if (!/\.(ttf|otf)$/i.test(f)) continue
    try { GlobalFonts.registerFromPath(join(dir, f)) } catch {}
  }
}

export class CaptchaGenerator {
  async generate(text, opts = {}) {
    const w = Number(opts?.width) || 1800
    const h = Number(opts?.height) || 400
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)

    const raw = String(text == null ? 'X' : text)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() || 'X'

    let fontSize = Math.max(20, Math.round(500 * (w / 3200)))
    ctx.font = `bold ${fontSize}px Orbitron, "Noto Sans JP", system-ui, sans-serif`
    let mw = ctx.measureText(raw).width || 0
    const maxW = w * 0.35
    while (fontSize > 20 && mw > maxW) {
      fontSize -= 3
      ctx.font = `bold ${fontSize}px Orbitron, "Noto Sans JP", system-ui, sans-serif`
      mw = ctx.measureText(raw).width || 0
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffe066'
    ctx.fillText(raw, w / 2, h / 2)

    return canvas.toBuffer('image/png')
  }
}
