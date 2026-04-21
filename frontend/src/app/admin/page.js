'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
        return;
      }
      fetchData();
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [statsRes, usersRes, jobsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users?limit=10'),
        api.get('/api/admin/jobs?limit=10')
      ]);

      setStats(statsRes.data.data.stats);
      setUsers(usersRes.data.data.users);
      setJobs(jobsRes.data.data.jobs);
    } catch (error) {
      toast.error('Failed to fetch admin data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await api.patch(`/api/admin/users/${userId}`, { status });
      toast.success('User status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      await api.post(`/api/admin/jobs/${jobId}/retry`);
      toast.success('Job queued for retry');
      fetchData();
    } catch (error) {
      toast.error('Failed to retry job');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage users, jobs, and system settings</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'users', 'jobs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Users" value={stats.users.total} icon="👥" color="blue" />
              <StatCard title="Active Users" value={stats.users.active} icon="✅" color="green" />
              <StatCard title="Total Jobs" value={stats.jobs.total} icon="📊" color="purple" />
              <StatCard title="Processing" value={stats.jobs.processing} icon="⚙️" color="yellow" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Completed Jobs" value={stats.jobs.completed} icon="✓" color="green" />
              <StatCard title="Failed Jobs" value={stats.jobs.failed} icon="✗" color="red" />
              <StatCard title="Total Clips" value={stats.clips.total} icon="🎬" color="indigo" />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h3>
              <div className="space-y-3">
                {stats.recentActivity?.slice(0, 5).map((job) => (
                  <div key={job._id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-medium text-gray-900">{job.sourceUrl}</p>
                      <p className="text-sm text-gray-500">User: {job.userId?.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.credits}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={user.status}
                          onChange={(e) => handleUpdateUserStatus(user._id, e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="banned">Banned</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Job Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {job._id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.userId?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {job.sourceUrl}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.progress}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleRetryJob(job._id)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`${colorClasses[color]} w-12 h-12 rounded-full flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    pending: 'bg-gray-200 text-gray-800',
    downloading: 'bg-blue-200 text-blue-800',
    transcribing: 'bg-indigo-200 text-indigo-800',
    analyzing: 'bg-purple-200 text-purple-800',
    rendering: 'bg-yellow-200 text-yellow-800',
    completed: 'bg-green-200 text-green-800',
    failed: 'bg-red-200 text-red-800'
  };
  return colors[status] || 'bg-gray-200 text-gray-800';
}
