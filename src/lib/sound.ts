import { create } from 'zustand'

// The site soundtrack: a playlist of every song in public/music (bundled with the site) plus every
// song uploaded to the Cloudflare R2 music bucket. The Worker (worker/index.ts) merges the two into
// /music/tracks.json. Songs play in filename order, so "01 ...", "02 ..." sets the order, and a name
// like "Artist - Title.mp3" shows as the artist and title. It starts when a visitor chooses
// "Sail loud" or presses the speaker button, then loops the playlist until paused.

export interface Track { file: string; title: string; artist?: string; src: string }

export const parseTrack = (file: string): Track => {
  const name = (file.split('/').pop() ?? file).replace(/\.[^.]+$/, '').replace(/^\d+[\s._-]+/, '').replace(/_/g, ' ').trim()
  const [artist, ...rest] = name.split(' - ')
  const src = '/music/' + file.split('/').map(encodeURIComponent).join('/')
  return rest.length ? { file, artist: artist.trim(), title: rest.join(' - ').trim(), src } : { file, title: name, src }
}

// Plays before the list arrives, or if it can't be fetched.
const FALLBACK = [parseTrack('01 Ayetian - Caricom.mp3')]

let audio: HTMLAudioElement | null = null
/** The one audio element, reused for every song so phones keep letting it play after the first tap. */
export const player = () => {
  if (!audio) {
    audio = new Audio()
    audio.volume = 0.6
    audio.preload = 'none'
    audio.addEventListener('ended', () => useSound.getState().next())
    audio.addEventListener('pause', () => useSound.setState({ on: false }))
    audio.addEventListener('play', () => useSound.setState({ on: true }))
    // A song that won't load (deleted, bad file) is skipped rather than stopping the music.
    audio.addEventListener('error', () => { if (useSound.getState().tracks.length > 1) useSound.getState().next() })
  }
  return audio
}

interface Sound {
  tracks: Track[]
  index: number
  on: boolean
  /** The mini player shows once music has been started this visit, until it's closed. */
  shown: boolean
  load: () => void
  play: (index?: number) => void
  stop: () => void
  next: () => void
  prev: () => void
  hide: () => void
}

let loading = false

export const useSound = create<Sound>()((set, get) => ({
  tracks: FALLBACK,
  index: 0,
  on: false,
  shown: false,
  load: () => {
    if (loading) return
    loading = true
    fetch('/music/tracks.json')
      .then((r) => (r.ok ? (r.json() as Promise<string[]>) : []))
      .then((files) => {
        if (!Array.isArray(files) || !files.length) return
        const tracks = files.map(parseTrack)
        // Keep the song that's already playing selected.
        const current = get().tracks[get().index]?.file
        set({ tracks, index: Math.max(0, tracks.findIndex((t) => t.file === current)) })
      })
      .catch(() => { /* keep the bundled song */ })
  },
  play: (index) => {
    const { tracks } = get()
    const i = index ?? get().index
    const t = tracks[i] ?? tracks[0]
    if (!t) return
    const a = player()
    if (a.dataset.file !== t.file) {
      a.src = t.src
      a.dataset.file = t.file
    } else if (a.ended) a.currentTime = 0
    set({ index: tracks.indexOf(t), shown: true })
    a.play().catch(() => set({ on: false }))
  },
  stop: () => { audio?.pause() },
  next: () => { const { index, tracks } = get(); get().play((index + 1) % tracks.length) },
  prev: () => {
    // Like most players: back to the start of the song first, then the song before.
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return }
    const { index, tracks } = get()
    get().play((index - 1 + tracks.length) % tracks.length)
  },
  hide: () => { audio?.pause(); set({ shown: false }) },
}))
