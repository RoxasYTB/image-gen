import { createCanvas } from '@napi-rs/canvas'

export class CaptchaGenerator {
  async generate(text, opts = {}) {
    const { reverse = false, width = 1800, height = 400 } = opts
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, width, height)

    const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0400-\u04FF]/.test(text)
    const fontFamily = hasCJK ? 'Noto Sans JP Bold' : 'Orbitron Bold'
    const raw = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

    const maxTextWidth = width * 0.35
    let fontSize = 500 * (width / 3200)
    ctx.font = `bold ${fontSize}px "${fontFamily}"`
    let metrics = ctx.measureText(raw)
    while (metrics.width > maxTextWidth && fontSize > 10) {
      fontSize -= 3
      ctx.font = `bold ${fontSize}px "${fontFamily}"`
      metrics = ctx.measureText(raw)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = '#ffe066'
    ctx.shadowColor = '#ffe066'
    ctx.shadowBlur = 32
    ctx.fillText(raw, width / 2, height / 2)
    ctx.shadowBlur = 0

    const barHeight = Math.round(fontSize * 0.18)
    const barMargin = fontSize * 0.5 + metrics.width / 2 + 30
    const barLength = Math.max(width * 0.28, 180)

    ctx.save()
    ctx.strokeStyle = '#ffe066'
    ctx.shadowColor = '#ffe066'
    ctx.shadowBlur = 18
    ctx.lineWidth = barHeight
    ctx.beginPath()
    ctx.moveTo(width / 2 - barMargin - barLength, height / 2)
    ctx.lineTo(width / 2 - barMargin, height / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(width / 2 + barMargin, height / 2)
    ctx.lineTo(width / 2 + barMargin + barLength, height / 2)
    ctx.stroke()
    ctx.restore()

    return canvas.toBuffer('image/png')
  }
}
