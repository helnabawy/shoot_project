import { describe, expect, it } from 'vitest'
import { lexicalToText, plainWords } from './richtext'

const text = (t: string) => ({ type: 'text', text: t })
const para = (...children: unknown[]) => ({ type: 'paragraph', children })

describe('MP-US3-S3 lexicalToText', () => {
  it('flattens blocks, lists, links and line breaks with single spaces', () => {
    const state = {
      root: {
        type: 'root',
        children: [
          { type: 'heading', children: [text('Title')] },
          para(text('Hello '), { type: 'link', children: [text('world')] }, { type: 'linebreak' }, text('again')),
          { type: 'list', children: [{ type: 'listitem', children: [text('one')] }, { type: 'listitem', children: [text('two')] }] },
          { type: 'unknown-block' },
        ],
      },
    }
    expect(lexicalToText(state)).toBe('Title Hello world again one two')
  })

  it('accepts any node and returns an empty string for nothing', () => {
    expect(lexicalToText(para(text('x')))).toBe('x')
    expect(lexicalToText(null)).toBe('')
    expect(lexicalToText(undefined)).toBe('')
    expect(lexicalToText('plain')).toBe('')
    expect(lexicalToText({ type: 'paragraph' })).toBe('')
  })
})

describe('plainWords', () => {
  it('counts English, Arabic and mixed text by word', () => {
    expect(plainWords('How to brief a wedding photographer')).toBe(6)
    expect(plainWords('كيف تكتب موجزاً لمصور')).toBe(4)
    expect(plainWords('Shoot مصور 2026!')).toBe(3)
    expect(plainWords('')).toBe(0)
  })
})
