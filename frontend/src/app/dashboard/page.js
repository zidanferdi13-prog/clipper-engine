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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Credits Remaining</p>
                <p className="text-3xl font-bold text-gray-900">{user?.credits || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">{jobs.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Plan</p>
                <p className="text-3xl font-bold text-gray-900 capitalize">{user?.plan || 'Free'}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Create Job Form */}
        <CreateJobForm onJobCreated={handleJobCreated} />

        {/* Jobs List */}
        <JobList jobs={jobs} loading={loading} onRefresh={fetchJobs} />
      </div>
    </DashboardLayout>
  )
}
