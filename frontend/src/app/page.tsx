'use client'

import { Suspense } from 'react'

// Placeholder components
const KPICards = () => {
  const kpis = [
    { title: 'Total Revenue', value: '$2.8M', change: '+12.5%', trend: 'up' },
    { title: 'First-Pass Yield', value: '87.3%', change: '+2.1%', trend: 'up' },
    { title: 'Denial Rate', value: '12.7%', change: '-1.2%', trend: 'down' },
    { title: 'Avg TAT Days', value: '28.5', change: '-3.2', trend: 'down' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{kpi.title}</p>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className={`text-sm ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.change}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const FunnelChart = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold mb-4">Encounter → Claim Funnel</h3>
    <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded">
      <p className="text-gray-500">Funnel chart will be rendered here</p>
    </div>
  </div>
)

const DenialChart = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold mb-4">Denial Analytics</h3>
    <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded">
      <p className="text-gray-500">Denial chart will be rendered here</p>
    </div>
  </div>
)

const CashChart = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold mb-4">Cash Realization</h3>
    <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded">
      <p className="text-gray-500">Cash chart will be rendered here</p>
    </div>
  </div>
)

const OpsChart = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold mb-4">Operational Metrics</h3>
    <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded">
      <p className="text-gray-500">Operations chart will be rendered here</p>
    </div>
  </div>
)

const DashboardHeader = () => (
  <header className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-4">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Cerebra-MD</h1>
            <p className="text-sm text-gray-500">HHA Medicine Analytics</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
            <div>
              <span className="font-medium">Last Updated:</span>
              <span className="ml-1">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div>
              <span className="font-medium">Status:</span>
              <span className="ml-1 text-green-600">● Live</span>
            </div>
          </div>
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">AD</span>
          </div>
        </div>
      </div>
    </div>
  </header>
)

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    <span className="sr-only">Loading...</span>
  </div>
)

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Cerebra-MD Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Healthcare revenue cycle analytics for HHA Medicine
            </p>
          </div>

          <Suspense fallback={<LoadingSpinner />}>
            <KPICards />
          </Suspense>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<LoadingSpinner />}>
              <FunnelChart />
            </Suspense>
            
            <Suspense fallback={<LoadingSpinner />}>
              <DenialChart />
            </Suspense>
            
            <Suspense fallback={<LoadingSpinner />}>
              <CashChart />
            </Suspense>
            
            <Suspense fallback={<LoadingSpinner />}>
              <OpsChart />
            </Suspense>
          </div>

          <footer className="mt-12 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div>
                <p>© 2025 HHA Medicine. All rights reserved.</p>
              </div>
              <div className="flex space-x-4">
                <span>Last updated: {new Date().toLocaleDateString()}</span>
                <span>•</span>
                <span>Data refreshed daily at 8:00 AM</span>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}