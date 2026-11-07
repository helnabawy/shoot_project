import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** False during SSR and the hydration render, true afterwards; no effect or extra state update. */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
