'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function CreateJobForm({ onJobCreated }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sourceUrl: '',
    clips: 5,
    subtitleStyle: 'tiktok',
    aspectRatio: '9:16'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/jobs/create', {
        sourceUrl: formData.sourceUrl,
        settings: {
          clips: parseInt(formData.clips),
          subtitleStyle: formData.subtitleStyle,
          aspectRatio: formData.aspectRatio
        }
      })

      if (response.data.success) {
        toast.success('Job created! Processing will start shortly.')
        setFormData({
          sourceUrl: '',
          clips: 5,
          subtitleStyle: 'tiktok',
          aspectRatio: '9:16'
        })
        onJobCreated && onJobCreated()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-violet-500 transition-all'
  const inputStyle = { background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }
  const labelCls = 'block text-xs font-medium mb-1.5'
  const labelStyle = { color: 'var(--text-muted)' }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>⚡</div>
        <div>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Create New Job</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Paste a video URL and let AI find the best clips</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelCls} style={labelStyle}>Video URL</label>
          <input
            type="url"
            required
            value={formData.sourceUrl}
            onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
            className={inputCls}
            style={inputStyle}
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Supports YouTube, TikTok, Instagram, and more</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Number of Clips</label>
            <select
              value={formData.clips}
              onChange={(e) => setFormData({ ...formData, clips: e.target.value })}
              className={inputCls}
              style={inputStyle}
            >
              <option value="3">3 clips</option>
              <option value="5">5 clips</option>
              <option value="10">10 clips</option>
            </select>
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Subtitle Style</label>
            <select
              value={formData.subtitleStyle}
              onChange={(e) => setFormData({ ...formData, subtitleStyle: e.target.value })}
              className={inputCls}
              style={inputStyle}
            >
              <option value="A">Style A — Yellow Highlight</option>
              <option value="B">Style B — Cinematic</option>
              <option value="C">Style C — Meme Bold</option>
            </select>
          </div>

          <div>
            <label className={labelCls} style={labelStyle}>Aspect Ratio</label>
            <select
              value={formData.aspectRatio}
              onChange={(e) => setFormData({ ...formData, aspectRatio: e.target.value })}
              className={inputCls}
              style={inputStyle}
            >
              <option value="9:16">9:16 — Vertical (TikTok/Reels)</option>
              <option value="1:1">1:1 — Square (Instagram)</option>
              <option value="16:9">16:9 — Horizontal (YouTube)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Creating Job...' : '⚡ Generate Viral Clips'}
        </button>
      </form>
    </div>
  )
}
