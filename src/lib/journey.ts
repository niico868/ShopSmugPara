import type { Order } from './types'

// The customer's order journey, as shown on the tracking page (and the campaign video):
//   Order -> Deposit -> Draft -> Print -> Ready -> Done
// Draft only appears when the order has a custom design: our team sends the final draft
// (Admin > order > Final draft) and the customer approves it before printing starts.
// Everything is worked out from fields the order already has: status, payment_status and proof_status.

export type StepKey = 'order' | 'deposit' | 'draft' | 'print' | 'ready' | 'done'
export interface Step { key: StepKey; label: string; line: string; done: boolean }

const AFTER_PRINT = ['in_production', 'ready', 'shipped', 'delivered']
const AFTER_READY = ['ready', 'shipped', 'delivered']

export const hasCustom = (o: Order) => o.items.some((i) => i.kind === 'custom')

export function journey(o: Order): { steps: Step[]; at: number } {
  const custom = hasCustom(o)
  const pickup = o.fulfillment === 'pickup'
  const paid = o.payment_status === 'paid' || o.payment_status === 'refunded'
  const proof = o.proof_status ?? 'none'
  const steps: Step[] = [
    { key: 'order', label: 'Order', line: 'We confirm your order.', done: o.status !== 'pending' || paid },
    { key: 'deposit', label: 'Deposit', line: 'No downpayment, no product. Pay the 50% deposit or in full and we get to work.', done: paid },
    ...(custom ? [{
      key: 'draft' as const, label: 'Draft',
      line: proof === 'sent' ? 'Your final draft is ready. Check it and approve it below.'
        : proof === 'changes' ? 'We’re updating your draft with your changes.'
        : 'We confirm your design and send you the final draft to approve.',
      done: proof === 'approved' || AFTER_PRINT.includes(o.status),
    }] : []),
    { key: 'print', label: 'Print', done: AFTER_READY.includes(o.status),
      line: o.status === 'in_production' ? 'Production ongoing.' : custom ? 'Draft approved. Printing starts next.' : 'Queued for printing.' },
    { key: 'ready', label: 'Ready', line: o.status === 'shipped' ? 'On the way to you.' : pickup ? 'Ready for pickup.' : 'Packed and ready for delivery.', done: o.status === 'delivered' },
    { key: 'done', label: 'Done', line: 'You step out hard.', done: o.status === 'delivered' },
  ]
  // Where the order is now: the first step that isn't done (or the last, once everything is).
  let at = steps.findIndex((s) => !s.done)
  if (at === -1) at = steps.length - 1
  return { steps, at }
}
