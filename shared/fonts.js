import { GlobalFonts } from '@napi-rs/canvas'
import { existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

export function registerFonts() {
  const dirs = [ROOT, join(ROOT, 'fonts')]
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!/\.(ttf|otf)$/i.test(f)) continue
      try {
        GlobalFonts.registerFromPath(join(dir, f))
      } catch {}
    }
  }
}
