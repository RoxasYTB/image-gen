import express from 'express'
import { CaptchaGenerator } from './generators/captcha.js'
import { QuoteGenerator } from './generators/quote.js'
import { WelcomeGenerator } from './generators/welcome.js'
import { registerFonts } from './shared/fonts.js'

registerFonts()

const app = express()
const captcha = new CaptchaGenerator()
const quote = new QuoteGenerator()
const welcome = new WelcomeGenerator()

const PORT = parseInt(process.env.PORT || '9871', 10)

const sanitize = (input, max = 500) => {
  let s = String(input == null ? '' : input)
  if (s.includes('%')) { try { s = decodeURIComponent(s) } catch {} }
  s = s.replace(/[\p{Cc}\p{Cn}\p{Co}\p{Cs}]/gu, '')
  if (s.length > max) s = Array.from(s).slice(0, max).join('')
  return s
}

const SAFE_ID_RE = /^[0-9]{1,32}$/
const SAFE_HASH_RE = /^[a-zA-Z0-9_]{1,64}$/

app.get('/captcha/:text', async (req, res) => {
  try {
    const text = sanitize(req.params.text, 50)
    const width = req.query.width ? parseInt(req.query.width) : null
    const height = req.query.height ? parseInt(req.query.height) : null
    const buf = await captcha.generate(text, { width, height })
    res.set('Content-Type', 'image/png').send(buf)
  } catch (e) {
    res.status(500).send(`captcha error: ${e?.message || e}`)
  }
})

app.get('/captcha-reverse/:text', async (req, res) => {
  try {
    const text = sanitize(req.params.text, 50)
    const width = req.query.width ? parseInt(req.query.width) : null
    const height = req.query.height ? parseInt(req.query.height) : null
    const buf = await captcha.generate(text, { reverse: true, width, height })
    res.set('Content-Type', 'image/png').send(buf)
  } catch (e) {
    res.status(500).send('captcha error')
  }
})

app.get('/quote/:text/:author/:username/:avatarId/:avatarHash', async (req, res) => {
  try {
    const q = sanitize(req.params.text, 500)
    const author = sanitize(req.params.author, 80)
    const username = sanitize(req.params.username, 80)
    const avatarId = req.params.avatarId || ''
    const avatarHash = req.params.avatarHash || ''
    const idOk = SAFE_ID_RE.test(avatarId)
    const hashOk = SAFE_HASH_RE.test(avatarHash)
    const isPlaceholder = !idOk || !hashOk || avatarId === '0' || avatarHash === '0'
    const avatarUrl = isPlaceholder ? null : `https://cdn.discordapp.com/avatars/${avatarId}/${avatarHash}.png?size=1024`
    const buf = await quote.generate({
      avatarUrl,
      quote: q,
      author: author + ' , ' + new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      username: '@' + username,
    })
    res.set('Content-Type', 'image/png').send(buf)
  } catch (e) {
    res.status(500).send('quote error')
  }
})

app.get('/welcome/:language/:number/:username/:avatarId/:avatarHash', async (req, res) => {
  try {
    const msg = sanitize(req.params.username, 200)
    const avatarId = req.params.avatarId
    const avatarHash = req.params.avatarHash
    const number = req.params.number
    const language = req.params.language
    const avatarUrl = `https://cdn.discordapp.com/avatars/${avatarId}/${avatarHash}.png?size=1024`
    const buf = await welcome.generate({ avatarUrl, message: msg, number, language }).catch(() =>
      welcome.generate({ avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png', message: msg, number, language })
    )
    res.set('Content-Type', 'image/png').send(buf)
  } catch (e) {
    res.status(500).send('welcome error')
  }
})

app.get('/health', (_req, res) => res.json({ ok: true, type: 'unified' }))

app.listen(PORT)
