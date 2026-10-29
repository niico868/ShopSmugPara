import { Link } from 'react-router-dom'
import { Gift } from 'lucide-react'
import type { OrderItem, Product } from '../lib/types'
import { usePoints } from '../lib/points'
import { fmtPts, type RewardId } from '../lib/rewards'
import { money } from '../lib/format'
import { useCart } from '../store/cart'
import { Card } from './ui'
import { Coin } from './Points'

const REWARD_NAME: Record<RewardId, string> = {
  free_tee_ep: 'Free tee for Engagement Points',
  free_tee_pp: 'Free standard tee',
  free_custom_pp: 'Free custom tee',
  credit_50: 'Credit',
}

/**
 * Rewards at checkout: what this order earns, the Engager's free tee and carry-over,
 * and the Buyer's ladder (credit, free standard tee, free custom tee).
 */
export function CheckoutRewards({ items, products, credit, setCredit }: {
  items: OrderItem[]; products: Product[]; credit: boolean; setCredit: (v: boolean) => void
}) {
  const signedIn = usePoints((s) => s.signedIn)
  const r = usePoints((s) => s.rewards)
  const rules = usePoints((s) => s.rules)
  const setReward = useCart((s) => s.setReward)

  const earns = items.filter((i) => !i.reward && i.unit_price >= rules.purchase_min_price).reduce((n, i) => n + i.qty, 0) * rules.purchase_pp
  const rewardLine = items.find((i) => i.reward)
  const product = (i: OrderItem) => products.find((p) => p.id === i.product_id)
  const standardLines = items.filter((i) => i.kind === 'catalog' && !i.reward && product(i) && !product(i)!.premium)
  const customLines = items.filter((i) => i.kind === 'custom' && !i.reward)
  const listPrice = (i: OrderItem) => (i.kind === 'catalog' ? product(i)?.price ?? i.unit_price : i.unit_price)

  const makeFree = (i: OrderItem, reward: RewardId) => {
    const cover = reward === 'free_custom_pp' ? rules.custom_tee_price : rules.free_tee_max_price
    setReward(i.id, reward, Math.max(0, listPrice(i) - cover))
  }

  const earnLine = earns > 0 && (
    <p className="text-sm">This order earns <b>{fmtPts(earns)} Paradise Points</b> once it&rsquo;s collected or delivered.</p>
  )

  if (!signedIn) {
    return (
      <Card className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Coin className="h-6 w-6" /> Rewards</h2>
        {earns > 0
          ? <p className="text-sm"><Link to="/signin?next=/checkout" className="font-semibold text-acid">Sign in</Link> and this order earns <b>{fmtPts(earns)} Paradise Points</b> once it&rsquo;s collected or delivered: {rules.purchase_pp} for every tee priced {rules.purchase_min_price} TTD or more.</p>
          : <p className="text-sm"><Link to="/signin?next=/checkout" className="font-semibold text-acid">Sign in</Link> to earn points on your orders and claim rewards.</p>}
      </Card>
    )
  }
  if (!r) return null

  const applyButton = (i: OrderItem, reward: RewardId, label: string) => {
    const cover = reward === 'free_custom_pp' ? rules.custom_tee_price : rules.free_tee_max_price
    const pay = Math.max(0, listPrice(i) - cover)
    return (
      <button key={i.id} type="button" onClick={() => makeFree(i, reward)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-700 p-3 text-left text-sm transition hover:border-acid">
        <span><b>{label}</b> {i.name} ({i.size})</span>
        <span className="shrink-0 text-xs text-ink-400">{pay ? `You pay ${money(pay)}` : 'Free'}</span>
      </button>
    )
  }

  const body: React.ReactNode[] = []
  if (rewardLine) {
    body.push(
      <div key="applied" className="flex items-center justify-between gap-3 rounded-xl bg-acid/10 p-3 text-sm">
        <span><Gift size={14} className="mr-1 inline text-acid" /> <b>{REWARD_NAME[rewardLine.reward!]}</b> on {rewardLine.name} ({rewardLine.size})</span>
        <button type="button" onClick={() => setReward(rewardLine.id, null)} className="text-xs font-semibold text-ink-400 hover:text-flame">Remove</button>
      </div>,
    )
  }

  if (r.tier === 'engager') {
    const openTee = r.open_redemptions.find((x) => x.reward === 'free_tee_ep' && !x.order_id)
    const canClaim = !!openTee || (!r.free_tee_claimed && r.balance >= rules.free_tee_ep)
    const usingTee = rewardLine?.reward === 'free_tee_ep'
    const left = r.balance - (usingTee && !openTee ? rules.free_tee_ep : 0)
    body.unshift(<p key="bal" className="text-sm">You have <b>{fmtPts(r.balance)} Engagement Points</b>.</p>)
    if (canClaim && !usingTee) {
      body.push(<p key="tee" className="text-sm font-semibold">Your free standard tee is waiting{openTee ? '' : `: it costs ${fmtPts(rules.free_tee_ep)} EP`} and rides along with this order at no charge.</p>)
      if (standardLines.length) body.push(<div key="tee-lines" className="space-y-2">{standardLines.map((i) => applyButton(i, 'free_tee_ep', 'Make it free:'))}</div>)
      else body.push(<p key="tee-shop" className="text-sm text-ink-400"><Link to="/shop" className="font-semibold text-acid">Add a tee from the shop</Link> (up to {rules.free_tee_max_price} TTD, or pay the difference), then make it free here. Premium drops are excluded.</p>)
    } else if (!r.free_tee_claimed && r.balance < rules.free_tee_ep && r.balance >= rules.free_tee_ep - 250) {
      body.push(<p key="close" className="text-sm">You&rsquo;re {fmtPts(rules.free_tee_ep - r.balance)} EP from a free tee. Reach {fmtPts(rules.free_tee_ep)} and it rides along free with your first order.</p>)
    }
    if (left > 0) {
      body.push(<p key="carry" className="text-sm">Your {fmtPts(left)} EP carry over as <b>{fmtPts(Math.min(left, rules.carry_over_cap))} Paradise Points</b> {usingTee ? 'as soon as you claim the tee' : 'when this order is collected or delivered'}, and from then on you earn Paradise Points.</p>)
    }
    if (earnLine) body.push(<div key="earn">{earnLine}</div>)
  } else {
    const spent = rewardLine && rewardLine.reward !== 'free_tee_ep' ? (rewardLine.reward === 'free_custom_pp' ? rules.custom_tee_pp : rules.std_tee_pp) : 0
    const free = r.balance - spent
    body.unshift(<p key="bal" className="text-sm">You have <b>{fmtPts(r.balance)} Paradise Points</b>.</p>)
    if (r.balance < 0) body.push(<p key="neg" className="text-sm text-flame">Your balance is below zero, so rewards are paused until it&rsquo;s back above zero.</p>)
    if (free >= rules.credit_pp || credit) {
      body.push(
        <label key="credit" className="flex items-center gap-3 rounded-xl border border-ink-700 p-3 text-sm">
          <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} className="h-4 w-4 accent-[#5caedb]" />
          <span>Use <b>{fmtPts(rules.credit_pp)} PP</b> for <b>{money(rules.credit_ttd)} off</b> this order</span>
        </label>,
      )
    }
    const room = r.balance - (credit ? rules.credit_pp : 0)
    if (!rewardLine && room >= rules.std_tee_pp && standardLines.length) {
      body.push(<div key="std" className="space-y-2">{standardLines.map((i) => applyButton(i, 'free_tee_pp', `${fmtPts(rules.std_tee_pp)} PP:`))}</div>)
    }
    if (!rewardLine && room >= rules.custom_tee_pp && r.paid_custom_tees >= rules.custom_tee_min_paid && customLines.length) {
      body.push(<div key="custom" className="space-y-2">{customLines.map((i) => applyButton(i, 'free_custom_pp', `${fmtPts(rules.custom_tee_pp)} PP:`))}</div>)
      body.push(<p key="custom-note" className="text-xs text-ink-400">The free custom tee covers one full print ({money(rules.custom_tee_price)}). Bigger prints pay the difference.</p>)
    }
    if (earnLine) body.push(<div key="earn">{earnLine}</div>)
  }

  return (
    <Card className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Coin className="h-6 w-6" /> Rewards</h2>
      {body}
    </Card>
  )
}
