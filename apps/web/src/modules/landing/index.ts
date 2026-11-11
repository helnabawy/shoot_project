// Public surface of the landing module for rendering. Config-time code (collections) must import the
// block schemas from '@/modules/landing/blocks' instead, so the Payload CLI never loads components.
export { RenderBlocks, type BlockContext } from './components/RenderBlocks'
export { getBlockContext } from './context'
// The mobile API (008): the landing endpoint, and the section mapper editor pages reuse.
export { getLandingV1, getSectionContext } from './api'
export { toWireCta, toWireHero, toWireSection, toWireSections, type SectionBlock, type SectionContext } from './wire'
