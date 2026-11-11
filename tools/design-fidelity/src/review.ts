// Pixel ratio, side-by-side and overlay images, drawn in a page <canvas> (research R9).
import type { Page } from '@playwright/test'

export interface PixelDiff {
  diffPixels: number
  total: number
  ratio: number
  /** PNG: differing pixels in red over a faded copy of the board. */
  diff: Buffer
}

const dataUrl = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`
const fromDataUrl = (url: string) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')

async function blank(page: Page) {
  if (!(await page.evaluate(() => document.body?.dataset.review === '1'))) {
    await page.setContent('<body data-review="1" style="margin:0"></body>')
  }
}

/**
 * Counts pixels whose colour differs by more than [threshold] (pixelmatch's YIQ metric, the same
 * one Playwright's `toMatchSnapshot` uses, 0 to 1). Images of different sizes differ everywhere.
 */
export async function pixelDiff(page: Page, board: Buffer, app: Buffer, threshold = 0.2): Promise<PixelDiff> {
  await blank(page)
  const out = await page.evaluate(
    async ({ a, b, t }) => {
      const load = async (u: string) => createImageBitmap(await (await fetch(u)).blob())
      const [ia, ib] = await Promise.all([load(a), load(b)])
      const w = Math.max(ia.width, ib.width)
      const h = Math.max(ia.height, ib.height)
      const read = (img: ImageBitmap) => {
        const c = new OffscreenCanvas(w, h)
        const x = c.getContext('2d')!
        x.drawImage(img, 0, 0)
        return x.getImageData(0, 0, w, h).data
      }
      const pa = read(ia)
      const pb = read(ib)
      const sameSize = ia.width === ib.width && ia.height === ib.height
      const maxDelta = 35215 * t * t
      const blend = (c: number, a: number) => 255 + (c - 255) * a
      const yiq = (r: number, g: number, bl: number) => [
        r * 0.29889531 + g * 0.58662247 + bl * 0.11448223,
        r * 0.59597799 - g * 0.2741761 - bl * 0.32180189,
        r * 0.21147017 - g * 0.52261711 + bl * 0.31114694,
      ]
      const out = new OffscreenCanvas(w, h)
      const ox = out.getContext('2d')!
      const img = ox.createImageData(w, h)
      let diff = 0
      for (let i = 0; i < pa.length; i += 4) {
        const aa = pa[i + 3]! / 255
        const ab = pb[i + 3]! / 255
        const [y1, i1, q1] = yiq(blend(pa[i]!, aa), blend(pa[i + 1]!, aa), blend(pa[i + 2]!, aa))
        const [y2, i2, q2] = yiq(blend(pb[i]!, ab), blend(pb[i + 1]!, ab), blend(pb[i + 2]!, ab))
        const d = 0.5053 * (y1! - y2!) ** 2 + 0.299 * (i1! - i2!) ** 2 + 0.1957 * (q1! - q2!) ** 2
        const differs = !sameSize || d > maxDelta
        if (differs) {
          diff += 1
          img.data.set([255, 0, 0, 255], i)
        } else {
          const g = 255 + (y1! - 255) * 0.1
          img.data.set([g, g, g, 255], i)
        }
      }
      ox.putImageData(img, 0, 0)
      const blob = await out.convertToBlob({ type: 'image/png' })
      const reader = new FileReader()
      const url: string = await new Promise((r) => {
        reader.onload = () => r(reader.result as string)
        reader.readAsDataURL(blob)
      })
      return { diff, total: w * h, url }
    },
    { a: dataUrl(board), b: dataUrl(app), t: threshold },
  )
  return { diffPixels: out.diff, total: out.total, ratio: out.diff / out.total, diff: fromDataUrl(out.url) }
}

async function compose(page: Page, images: Buffer[], draw: string): Promise<Buffer> {
  await blank(page)
  const url = await page.evaluate(
    async ({ urls, draw }) => {
      const load = async (u: string) => createImageBitmap(await (await fetch(u)).blob())
      const imgs = await Promise.all(urls.map(load))
      // eslint-disable-next-line no-new-func
      const fn = new Function('imgs', 'OffscreenCanvas', draw) as (i: ImageBitmap[], c: typeof OffscreenCanvas) => OffscreenCanvas
      const canvas = fn(imgs, OffscreenCanvas)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      const reader = new FileReader()
      return await new Promise<string>((r) => {
        reader.onload = () => r(reader.result as string)
        reader.readAsDataURL(blob)
      })
    },
    { urls: images.map(dataUrl), draw },
  )
  return fromDataUrl(url)
}

/** Board | app | diff, each at 1× (half the 2× renders), with a 16 px gutter. */
export function sideBySide(page: Page, board: Buffer, app: Buffer, diff: Buffer): Promise<Buffer> {
  return compose(
    page,
    [board, app, diff],
    `const [a,b,d]=imgs; const w=a.width/2, h=a.height/2, g=16;
     const c=new OffscreenCanvas(w*3+g*2,h); const x=c.getContext('2d');
     x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
     x.drawImage(a,0,0,w,h); x.drawImage(b,w+g,0,w,h); x.drawImage(d,(w+g)*2,0,w,h); return c;`,
  )
}

/** The app at 50 % over the board, then a difference-blend strip, each at 1×. */
export function overlay(page: Page, board: Buffer, app: Buffer): Promise<Buffer> {
  return compose(
    page,
    [board, app],
    `const [a,b]=imgs; const w=a.width/2, h=a.height/2, g=16;
     const c=new OffscreenCanvas(w*2+g,h); const x=c.getContext('2d');
     x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
     x.drawImage(a,0,0,w,h); x.globalAlpha=0.5; x.drawImage(b,0,0,w,h); x.globalAlpha=1;
     x.drawImage(a,w+g,0,w,h); x.globalCompositeOperation='difference'; x.drawImage(b,w+g,0,w,h); return c;`,
  )
}

/** A copy of [png] with a solid block over [fraction] of its area (the MF-US1-S3 fixture). */
export function withBlock(page: Page, png: Buffer, fraction: number, colour = '#00ff88'): Promise<Buffer> {
  return compose(
    page,
    [png],
    `const [a]=imgs; const c=new OffscreenCanvas(a.width,a.height); const x=c.getContext('2d');
     x.drawImage(a,0,0); const side=Math.sqrt(a.width*a.height*${fraction});
     x.fillStyle='${colour}'; x.fillRect(Math.round((a.width-side)/2),Math.round((a.height-side)/2),Math.round(side),Math.round(side)); return c;`,
  )
}
