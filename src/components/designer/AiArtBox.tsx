import { useEffect, useState } from 'react'
import { Loader2, Wand2 } from 'lucide-react'
import { Button, Textarea } from '../ui'
import { AI_ART_DAILY, AI_ART_ON, aiArtLeft, generateArt } from '../../lib/aiArt'
import { toast } from '../Toast'

const IDEAS = ['a lion wearing a crown, bold graffiti style', 'scarlet ibis in flight, tribal linework', 'pirate skull with hibiscus flowers, vintage tattoo style']

/** "Create with AI": a prompt box that draws art and hands it to the designer to place on the tee. */
export function AiArtBox({ canStart, onArt }: { canStart: () => boolean; onArt: (src: string) => Promise<void> }) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => { if (AI_ART_ON) aiArtLeft().then(setLeft) }, [])
  if (!AI_ART_ON) return null

  const go = async () => {
    if (busy || !prompt.trim() || !canStart()) return
    setBusy(true)
    try {
      const r = await generateArt(prompt)
      setLeft(r.left)
      await onArt(r.image)
    } catch (e) {
      const err = e as Error & { left?: number }
      if (err.left !== undefined) setLeft(err.left)
      toast.error(err.message)
    } finally { setBusy(false) }
  }
  const out = left === 0

  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Wand2 size={16} className="text-acid" /> Create with AI</p>
      <p className="mb-3 text-xs text-ink-400">Describe a graphic and we’ll draw it for you. Keep it simple: one subject and a style.</p>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, 300))}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go() } }}
        placeholder={`e.g. ${IDEAS[0]}`}
        className="min-h-[70px] text-sm"
        disabled={busy}
      />
      {!prompt && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {IDEAS.slice(1).map((i) => (
            <button key={i} onClick={() => setPrompt(i)} className="rounded-full border border-ink-700 px-2.5 py-1 text-[11px] text-ink-400 hover:border-acid hover:text-black">{i}</button>
          ))}
        </div>
      )}
      <Button className="mt-3 w-full" size="sm" onClick={go} disabled={busy || !prompt.trim() || out}>
        {busy ? <><Loader2 size={14} className="animate-spin" /> Drawing…</> : <><Wand2 size={14} /> Generate</>}
      </Button>
      <p className="mt-2 text-center text-[11px] text-ink-400">
        {out ? 'You’ve used today’s AI drawings. More tomorrow!' : left !== null ? `${left} of ${AI_ART_DAILY} left today` : `${AI_ART_DAILY} a day`}
      </p>
    </div>
  )
}
