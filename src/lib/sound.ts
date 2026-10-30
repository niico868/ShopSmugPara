import { create } from 'zustand'

// The site soundtrack is Smug Para Radio, a playlist on Audiomack shown through Audiomack's own
// embedded player. Audiomack licenses the songs, and its player has to stay visible and unchanged.
// Browsers (and the embed) only start sound after a tap, so "Sail loud" or the header speaker opens
// the radio and the visitor presses play on it. Closing the radio removes the player, which stops it.
export const RADIO_URL = 'https://audiomack.com/smugglersparadisehq/playlist/smug-para-radio'
export const RADIO_EMBED = 'https://audiomack.com/embed/playlist/smugglersparadisehq/smug-para-radio'

export const useSound = create<{ on: boolean; play: () => void; stop: () => void }>()((set) => ({
  on: false,
  play: () => set({ on: true }),
  stop: () => set({ on: false }),
}))
