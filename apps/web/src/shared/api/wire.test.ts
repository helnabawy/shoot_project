import { imageV1, richTextV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import type { Media } from '@/payload-types'
import { toWireImage, toWireLink, toWireRichText } from './wire'

const base = 'https://shoot.example'

function media(over: Partial<Media> = {}): Media {
  return {
    id: 1,
    alt: 'A bride at golden hour',
    updatedAt: '',
    createdAt: '',
    url: '/api/media/file/bride.jpg',
    width: 2400,
    height: 1600,
    uploadedBy: 9,
    sizes: {
      thumbnail: { url: '/api/media/file/bride-400.webp', width: 400, height: 267 },
      hero: { url: '/api/media/file/bride-1600.webp', width: 1600, height: 1067 },
      card: { url: '/api/media/file/bride-800.webp', width: 800, height: 533 },
    },
    ...over,
  }
}

describe('MR-US3-S5 toWireImage', () => {
  it('makes relative addresses absolute and sorts the sizes with the original last', () => {
    const image = imageV1.parse(toWireImage(media(), base))
    expect(image).toEqual({
      alt: 'A bride at golden hour',
      width: 2400,
      height: 1600,
      sizes: [
        { url: `${base}/api/media/file/bride-400.webp`, width: 400, height: 267 },
        { url: `${base}/api/media/file/bride-800.webp`, width: 800, height: 533 },
        { url: `${base}/api/media/file/bride-1600.webp`, width: 1600, height: 1067 },
        { url: `${base}/api/media/file/bride.jpg`, width: 2400, height: 1600 },
      ],
    })
    expect(JSON.stringify(image)).not.toContain('uploadedBy')
  })

  it('keeps an S3 address and removes duplicate widths', () => {
    const image = toWireImage(
      media({ url: 'https://s3.example/b.jpg', width: 800, height: 533, sizes: { card: { url: 'https://s3.example/b-800.webp', width: 800, height: 533 }, hero: { url: null } } }),
      base,
    )
    expect(image?.sizes).toEqual([{ url: 'https://s3.example/b-800.webp', width: 800, height: 533 }])
  })

  it('gives the original only without sizes, and null without a file', () => {
    expect(toWireImage(media({ sizes: undefined }), base)?.sizes).toHaveLength(1)
    expect(toWireImage({ url: '/x.webp', width: 10, height: 10 }, base)?.alt).toBe('')
    expect(toWireImage(media({ url: null }), base)).toBeNull()
    expect(toWireImage(media({ width: null }), base)).toBeNull()
    expect(toWireImage(media({ url: 'relative/x.jpg', sizes: undefined }), base)).toBeNull()
    expect(toWireImage(7, base)).toBeNull()
    expect(toWireImage(null, base)).toBeNull()
  })

  it('turns a missing alt into ""', () => {
    expect(toWireImage(media({ alt: null as unknown as string }), base)?.alt).toBe('')
  })
})

describe('toWireRichText', () => {
  it('reduces Lexical with uploads as images', () => {
    const state = {
      root: {
        type: 'root',
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Hello', format: 1 }] },
          { type: 'upload', value: media() },
          { type: 'upload', value: 3 },
        ],
      },
    }
    const out = richTextV1.parse(toWireRichText(state, base))
    expect(out.nodes.map((n) => n.type)).toEqual(['paragraph', 'image'])
  })
})

describe('toWireLink', () => {
  it('strips the language prefix', () => {
    expect(toWireLink({ label: 'Guides', href: '/ar/guides' })).toEqual({ label: 'Guides', path: '/guides' })
    expect(toWireLink({ label: 'Home', href: '/ar' })).toEqual({ label: 'Home', path: '/' })
    expect(toWireLink({ label: 'About', href: '/about' })).toEqual({ label: 'About', path: '/about' })
  })
})
