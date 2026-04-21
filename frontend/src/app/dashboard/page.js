'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import DashboardLayout from '@/components/DashboardLayout'
import CreateJobForm from '@/components/CreateJobForm'
import JobList from '@/components/JobList'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs/my-jobs')
      if (response.data.success) {
        setJobs(response.data.data.jobs)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJobCreated = () => {
    fetchJobs()
    toast.success('Job created successfully!')
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">

        {/* ── Stats ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: 'Credits Remaining', value: user?.credits ?? 0, icon: '💎', color: 'from-violet-500 to-purple-600' },
            { label: 'Total Jobs',        value: jobs.length,         icon: '⚡', color: 'from-blue-500 to-cyan-600'   },
            { label: 'Current Plan',      value: (user?.plan || 'Free').toUpperCase(), icon: '🌟', color: 'from-emerald-500 to-teal-600' },
          ].map(s => (
            <div key={s.label} className="glass-card p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Create Job Form */}
        <CreateJobForm onJobCreated={handleJobCreated} />

        {/* Jobs List */}
        <JobList jobs={jobs} loading={loading} onRefresh={fetchJobs} />
      </div>
    </DashboardLayout>
  )
}
