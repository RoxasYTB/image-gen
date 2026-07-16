import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import * as fontkit from 'fontkit'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const FONT_REGISTRY = []
const CP_FAMILY_CACHE = new Map()
const GLYPH_FONT_CACHE = new Map()
const EMOJI_CACHE = new Map()
const EMOJI_CACHE_MAX = 200
const REMOTE_TIMEOUT = 4000

function loadImageTimeout(src, ms = REMOTE_TIMEOUT) {
  if (typeof src !== 'string' || !/^https?:\/\//i.test(src)) return loadImage(src)
  return new Promise((resolve, reject) => {
    let settled = false
    const t = setTimeout(() => { if (!settled) { settled = true; reject(new Error('timeout')) } }, ms)
    loadImage(src).then(img => { if (!settled) { settled = true; clearTimeout(t); resolve(img) } }, err => { if (!settled) { settled = true; clearTimeout(t); reject(err) } })
  })
}

function loadFontsForQuote() {
  const fontDir = join(ROOT, 'fonts')
  if (!existsSync(fontDir)) return
  for (const f of readdirSync(fontDir)) {
    if (!/\.(ttf|otf)$/i.test(f)) continue
    try {
      const font = fontkit.default.openSync ? fontkit.default.openSync(join(fontDir, f)) : fontkit.openSync(join(fontDir, f))
      FONT_REGISTRY.push({ family: font.familyName, font })
    } catch {}
  }
}

loadFontsForQuote()

const FAMILY_PRIORITY = ['Noto Sans', 'Noto Sans Math', 'Noto Sans Symbols2', 'Noto Sans Symbols', 'Noto Sans Georgian']

function familyForCodepoint(cp) {
  if (CP_FAMILY_CACHE.has(cp)) return CP_FAMILY_CACHE.get(cp)
  for (const name of FAMILY_PRIORITY) {
    const r = FONT_REGISTRY.find(x => x.family === name)
    if (!r) continue
    try { if (r.font.hasGlyphForCodePoint(cp)) { CP_FAMILY_CACHE.set(cp, name); return name } } catch {}
  }
  for (const r of FONT_REGISTRY) {
    if (FAMILY_PRIORITY.includes(r.family)) continue
    try { if (r.font.hasGlyphForCodePoint(cp)) { CP_FAMILY_CACHE.set(cp, r.family); return r.family } } catch {}
  }
  CP_FAMILY_CACHE.set(cp, null)
  return null
}

function familyForCluster(cluster) {
  const cps = Array.from(cluster).map(c => c.codePointAt(0))
  if (!cps.length) return null
  for (const name of FAMILY_PRIORITY) {
    const r = FONT_REGISTRY.find(x => x.family === name)
    if (!r) continue
    if (cps.every(cp => { try { return r.font.hasGlyphForCodePoint(cp) } catch { return false } })) return name
  }
  for (const r of FONT_REGISTRY) {
    if (FAMILY_PRIORITY.includes(r.family)) continue
    if (cps.every(cp => { try { return r.font.hasGlyphForCodePoint(cp) } catch { return false } })) return r.family
  }
  return null
}

let CHOSEN_FONT = 'Noto Sans'
const families = GlobalFonts.getFamilies ? GlobalFonts.getFamilies() : []
const names = Array.isArray(families) ? families.map(f => f.family) : []
if (names.some(n => /noto sans/i.test(n))) CHOSEN_FONT = names.find(n => /^noto sans$/i.test(n)) || 'Noto Sans'

const FONT_STACK = `"${CHOSEN_FONT}", "Noto Sans", "Noto Sans Math", "Noto Sans Symbols", "Noto Sans Symbols2", "Noto Sans Georgian", "Helvetica Neue", Helvetica, Arial, sans-serif`

function qfam(fam) { return fam && fam.includes(' ') ? `"${fam}"` : fam }
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null
function splitGraphemes(s) {
  if (!s) return ['']
  if (segmenter) return Array.from(segmenter.segment(s), seg => seg.segment)
  return Array.from(s)
}

function twemojiUrl(s) {
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${Array.from(s).map(c => c.codePointAt(0)).filter(cp => cp !== 0xfe0f).map(cp => cp.toString(16)).join('-')}.png`
}

export class QuoteGenerator {
  constructor(config = {}) {
    this.width = config.width || 1600
    this.height = config.height || 800
    this.fontSize = 70
    this.authorFontSize = 48
  }

  async generate({ avatarUrl, quote, author, username }) {
    const canvas = createCanvas(this.width, this.height)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, this.width, this.height)

    let avatar
    try {
      avatar = await loadImageTimeout(avatarUrl)
    } catch {
      try {
        avatar = await loadImage(join(ROOT, 'assets', 'fondu.png'))
      } catch {
        avatar = createCanvas(this.width / 2, this.height)
        const aCtx = avatar.getContext('2d')
        aCtx.fillStyle = '#222'
        aCtx.fillRect(0, 0, avatar.width, avatar.height)
      }
    }
    const avatarWidth = this.width / 2
    ctx.drawImage(avatar, 0, 0, avatarWidth, this.height)

    const imageData = ctx.getImageData(0, 0, avatarWidth, this.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const g = Math.min(255, (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) * 1.5)
      data[i] = g; data[i + 1] = g; data[i + 2] = g
    }
    ctx.putImageData(imageData, 0, 0)

    try {
      const fade = await loadImage(join(ROOT, 'assets', 'fondu.png'))
      ctx.drawImage(fade, 0, 0, this.width, this.height)
    } catch {}

    ctx.fillStyle = 'white'
    const marginX = 120
    const textAreaWidth = this.width / 2 - marginX * 2
    const textCenterX = this.width / 2 + marginX + textAreaWidth / 2
    const marginTop = this.height * 0.15
    const marginBottom = this.height * 0.25
    const availableHeight = this.height - marginTop - marginBottom

    let fontSize = this.fontSize
    const minFontSize = 20
    const wrapped = text => {
      ctx.font = `${fontSize}px ${FONT_STACK}`
      return this.wrapText(ctx, '\u201c' + text + '\u201d', textAreaWidth, marginTop + availableHeight / 2, textAreaWidth, fontSize * 0.9 + 10)
    }
    let lines = wrapped(quote)
    while (lines.lines.length * lines.lineHeight > availableHeight && fontSize > minFontSize) {
      fontSize -= 2
      lines = wrapped(quote)
    }

    ctx.font = `${fontSize}px ${FONT_STACK}`
    ctx.textAlign = 'center'
    const finalLines = this.wrapText(ctx, '\u201c' + quote + '\u201d', textAreaWidth, marginTop + availableHeight / 2, textAreaWidth, lines.lineHeight)

    for (let i = 0; i < finalLines.lines.length; i++) {
      await this.drawLine(ctx, finalLines.lines[i], textCenterX, finalLines.y + i * finalLines.lineHeight, fontSize, false)
    }

    const lastY = finalLines.y + (finalLines.lines.length - 1) * finalLines.lineHeight
    const authorText = `- ${author}`
    await this.drawLine(ctx, authorText, textCenterX, lastY + 120, Math.max(this.authorFontSize * Math.min(1, 750 / ctx.measureText(authorText).width), 10), false)

    if (username !== author) {
      ctx.fillStyle = '#AAAAAA'
      await this.drawLine(ctx, username, textCenterX, lastY + 180, Math.max(this.authorFontSize - 4 * Math.min(1, 750 / ctx.measureText(username).width), 10), false)
    }

    return canvas.toBuffer('image/png')
  }

  async drawLine(ctx, text, centerX, y, fontSize, bold) {
    const clusters = splitGraphemes(text)
    const weight = bold ? 'bold ' : ''

    const widths = await Promise.all(clusters.map(async cl => {
      if (/\p{Extended_Pictographic}/u.test(cl)) return fontSize
      const fam = familyForCluster(cl)
      if (fam) { ctx.font = `${weight}${fontSize}px ${qfam(fam)}`; return ctx.measureText(cl).width }
      let w = 0
      for (const ch of Array.from(cl)) {
        ctx.font = `${weight}${fontSize}px ${qfam(familyForCodepoint(ch.codePointAt(0)))}`
        w += ctx.measureText(ch).width
      }
      return w
    }))

    const total = widths.reduce((a, b) => a + b, 0)
    let cx = Math.round(centerX - total / 2)
    ctx.textAlign = 'left'

    for (let i = 0; i < clusters.length; i++) {
      const cl = clusters[i]
      const w = widths[i]
      if (/\p{Extended_Pictographic}/u.test(cl)) {
        try {
          const url = twemojiUrl(cl)
          let img = EMOJI_CACHE.get(url)
          if (!img) { img = await loadImageTimeout(url).catch(() => null); if (EMOJI_CACHE.size >= EMOJI_CACHE_MAX) EMOJI_CACHE.delete(EMOJI_CACHE.keys().next().value); EMOJI_CACHE.set(url, img) }
          if (img) { ctx.drawImage(img, cx, y - fontSize * 0.78, fontSize, fontSize); cx += w; continue }
        } catch {}
      }

      const chars = Array.from(cl)
      const clusterFam = familyForCluster(cl)
      if (clusterFam && chars.length > 1 && !/\p{M}/u.test(cl)) {
        ctx.font = `${weight}${fontSize}px ${qfam(clusterFam)}`
        ctx.fillText(cl, cx, y)
        cx += w
      } else {
        for (const ch of chars) {
          const fam = familyForCodepoint(ch.codePointAt(0))
          ctx.font = `${weight}${fontSize}px ${fam ? qfam(fam) : FONT_STACK}`
          ctx.fillText(ch, cx, y)
          cx += ctx.measureText(ch).width
        }
      }
    }
    ctx.textAlign = 'center'
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const paragraphs = text.split('\n')
    const allLines = []
    for (const para of paragraphs) {
      const words = para.split(' ')
      let line = ''
      for (const word of words) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > maxWidth && line) {
          allLines.push(line.trim())
          line = word + ' '
        } else if (ctx.measureText(test).width > maxWidth && !line) {
          let part = ''
          for (const ch of Array.from(word)) {
            if (ctx.measureText(part + ch + ' ').width > maxWidth) { if (part) allLines.push(part); part = ch }
            else part += ch
          }
          if (part) allLines.push(part)
        } else line = test
      }
      if (line.trim()) allLines.push(line.trim())
    }
    const totalHeight = Math.max(1, allLines.length) * lineHeight
    return { lines: allLines, y: y - totalHeight / 2, lineHeight }
  }
}
