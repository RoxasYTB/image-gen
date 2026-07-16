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

    const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0400-\u04FF]/.test(raw)
    const fontFamily = hasCJK ? '"Noto Sans JP"' : 'Orbitron'

    let fontSize = 500
    const maxTextWidth = w * 0.35
    ctx.font = `bold ${fontSize}px ${fontFamily}, system-ui, sans-serif`
    let mw = ctx.measureText(raw).width || 0
    while (mw > maxTextWidth && fontSize > 10) {
      fontSize -= 3
      ctx.font = `bold ${fontSize}px ${fontFamily}, system-ui, sans-serif`
      mw = ctx.measureText(raw).width || 0
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = '#ffe066'
    ctx.shadowColor = '#ffe066'
    ctx.shadowBlur = 32
    ctx.fillText(raw, w / 2, h / 2)
    ctx.shadowBlur = 0

    const barHeight = Math.round(fontSize * 0.18)
    const barMargin = fontSize * 0.5 + (mw || 0) / 2 + 30
    const barLength = Math.max(w * 0.28, 180)

    ctx.save()
    ctx.strokeStyle = '#ffe066'
    ctx.shadowColor = '#ffe066'
    ctx.shadowBlur = 18
    ctx.lineWidth = barHeight
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(w / 2 - barMargin - barLength, h / 2)
    ctx.lineTo(w / 2 - barMargin, h / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(w / 2 + barMargin, h / 2)
    ctx.lineTo(w / 2 + barMargin + barLength, h / 2)
    ctx.stroke()
    ctx.restore()

    return canvas.toBuffer('image/png')
  }
}
