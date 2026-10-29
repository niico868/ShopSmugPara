import { huntSpot } from '../lib/contraband'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'
import { Button, Card, Field, Input } from '../components/ui'

export default function Track() {
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <div className="mb-8 text-center">
        <PackageSearch size={40} className="mx-auto text-acid" />
        <h1 {...huntSpot('track-title')} className="mt-4 font-poster text-5xl">Track your order</h1>
        <p className="mt-2 text-ink-400">Enter the order code from your confirmation and the email you ordered with.</p>
      </div>
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); nav(`/order/${code.trim().toUpperCase()}?email=${encodeURIComponent(email.trim().toLowerCase())}`) }} className="space-y-4">
          <Field label="Order code"><Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="SP-XXXXXX" className="font-mono uppercase" /></Field>
          <Field label="Email"><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button size="lg" type="submit" className="w-full">Find my order</Button>
        </form>
      </Card>
    </div>
  )
}
