import { createCanvas } from '@napi-rs/canvas'

export class CaptchaGenerator {
  async generate(text, opts = {}) {
    const { width = 1800, height = 400 } = opts
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    const raw = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

    let fontSize = Math.max(20, Math.round(500 * (width / 3200)))
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`
    let mw = ctx.measureText(raw).width
    const maxW = width * 0.35
    while (fontSize > 20 && mw > maxW) {
      fontSize -= 3
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`
      mw = ctx.measureText(raw).width
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffe066'
    ctx.fillText(raw, width / 2, height / 2)

    return canvas.toBuffer('image/png')
  }
}
