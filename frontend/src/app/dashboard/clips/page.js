'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import api from '@/lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(sec) {
  const s = Math.round(sec || 0)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function scoreColor(score) {
  if (score >= 80) return '#4ade80'
  if (score >= 60) return '#facc15'
  if (score >= 40) return '#fb923c'
  return '#f87171'
}

function scoreBadgeBg(score) {
  if (score >= 80) return 'rgba(74,222,128,0.15)'
  if (score >= 60) return 'rgba(250,204,21,0.15)'
  if (score >= 40) return 'rgba(251,146,60,0.15)'
  return 'rgba(248,113,113,0.15)'
}

const TONE_EMOJI = {
  funny: '😂', inspiring: '✨', shocking: '😱',
  educational: '📚', relatable: '🤝', neutral: '😐',
}

const CATEGORY_BG = {
  business:   'rgba(59,130,246,0.15)',
  motivation: 'rgba(139,92,246,0.15)',
  comedy:     'rgba(250,204,21,0.15)',
  tutorial:   'rgba(34,211,238,0.15)',
  story:      'rgba(236,72,153,0.15)',
  general:    'rgba(100,116,139,0.15)',
}
const CATEGORY_COLOR = {
  business:   '#60a5fa',
  motivation: '#a78bfa',
  comedy:     '#facc15',
  tutorial:   '#22d3ee',
  story:      '#f472b6',
  general:    '#94a3b8',
}

// ─── Score Bar Component ───────────────────────────────────────────────────────
function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
        <span>{label}</span>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{value}/100</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: scoreColor(value) }}
        />
      </div>
    </div>
  )
}

// ─── Clip Card ─────────────────────────────────────────────────────────────────
function ClipCard({ clip, jobTitle }) {
  const ai = clip.aiAnalysis || {}
  const duration = Math.max(0, (clip.end || 0) - (clip.start || 0))
  const hasVideo = !!clip.fileUrl
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) { videoRef.current.pause(); setPlaying(false) }
    else          { videoRef.current.play();  setPlaying(true)  }
  }

  return (
    <article className="rounded-xl overflow-hidden flex flex-col transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

      {/* Thumbnail / Video */}
      <div className="relative bg-gray-900 aspect-video">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={clip.fileUrl}
              poster={clip.thumbnailUrl || undefined}
              className="w-full h-full object-cover"
              onEnded={() => setPlaying(false)}
              preload="metadata"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <span className="w-14 h-14 flex items-center justify-center rounded-full bg-white/90 text-gray-900 text-2xl shadow">
                {playing ? '⏸' : '▶'}
              </span>
            </button>
          </>
        ) : clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
            No preview
          </div>
        )}

        {/* Score badge overlay */}
        <span
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: scoreBadgeBg(clip.score), color: scoreColor(clip.score) }}
        >
          {clip.score ?? '–'} pts
        </span>

        {/* Duration */}
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
          {fmt(duration)}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* Title + meta */}
        <div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{clip.title || 'Untitled Clip'}</h3>
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{clip.description || ''}</p>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5">
          {ai.category && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: CATEGORY_BG[ai.category] || CATEGORY_BG.general, color: CATEGORY_COLOR[ai.category] || CATEGORY_COLOR.general }}
            >
              {ai.category}
            </span>
          )}
          {ai.emotionalTone && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              {TONE_EMOJI[ai.emotionalTone] || ''} {ai.emotionalTone}
            </span>
          )}
          {(ai.keywords || []).slice(0, 3).map(kw => (
            <span key={kw} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
              #{kw}
            </span>
          ))}
        </div>

        {/* Timestamps */}
        <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>▶ {fmt(clip.start)}</span>
          <span>⏹ {fmt(clip.end)}</span>
          <span>⏱ {duration.toFixed(1)}s</span>
        </div>

        {/* Score bars */}
        <div className="space-y-1.5">
          <ScoreBar label="Viral Score"  value={clip.score       ?? 0} />
          <ScoreBar label="Hook Strength" value={ai.hookStrength ?? 0} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 mt-auto">
          {hasVideo && (
            <a
              href={clip.fileUrl}
              download
              className="flex-1 text-center py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
            >
              ⬇ Download
            </a>
          )}
          {clip.subtitleUrl && (
            <a
              href={clip.subtitleUrl}
              download
              className="py-2 px-3 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              title="Download subtitles"
            >
              💬 SRT
            </a>
          )}
          {!hasVideo && (
            <span className="flex-1 text-center py-2 px-3 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              Rendering…
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ClipsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [jobs, setJobs] = useState([])
  const [clipsByJob, setClipsByJob] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [sortBy, setSortBy] = useState('score')   // score | duration | title
  const [filterCategory, setFilterCategory] = useState('all')
  const [minScore, setMinScore] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))

    const params = new URLSearchParams(window.location.search)
    setSelectedJobId(params.get('jobId') || '')

    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const jobsRes  = await api.get('/jobs/my-jobs?limit=100')
      const allJobs  = jobsRes.data?.data?.jobs || []
      const done     = allJobs.filter(j => j.status === 'completed')
      setJobs(done)

      const entries = await Promise.all(
        done.map(async (job) => {
          try {
            const r = await api.get(`/clips/by-job/${job._id}`)
            return [job._id, r.data?.data?.clips || []]
          } catch { return [job._id, []] }
        })
      )
      setClipsByJob(Object.fromEntries(entries))
    } finally {
      setLoading(false)
    }
  }

  // All categories present in results
  const allCategories = useMemo(() => {
    const cats = new Set()
    Object.values(clipsByJob).flat().forEach(c => {
      if (c.aiAnalysis?.category) cats.add(c.aiAnalysis.category)
    })
    return ['all', ...cats]
  }, [clipsByJob])

  // Visible jobs
  const visibleJobs = useMemo(() =>
    selectedJobId ? jobs.filter(j => j._id === selectedJobId) : jobs,
    [jobs, selectedJobId]
  )

  // Total clip count
  const totalClips = useMemo(() =>
    visibleJobs.reduce((acc, j) => acc + (clipsByJob[j._id]?.length || 0), 0),
    [visibleJobs, clipsByJob]
  )

  // Filter + sort clips for a given job
  const processClips = (clips) => {
    let result = clips.filter(c => {
      const score = c.score ?? 0
      const cat   = c.aiAnalysis?.category || 'general'
      const q     = search.toLowerCase()
      return (
        score >= minScore &&
        (filterCategory === 'all' || cat === filterCategory) &&
        (!q || c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      )
    })

    return result.sort((a, b) => {
      if (sortBy === 'score')    return (b.score ?? 0) - (a.score ?? 0)
      if (sortBy === 'duration') return ((b.end - b.start) - (a.end - a.start))
      return (a.title || '').localeCompare(b.title || '')
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Clips</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Loading…' : `${totalClips} clips from ${visibleJobs.length} job${visibleJobs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Filter Bar */}
        <div className="glass-card p-4 flex flex-wrap gap-3 items-end">

          {/* Job selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Job</label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">All jobs</option>
              {jobs.map(j => (
                <option key={j._id} value={j._id}>{j.title || j.sourceUrl}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Category</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {allCategories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
              ))}
            </select>
          </div>

          {/* Min score */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Min Score: {minScore}</label>
            <input
              type="range" min={0} max={100} step={5}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-32 h-9 accent-indigo-600"
            />
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Sort by</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="score">Score (high → low)</option>
              <option value="duration">Duration (long → short)</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Search</label>
            <input
              type="text"
              placeholder="Title or keyword…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg outline-none focus:ring-2 focus:ring-violet-500 w-full"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span className="animate-spin mr-2">⏳</span> Loading clips…
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
            <div className="text-5xl mb-3">🎬</div>
            <p className="text-sm">No completed jobs yet. Submit a video to get started.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {visibleJobs.map(job => {
              const rawClips = clipsByJob[job._id] || []
              const clips    = processClips(rawClips)
              return (
                <section key={job._id}>

                  {/* Job header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{job.title || 'Untitled Job'}</h2>
                      <p className="text-xs truncate max-w-md" style={{ color: 'var(--text-muted)' }}>{job.sourceUrl}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{clips.length} / {rawClips.length} clips</span>
                      {/* Download all */}
                      {clips.some(c => c.fileUrl) && (
                        <button
                          onClick={() => clips.filter(c => c.fileUrl).forEach(c => {
                            const a = document.createElement('a')
                            a.href = c.fileUrl; a.download = ''; a.click()
                          })}
                          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                        >
                          ⬇ Download All
                        </button>
                      )}
                    </div>
                  </div>

                  {clips.length === 0 ? (
                    <div className="text-center py-10 rounded-xl text-sm" style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                      No clips match your filters.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {clips.map(clip => (
                        <ClipCard key={clip._id} clip={clip} jobTitle={job.title} />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

