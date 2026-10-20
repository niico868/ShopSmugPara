import { useCallback, useEffect, useState } from 'react'
import { listOrders, subscribeOrders } from '../../lib/api'
import type { Order } from '../../lib/types'

export function useOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const reload = useCallback(() => { listOrders().then(setOrders).catch(() => setOrders([])) }, [])
  useEffect(() => {
    reload()
    return subscribeOrders(() => reload())
  }, [reload])
  return { orders, reload, setOrders }
}
