import * as fs from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type FontStyle = 'normal' | 'italic'

export interface FontOptions {
  data: Buffer | ArrayBuffer
  name: string
  weight?: Weight
  style?: FontStyle
  lang?: string
}

let fontCache: Buffer | undefined
const moduleDir = dirname(fileURLToPath(import.meta.url))
const fontPath = join(moduleDir, '..', 'assets', 'fonts', 'Inter-Medium.ttf')

async function loadFont(): Promise<Buffer> {
  if (!fontCache) {
    fontCache = await fs.readFile(fontPath)
  }
  return fontCache
}

export async function getProfileFonts(): Promise<FontOptions[]> {
  return [
    {
      name: 'Inter',
      data: await loadFont(),
      weight: 500,
      style: 'normal',
    },
  ]
}
