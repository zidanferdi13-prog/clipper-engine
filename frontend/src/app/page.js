'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

const FEATURES = [
  {
    icon: '⚡',
    color: 'from-violet-500 to-purple-600',
    title: 'AI-Powered Analysis',
    desc: 'GPT-4 analyzes video & scores viral potential with multi-factor heuristics.',
  },
  {
    icon: '🎬',
    color: 'from-blue-500 to-cyan-600',
    title: 'Auto Subtitle',
    desc: 'Whisper AI transcribes audio. Word-by-word subtitles burned directly into clips.',
  },
  {
    icon: '📈',
    color: 'from-emerald-500 to-teal-600',
    title: 'Viral Scoring',
    desc: 'Keyword density, speech energy, hook strength — scored and ranked automatically.',
  },
  {
    icon: '🎯',
    color: 'from-orange-500 to-rose-600',
    title: '9:16 Smart Crop',
    desc: 'Auto-reframe to portrait. Loudness normalization & color grading included.',
  },
]

const STEPS = [
  { n: '01', label: 'Paste URL',     desc: 'YouTube, TikTok, Podcast — any URL.' },
  { n: '02', label: 'AI Analyzes',   desc: 'Transcribe, score, pick top moments.' },
  { n: '03', label: 'Auto Render',   desc: 'Crop, subtitle, enhance, export.' },
  { n: '04', label: 'Download',      desc: 'Ready for TikTok, Reels & Shorts.' },
]

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b" style={{ background: 'rgba(10,10,15,0.85)', borderColor: 'var(--border)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>✂</div>
            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Clipper AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
              Login
            </Link>
            <Link href="/register" className="btn-primary text-sm px-5 py-2">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="hero-bg pt-40 pb-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-8 border" style={{ background: 'rgba(124,58,237,0.12)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            AI-Powered Viral Clip Generator
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6" style={{ color: 'var(--text-primary)' }}>
            Turn Long Videos into
            <br />
            <span className="gradient-text">Viral Shorts</span> Automatically
          </h1>

          <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            Upload any video or paste a YouTube URL. AI finds the best moments, renders 9:16 clips
            with animated subtitles, and optimizes them for TikTok, Reels & Shorts.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => router.push('/register')} className="btn-primary text-base px-8 py-3.5 glow-pulse">
              Start Free →
            </button>
            <button onClick={() => router.push('/login')} className="btn-secondary text-base px-8 py-3.5">
              Sign In
            </button>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex justify-center gap-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>✅ No credit card required</span>
            <span>✅ 10 free clips on signup</span>
            <span>✅ 9:16 + subtitles included</span>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3" style={{ color: 'var(--text-primary)' }}>
            Everything you need to go viral
          </h2>
          <p className="text-center mb-14" style={{ color: 'var(--text-muted)' }}>
            Production-grade AI pipeline — no editing skills required.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="glass-card-hover p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 hero-bg">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14" style={{ color: 'var(--text-primary)' }}>
            How It Works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="glass-card p-6 text-center relative">
                <div className="text-4xl font-black mb-3 gradient-text">{s.n}</div>
                <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{s.label}</h4>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 text-xl" style={{ color: 'var(--text-muted)' }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-3xl mx-auto text-center glass-card p-14" style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.25)' }}>
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Ready to Create Viral Content?
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
            Start free — 10 credits included. No credit card needed.
          </p>
          <button onClick={() => router.push('/register')} className="btn-primary text-base px-10 py-4">
            Get Started Free →
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-primary)' }}>
        © {new Date().getFullYear()} Clipper AI — Built for content creators.
      </footer>
    </div>
  )
}
