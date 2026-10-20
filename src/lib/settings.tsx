import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Settings } from './types'
import { defaultSettings } from './seed'
import { getSettings } from './api'
import { setCurrency } from './format'

const Ctx = createContext<{ settings: Settings; reload: () => void }>({ settings: defaultSettings(), reload: () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings())
  const reload = useCallback(() => {
    getSettings().then((s) => {
      setCurrency(s.currency)
      setSettings(s)
    }).catch(() => {})
  }, [])
  useEffect(reload, [reload])
  return <Ctx.Provider value={{ settings, reload }}>{children}</Ctx.Provider>
}

export const useSettings = () => useContext(Ctx)
