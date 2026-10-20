import type { OrderItem } from '../lib/types'
import { TeeMockup } from './TeeMockup'
import { cx } from '../lib/format'

export function ItemThumb({ item, className, side = 'front' }: { item: OrderItem; className?: string; side?: 'front' | 'back' }) {
  return (
    <div className={cx('overflow-hidden rounded-xl bg-ink-800', className)}>
      {item.kind === 'custom' && item.design ? (
        <TeeMockup color={item.design.color} side={side} layers={item.design[side]} className="h-full w-full" />
      ) : (
        <TeeMockup color={item.color} art={item.image_url} className="h-full w-full" />
      )}
    </div>
  )
}
