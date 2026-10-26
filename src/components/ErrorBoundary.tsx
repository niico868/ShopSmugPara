import { Component, type ReactNode } from 'react'

const RELOAD_KEY = 'sp.chunk-reload'

/** Shows a friendly message instead of a blank page when something crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(error)
    // After a redeploy, old page chunks disappear. Reload once to pick up the new build.
    if (/dynamically imported module|Importing a module script failed|Loading chunk/i.test(error.message)) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1')
          location.reload()
        }
      } catch { /* storage blocked */ }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center">
        <div className="max-w-md">
          <p className="font-poster text-5xl text-acid">Something broke</p>
          <p className="mt-3 text-sm text-ink-400">Reloading usually fixes it. If it keeps happening, send this message to support:</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-ink-900 p-3 text-left text-xs text-flame">{this.state.error.message}</pre>
          <button onClick={() => location.reload()} className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white">Reload page</button>
        </div>
      </div>
    )
  }
}
