'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({ children, user }) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg"></div>
                <h1 className="text-2xl font-bold text-gray-900">AI Clipper</h1>
              </Link>
              <nav className="flex space-x-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/dashboard/clips" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Clips
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.credits} credits</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
