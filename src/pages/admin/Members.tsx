import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { listMembers, type Member } from '../../lib/members'
import { Button, Empty, PageLoader } from '../../components/ui'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const birthday = (m: Member) => (m.birth_month && m.birth_day ? `${m.birth_day} ${MONTHS[m.birth_month - 1]}` : '')
// Spreadsheet apps run cells starting with these as formulas, so sign-up text is made safe first.
const csvCell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`

export default function MembersAdmin() {
  const [rows, setRows] = useState<Member[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { listMembers().then(setRows).catch((e: Error) => { setError(e.message); setRows([]) }) }, [])

  const exportCsv = () => {
    const lines = [['Name', 'Email', 'Birthday', 'Joined', 'Source'], ...(rows ?? []).map((m) => [m.name, m.email, birthday(m), (m.created_at ?? '').slice(0, 10), m.source])]
    const url = URL.createObjectURL(new Blob([lines.map((l) => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'smugpara-members.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!rows) return <PageLoader />
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-medium text-3xl ">Members <span className="font-sans text-base font-normal text-ink-400">{rows.length}</span></h1>
        {rows.length > 0 && <Button variant="outline" size="sm" onClick={exportCsv}><Download size={14} /> Export CSV</Button>}
      </div>
      {error && <p className="mb-4 text-sm text-flame">{error}</p>}
      {rows.length === 0 ? <Empty title="No members yet">Sign-ups from the pop-up and the members page land here.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-ink-400"><tr>{['Name', 'Email', 'Birthday', 'Joined'].map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.email} className="border-t border-ink-800">
                  <td className="py-2 pr-4 font-semibold">{m.name}</td>
                  <td className="py-2 pr-4">{m.email}</td>
                  <td className="py-2 pr-4">{birthday(m)}</td>
                  <td className="py-2 pr-4">{(m.created_at ?? '').slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
