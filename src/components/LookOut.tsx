import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BellRing, Instagram, X } from 'lucide-react'
import { INSTAGRAM } from '../lib/brand'
import { Button } from './ui'

type OneSignalSdk = {
  Notifications: { permission: boolean; requestPermission: () => Promise<void> }
}
declare global {
  interface Window { OneSignalDeferred?: ((os: OneSignalSdk) => void | Promise<void>)[] }
}

type Device = 'iphone' | 'android' | 'desktop'

function detectDevice(): Device {
  const ua = navigator.userAgent
  // iPads report as a Mac with a touch screen.
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iphone'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

type AlertState = 'idle' | 'asking' | 'on' | 'blocked' | 'unsupported'

function currentAlertState(): AlertState {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'on'
  if (Notification.permission === 'denied') return 'blocked'
  return 'idle'
}

/** Opens the phone's own "Allow notifications" box through OneSignal (no extra OneSignal pop-up). */
function turnOnAlerts(): Promise<boolean> {
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission()
        resolve(OneSignal.Notifications.permission)
      } catch {
        resolve(false)
      }
    })
  })
}

/** The "Look out" bubble: follow on Instagram, save SmugPara to the home screen, turn on drop alerts. */
export function LookOut({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [device, setDevice] = useState<Device>('desktop')
  const [standalone, setStandalone] = useState(false)
  const [alerts, setAlerts] = useState<AlertState>('idle')

  useEffect(() => {
    if (!open) return
    setDevice(detectDevice())
    setStandalone(isStandalone())
    setAlerts(currentAlertState())
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  // iPhones can only get alerts once SmugPara is opened from its home-screen icon (iOS 16.4+).
  const canAskNow = device !== 'iphone' || standalone
  const showHomeScreenSteps = device !== 'desktop' && !standalone

  const ask = async () => {
    setAlerts('asking')
    const granted = await turnOnAlerts()
    setAlerts(granted ? 'on' : currentAlertState() === 'blocked' ? 'blocked' : 'idle')
  }

  // Rendered on <body>: the page wrapper is animated with a transform, which would pin a
  // fixed overlay to the wrapper instead of the screen.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lookout-title"
        className="max-h-[90vh] w-full max-w-md animate-rise overflow-y-auto bg-white p-6 text-black sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="lookout-title" className="font-pirate text-5xl leading-none">Look out.</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-m-2 p-2 text-ink-400 hover:text-black"><X size={22} /></button>
        </div>
        <p className="mt-3 text-sm text-ink-400">
          A new shipment lands every Wednesday at noon till Christmas Eve. Every run is limited, and when it&rsquo;s gone, it&rsquo;s gone.
        </p>

        <ol className="mt-6 space-y-6">
          <li className="border-t border-black pt-4">
            <p className="font-poster text-sm text-acid">01</p>
            <p className="mt-1 font-semibold uppercase tracking-wide">Follow the socials</p>
            <p className="mt-1 text-sm text-ink-400">Follow us on Instagram, then tap Following &rarr; Notifications and turn on Posts, Stories and Reels.</p>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 border border-black px-5 py-2.5 text-xs font-semibold uppercase tracking-[.2em] transition hover:bg-black hover:text-white">
              <Instagram size={16} /> @smugglerparadise
            </a>
          </li>

          <li className="border-t border-black pt-4">
            <p className="font-poster text-sm text-acid">02</p>
            <p className="mt-1 font-semibold uppercase tracking-wide">Turn on drop alerts</p>

            {showHomeScreenSteps && (
              <>
                <p className="mt-1 text-sm text-ink-400">True members keep SmugPara on their home screen.</p>
                {device === 'iphone' ? (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                    <li>Open this page in Safari.</li>
                    <li>Tap Share (the square with the arrow).</li>
                    <li>Tap <b>Add to Home Screen</b> &rarr; <b>Add</b>.</li>
                    <li>Open SmugPara from the new icon, tap <b>Look out</b> again and turn on alerts.</li>
                  </ol>
                ) : (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                    <li>Tap &#8942; (top right in Chrome).</li>
                    <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
                    <li>Then turn on alerts below.</li>
                  </ol>
                )}
              </>
            )}

            {canAskNow ? (
              <div className="mt-4">
                {alerts === 'on' ? (
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-acid-dark"><BellRing size={16} /> Alerts are on. You&rsquo;ll know when cargo lands.</p>
                ) : alerts === 'blocked' ? (
                  <p className="text-sm text-ink-400">Alerts are blocked for this site. Allow notifications for smugpara.com in your phone or browser settings, then come back.</p>
                ) : alerts === 'unsupported' ? (
                  <p className="text-sm text-ink-400">This browser can&rsquo;t receive alerts. Try Chrome on Android, or the home-screen app on iPhone.</p>
                ) : (
                  <Button size="lg" onClick={ask} disabled={alerts === 'asking'} className="w-full">
                    <BellRing size={18} /> {alerts === 'asking' ? 'Waiting…' : 'Turn on alerts'}
                  </Button>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-400">The alerts button shows up here once SmugPara is opened from your home screen (iOS 16.4 or newer).</p>
            )}
          </li>
        </ol>

        <p className="mt-8 text-center font-pirate text-2xl">Faith rewards the brave. Alerts reward the ready.</p>
      </div>
    </div>,
    document.body,
  )
}
