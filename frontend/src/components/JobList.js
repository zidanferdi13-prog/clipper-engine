'use client'

import { useJobProgress } from '../hooks/useJobProgress';

function JobItem({ job }) {
  const { progress, status, message } = useJobProgress(job._id);

  // Use WebSocket data if available, otherwise use job data
  const currentProgress = progress || job.progress || 0;
  const currentStatus = status || job.status;
  const currentMessage = message;

  const getStatusColor = (status) => {
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
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{job.title || 'Untitled Job'}</h3>
          <p className="text-sm text-gray-500 mt-1">{job.sourceUrl}</p>
          {currentMessage && (
            <p className="text-sm text-blue-600 mt-2">{currentMessage}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
          {currentStatus}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{currentProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${currentProgress}%` }}
          ></div>
        </div>
      </div>

      {job.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {job.error}
        </div>
      )}

      {currentStatus === 'completed' && (
        <div className="mt-4 flex gap-2">
          <a
            href={`/jobs/${job._id}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Jobs</h2>
        <button
          onClick={onRefresh}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first clip job.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobItem key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
