'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg"></div>
            <h1 className="text-2xl font-bold text-gray-900">AI Clipper</h1>
          </div>
          <div className="flex space-x-4">
            <Link 
              href="/login"
              className="text-gray-700 hover:text-gray-900 px-4 py-2"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 sm:text-6xl mb-6">
            Turn Long Videos into
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {' '}Viral Clips
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI-powered platform yang otomatis memotong video panjang jadi short-form viral content 
            dengan subtitle, thumbnail, dan optimasi untuk TikTok, Reels & YouTube Shorts.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/register')}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => router.push('/demo')}
              className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition shadow-lg border-2 border-gray-200"
            >
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Analysis</h3>
            <p className="text-gray-600">
              GPT-4 menganalisis video dan menemukan momen terbaik yang paling berpotensi viral.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Auto Subtitle</h3>
            <p className="text-gray-600">
              Whisper AI transcribe audio dan generate subtitle otomatis dengan berbagai style.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Viral Optimization</h3>
            <p className="text-gray-600">
              Otomatis resize ke 9:16, tambah hook, dan optimize untuk algoritma TikTok/Reels.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Paste URL</h4>
              <p className="text-gray-600 text-sm">Upload atau paste link video dari YouTube, TikTok, dll.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h4 className="font-bold text-gray-900 mb-2">AI Analysis</h4>
              <p className="text-gray-600 text-sm">AI analyze content dan cari momen viral terbaik.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Auto Render</h4>
              <p className="text-gray-600 text-sm">Potong, resize, tambah subtitle otomatis.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Download & Share</h4>
              <p className="text-gray-600 text-sm">Download clips dan langsung upload ke social media.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Create Viral Content?
          </h3>
          <p className="text-blue-100 text-lg mb-8">
            Mulai gratis, dapat 10 credits untuk mencoba platform kami.
          </p>
          <button
            onClick={() => router.push('/register')}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            Start Free Trial
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            © 2024 AI Clipper. Made with ❤️ for content creators.
          </p>
        </div>
      </footer>
    </div>
  )
}
