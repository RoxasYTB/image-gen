import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function ensureFonts() {
  for (const dir of [ROOT, join(ROOT, 'fonts')]) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!/\.(ttf|otf)$/i.test(f)) continue
      try { GlobalFonts.registerFromPath(join(dir, f)) } catch {}
    }
  }
}
ensureFonts()

function getFontFamily(text) {
  const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0400-\u04FF]/.test(text)
  return hasCJK ? '"Noto Sans JP Bold"' : '"Orbitron Bold"'
}

export class CaptchaGenerator {
  async generate(text, opts = {}) {
    const { width = 1800, height = 400 } = opts
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, width, height)

    const raw = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    const fontFamily = getFontFamily(raw)
    const maxTextWidth = width * 0.35

    let fontSize = 500 * (width / 3200)
    ctx.font = `bold ${fontSize}px ${fontFamily}`
    let mw = ctx.measureText(raw).width
    while ((!mw || mw > maxTextWidth) && fontSize > 10) {
      fontSize -= 3
      ctx.font = `bold ${fontSize}px ${fontFamily}`
      mw = ctx.measureText(raw).width
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#ffe066'
    for (let dx = -6; dx <= 6; dx += 4) {
      for (let dy = -6; dy <= 6; dy += 4) {
        ctx.fillText(raw, width / 2 + dx, height / 2 + dy)
      }
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffe066'
    ctx.fillText(raw, width / 2, height / 2)

    const barHeight = Math.round(fontSize * 0.18)
    const barMargin = fontSize * 0.5 + (mw || 0) / 2 + 30
    const barLength = Math.max(width * 0.28, 180)

    ctx.globalAlpha = 0.3
    ctx.strokeStyle = '#ffe066'
    ctx.lineWidth = barHeight
    for (let dx = -4; dx <= 4; dx += 4) {
      for (let dy = -4; dy <= 4; dy += 4) {
        ctx.beginPath()
        ctx.moveTo(width / 2 - barMargin - barLength + dx, height / 2 + dy)
        ctx.lineTo(width / 2 - barMargin + dx, height / 2 + dy)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(width / 2 + barMargin + dx, height / 2 + dy)
        ctx.lineTo(width / 2 + barMargin + barLength + dx, height / 2 + dy)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.moveTo(width / 2 - barMargin - barLength, height / 2)
    ctx.lineTo(width / 2 - barMargin, height / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(width / 2 + barMargin, height / 2)
    ctx.lineTo(width / 2 + barMargin + barLength, height / 2)
    ctx.stroke()

    return canvas.toBuffer('image/png')
  }
}
