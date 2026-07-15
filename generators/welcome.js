import { createCanvas, loadImage } from '@napi-rs/canvas'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const LANG = {
  fr: 'Membre #', en: 'Member #', de: 'Mitglied #', es: 'Miembro #',
  it: 'Membro #', jp: 'メンバー #', ru: 'Участник #',
}

export class WelcomeGenerator {
  constructor(config = {}) {
    this.width = config.width || 800
    this.height = config.height || this.width * 0.5
    this.padding = config.padding || this.width * 0.02
    this.fontSize = config.fontSize || this.width * 0.04
    this.avatarSize = config.avatarSize || this.width * 0.16
    this.baseTextY = config.baseTextY || this.padding + 20
    this.memberFontSize = config.memberFontSize || this.width * 0.025
    this.welcomeFontSizeBase = config.welcomeFontSizeBase || this.width * 0.0375
    this.welcomeFontSizeMin = config.welcomeFontSizeMin || this.width * 0.01875
    this.textYOffset = config.textYOffset || this.padding
  }

  async generate({ avatarUrl, message, number, language }) {
    const canvas = createCanvas(this.width, this.height)
    const ctx = canvas.getContext('2d')

    try {
      const bg = await loadImage(join(ROOT, 'assets', 'background.png'))
      ctx.drawImage(bg, 0, 0, this.width, this.height)
    } catch {}

    const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u0400-\u04FF]/.test(message)
    const fontFamily = hasCJK ? 'Noto Sans JP Bold' : 'CustomFont'

    const avatarX = (this.width - this.avatarSize) / 2
    const avatarY = this.baseTextY + 10

    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX + this.avatarSize / 2, avatarY + this.avatarSize / 2, this.avatarSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    const avatar = await loadImage(avatarUrl).catch(() =>
      loadImage('https://cdn.discordapp.com/embed/avatars/0.png')
    )
    ctx.drawImage(avatar, avatarX, avatarY, this.avatarSize, this.avatarSize)
    ctx.restore()

    ctx.fillStyle = 'white'
    const welcomeFontSize = Math.max(this.welcomeFontSizeMin,
      this.welcomeFontSizeBase - message.length / 10)
    ctx.font = `bold ${welcomeFontSize}px "${fontFamily}"`
    ctx.textAlign = 'center'

    const textY = hasCJK
      ? avatarY + this.avatarSize + this.padding * 3
      : avatarY + this.avatarSize + this.padding * 4
    ctx.fillText(message, this.width / 2, textY)

    ctx.font = `${this.memberFontSize}px "${fontFamily}"`
    ctx.fillStyle = '#8E9296'
    ctx.fillText(`${LANG[language] || 'Member #'}${number}`, this.width / 2, textY + this.textYOffset + 20)

    return canvas.toBuffer('image/png')
  }
}
