import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAccount } from '../lib/auth'
import { PageLoader } from './ui'

export function RequireAccount({ children }: { children: ReactNode }) {
  const { account, ready } = useAccount()
  const loc = useLocation()
  if (!ready) return <PageLoader />
  if (!account) return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <>{children}</>
}
