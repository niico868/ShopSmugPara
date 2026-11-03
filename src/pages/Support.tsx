import { Link } from 'react-router-dom'
import { Instagram } from 'lucide-react'
import { WhatsAppIcon } from '../components/icons'
import { INSTAGRAM, WHATSAPP } from '../lib/brand'

const GUIDE = [['S', '91', '71'], ['M', '97', '74'], ['L', '104', '76'], ['XL', '112', '79'], ['2XL', '120', '81'], ['3XL', '128', '84']]

export default function Support() {
  return (
    <div className="px-4 pb-24 pt-12 sm:px-8">
      <h1 className="font-medium text-3xl ">Help &amp; sizing</h1>
      <div className="mt-12 grid gap-12 md:grid-cols-3">
        <section>
          <h2 className="font-medium text-sm ">Orders</h2>
          <p className="mt-3 text-sm text-ink-400">Everything is printed to order and ready 2&ndash;5 work days after payment is made, for delivery or free pickup.</p>
          <Link to="/track" className="mt-4 inline-block border-b border-coal text-sm font-semibold">Track an order</Link>
        </section>
        <section>
          <h2 className="font-medium text-sm ">Size guide</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-ink-400"><tr><th className="py-1.5 font-medium">Size</th><th className="py-1.5 font-medium">Chest (cm)</th><th className="py-1.5 font-medium">Length (cm)</th></tr></thead>
            <tbody>{GUIDE.map((r) => <tr key={r[0]} className="border-t border-coal/15">{r.map((c, i) => <td key={i} className="py-1.5">{c}</td>)}</tr>)}</tbody>
          </table>
        </section>
        <section>
          <h2 className="font-medium text-sm ">Talk to us</h2>
          <a className="mt-3 flex w-max items-center gap-2 text-sm font-semibold" href={WHATSAPP} target="_blank" rel="noreferrer"><WhatsAppIcon size={16} /> WhatsApp us</a>
          <a className="mt-3 flex w-max items-center gap-2 text-sm font-semibold" href={INSTAGRAM} target="_blank" rel="noreferrer"><Instagram size={16} /> @smugglerparadise</a>
        </section>
      </div>
    </div>
  )
}
