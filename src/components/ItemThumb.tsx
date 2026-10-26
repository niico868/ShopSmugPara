import type { OrderItem } from '../lib/types'
import { TeeMockup } from './TeeMockup'
import { cx } from '../lib/format'

export function ItemThumb({ item, className, side = 'front' }: { item: OrderItem; className?: string; side?: 'front' | 'back' }) {
  return (
    <div className={cx('overflow-hidden rounded-xl border border-ink-800 bg-white', className)}>
      {item.kind === 'custom' && item.design ? (
        <TeeMockup color={item.design.color} fit={item.design.fit} side={side} layers={item.design[side]} className="h-full w-full" />
      ) : (
        <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
      )}
    </div>
  )
}
