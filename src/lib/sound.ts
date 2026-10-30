import { create } from 'zustand'

// The site soundtrack is Smug Para Radio, a playlist on Audiomack shown through Audiomack's own
// embedded player. Audiomack licenses the songs, and its player has to stay visible and unchanged.
// "Sail loud" or the header speaker opens the radio. Because that's a tap, the player is loaded asking
// to autoplay, which some browsers allow; where they don't (iPhones especially), the visitor presses
// play on it. Closing the radio removes the player, which stops it.
export const RADIO_URL = 'https://audiomack.com/smugglersparadisehq/playlist/smug-para-radio'
export const RADIO_EMBED = 'https://audiomack.com/embed/playlist/smugglersparadisehq/smug-para-radio?autoplay=true'

export const useSound = create<{ on: boolean; play: () => void; stop: () => void }>()((set) => ({
  on: false,
  play: () => set({ on: true }),
  stop: () => set({ on: false }),
}))
