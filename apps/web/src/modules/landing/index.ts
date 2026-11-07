// Public surface of the landing module for rendering. Config-time code (collections) must import the
// block schemas from '@/modules/landing/blocks' instead, so the Payload CLI never loads components.
export { RenderBlocks, type BlockContext } from './components/RenderBlocks'
export { getBlockContext } from './context'
