'use client'

import { useJobProgress } from '../hooks/useJobProgress';

const STATUS_CONFIG = {
  pending:      { label: 'Pending',      bg: 'rgba(100,116,139,0.2)', color: '#94a3b8', icon: '⏳' },
  downloading:  { label: 'Downloading',  bg: 'rgba(59,130,246,0.2)',  color: '#60a5fa', icon: '⬇' },
  transcribing: { label: 'Transcribing', bg: 'rgba(99,102,241,0.2)',  color: '#818cf8', icon: '🎙' },
  analyzing:    { label: 'Analyzing',    bg: 'rgba(139,92,246,0.2)',  color: '#a78bfa', icon: '🧠' },
  rendering:    { label: 'Rendering',    bg: 'rgba(234,179,8,0.2)',   color: '#facc15', icon: '🎬' },
  completed:    { label: 'Completed',    bg: 'rgba(34,197,94,0.2)',   color: '#4ade80', icon: '✅' },
  failed:       { label: 'Failed',       bg: 'rgba(239,68,68,0.2)',   color: '#f87171', icon: '❌' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function JobItem({ job }) {
  const { progress, status, message } = useJobProgress(job._id);

  const currentProgress = progress !== null ? progress : (job.progress || 0);
  const currentStatus   = status  !== null ? status  : job.status;
  const currentMessage  = message;
  const errorMessage =
    typeof job.error === 'string'
      ? job.error
      : job.error?.message || null;

  const progressColor =
    currentStatus === 'completed' ? '#4ade80' :
    currentStatus === 'failed'    ? '#f87171' :
    currentStatus === 'rendering' ? '#facc15' : '#7c3aed';

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {job.title || 'Untitled Job'}
          </h3>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {job.sourceUrl}
          </p>
          {currentMessage && (
            <p className="text-xs mt-1.5" style={{ color: '#818cf8' }}>{currentMessage}</p>
          )}
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
          <span>Progress</span>
          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{currentProgress}%</span>
        </div>
        <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bg-secondary)' }}>
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${currentProgress}%`, background: progressColor }}
          />
        </div>
      </div>

      {errorMessage && (
        <div
          className="mt-3 p-3 rounded-lg text-xs"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
        >
          {errorMessage}
        </div>
      )}

      {currentStatus === 'completed' && (
        <div className="mt-3">
          <a
            href={`/dashboard/clips?jobId=${job._id}`}
            className="text-xs font-semibold transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            View Clips →
          </a>
        </div>
      )}
    </div>
  );
}

export default function JobList({ jobs, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 rounded-lg w-1/4" style={{ background: 'var(--bg-secondary)' }} />
          <div className="h-20 rounded-xl" style={{ background: 'var(--bg-secondary)' }} />
          <div className="h-20 rounded-xl" style={{ background: 'var(--bg-secondary)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Processing Queue</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          ↻ Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🎬</div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No jobs yet</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Paste a video URL above to create your first job.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobItem key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
