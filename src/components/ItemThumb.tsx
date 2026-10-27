import type { Area, OrderItem } from '../lib/types'
import { TeeMockup } from './TeeMockup'
import { cx } from '../lib/format'
import { mainArea } from '../lib/design'

export function ItemThumb({ item, className, area }: { item: OrderItem; className?: string; area?: Area }) {
  const a = item.design ? area ?? mainArea(item.design) : 'front'
  return (
    <div className={cx('overflow-hidden rounded-xl border border-ink-800 bg-white', className)}>
      {item.kind === 'custom' && item.design ? (
        <TeeMockup color={item.design.color} fit={item.design.fit} area={a} size={item.design.size ?? item.size} layers={item.design[a] ?? []} className="h-full w-full" />
      ) : (
        <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
      )}
    </div>
  )
}
