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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Clip Job</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video URL
          </label>
          <input
            type="url"
            required
            value={formData.sourceUrl}
            onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="mt-1 text-sm text-gray-500">Supports YouTube, TikTok, Instagram, and more</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Clips
            </label>
            <select
              value={formData.clips}
              onChange={(e) => setFormData({ ...formData, clips: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="3">3 clips</option>
              <option value="5">5 clips</option>
              <option value="10">10 clips</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtitle Style
            </label>
            <select
              value={formData.subtitleStyle}
              onChange={(e) => setFormData({ ...formData, subtitleStyle: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="tiktok">TikTok Style</option>
              <option value="youtube">YouTube Style</option>
              <option value="minimal">Minimal</option>
              <option value="bold">Bold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aspect Ratio
            </label>
            <select
              value={formData.aspectRatio}
              onChange={(e) => setFormData({ ...formData, aspectRatio: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="9:16">9:16 (Vertical)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Horizontal)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Job...' : 'Create Clips'}
        </button>
      </form>
    </div>
  )
}
