'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/dashboard',       label: 'Dashboard', icon: '⚡' },
  { href: '/dashboard/clips', label: 'My Clips',  icon: '🎬' },
]

export default function DashboardLayout({ children, user }) {
  const router   = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Top Nav ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(10,10,15,0.9)', borderColor: 'var(--border)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>✂</div>
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Clipper AI</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map(n => {
                const active = pathname === n.href
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
                      color:      active ? '#a78bfa' : 'var(--text-muted)',
                      borderBottom: active ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                    }}
                  >
                    <span>{n.icon}</span>{n.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User info */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="text-violet-400 font-semibold">{user?.credits ?? 0}</span> credits
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm px-4 py-1.5"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}

