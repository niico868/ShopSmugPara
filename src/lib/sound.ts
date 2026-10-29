import { create } from 'zustand'

// The site soundtrack. It plays once through when a visitor chooses "Sail loud", and the
// speaker button in the header pauses or resumes it.
const TRACK = '/audio/ayetian-caricom.mp3'
let audio: HTMLAudioElement | null = null
const track = () => {
  if (!audio) {
    audio = new Audio(TRACK)
    audio.volume = 0.6
    audio.addEventListener('ended', () => useSound.setState({ on: false }))
  }
  return audio
}

export const useSound = create<{ on: boolean; play: () => void; stop: () => void }>()((set) => ({
  on: false,
  play: () => {
    const a = track()
    if (a.ended) a.currentTime = 0
    a.play().then(() => set({ on: true })).catch(() => set({ on: false }))
  },
  stop: () => {
    audio?.pause()
    set({ on: false })
  },
}))
