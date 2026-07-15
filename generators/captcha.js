import { createCanvas } from '@napi-rs/canvas'

export class CaptchaGenerator {
  async generate(text, opts = {}) {
    const { width = 1800, height = 400 } = opts
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    const raw = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

    let fontSize = 500 * (width / 3200)
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`
    let mw = ctx.measureText(raw).width
    while ((!mw || mw > width * 0.35) && fontSize > 10) {
      fontSize -= 3
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`
      mw = ctx.measureText(raw).width
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffe066'
    ctx.fillText(raw, width / 2, height / 2)

    const barHeight = Math.round(fontSize * 0.18)
    const barMargin = fontSize * 0.5 + (mw || 0) / 2 + 30
    const barLength = Math.max(width * 0.28, 180)

    ctx.strokeStyle = '#ffe066'
    ctx.lineWidth = barHeight
    ctx.lineCap = 'round'
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
