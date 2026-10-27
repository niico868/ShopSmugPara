import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDesign } from '../lib/api'
import type { SavedDesign } from '../lib/types'
import { Button, Empty, PageLoader } from '../components/ui'
import { TeeMockup, AREAS } from '../components/TeeMockup'
import { AREA_ORDER, areaLayers } from '../lib/pricing'
import { colorName, fitName } from '../lib/constants'
import { fillRoster } from '../lib/design'

export default function SharedDesign() {
  const { id = '' } = useParams()
  const [d, setD] = useState<SavedDesign | null | undefined>()
  useEffect(() => { getDesign(id).then(setD).catch(() => setD(null)) }, [id])

  if (d === undefined) return <PageLoader />
  if (!d) return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <Empty title="This design isn’t available">It may have been deleted or made private. <Link to="/design" className="text-acid">Make your own</Link></Empty>
    </div>
  )
  const areas = AREA_ORDER.filter((a) => areaLayers(d.design, a).length)
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-acid">Shared design</p>
      <h1 className="mt-1 break-words font-poster text-5xl">{d.name}</h1>
      <p className="text-sm text-ink-400">{fitName(d.design.fit)} · {colorName(d.design.color)}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(areas.length ? areas : (['front'] as const)).map((a) => (
          <figure key={a} className="rounded-3xl border border-ink-800 bg-[radial-gradient(circle_at_50%_30%,#ffffff,#ececea_75%)] p-4">
            <TeeMockup color={d.design.color} fit={d.design.fit} area={a} layers={fillRoster(areaLayers(d.design, a), d.design.roster?.[0])} className="w-full" />
            <figcaption className="text-center text-xs font-semibold uppercase tracking-wider text-ink-400">{AREAS[a].name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to={`/design?copy=${d.id}`}><Button size="lg">Make your own version</Button></Link>
        <Link to="/shop"><Button size="lg" variant="outline">Shop the collection</Button></Link>
      </div>
    </div>
  )
}
