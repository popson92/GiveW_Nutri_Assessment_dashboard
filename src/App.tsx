import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Map, GitCompare, HeartPulse, Package, Building2,
  Target, Tag, Search, ChevronLeft, ChevronRight, Menu,
} from 'lucide-react'
import { useDataLoader, FilterContext } from './hooks/useData'
import type { StateFilter } from './types'
import Overview from './pages/Overview'
import Geographic from './pages/Geographic'
import Reconciliation from './pages/Reconciliation'
import Outcomes from './pages/Outcomes'
import RutfAnalysis from './pages/RutfAnalysis'
import Footprint from './pages/Footprint'
import Sampling from './pages/Sampling'
import OpportunityClass from './pages/OpportunityClass'
import FacilityExplorer from './pages/FacilityExplorer'

const NAV_ITEMS = [
  { path: '/', label: 'Executive Overview', icon: LayoutDashboard },
  { path: '/geographic', label: 'Geographic Intelligence', icon: Map },
  { path: '/reconciliation', label: 'Admissions Reconciliation', icon: GitCompare },
  { path: '/outcomes', label: 'Treatment Outcomes', icon: HeartPulse },
  { path: '/rutf', label: 'RUTF Supply Analysis', icon: Package },
  { path: '/footprint', label: 'Treatment Footprint', icon: Building2 },
  { path: '/sampling', label: 'Sampling Intelligence', icon: Target },
  { path: '/classification', label: 'Opportunity Classification', icon: Tag },
  { path: '/facilities', label: 'Facility Explorer', icon: Search },
]

export default function App() {
  const data = useDataLoader()
  const [stateFilter, setStateFilter] = useState<StateFilter>('Combined')
  const [lgaFilter, setLgaFilter] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  if (data.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading assessment data...</p>
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          <p className="font-bold text-lg">Error loading data</p>
          <p className="text-sm mt-2">{data.error}</p>
        </div>
      </div>
    )
  }

  return (
    <FilterContext.Provider value={{ stateFilter, setStateFilter, lgaFilter, setLgaFilter }}>
      <div className="min-h-screen flex bg-gray-50">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-16'
          } hidden lg:flex`}
        >
          <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">SAM Assessment</p>
                <p className="text-[10px] text-gray-500 truncate">Kaduna & Kano</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0"
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'} ${!sidebarOpen ? 'justify-center px-0' : ''}`
                }
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {sidebarOpen && (
            <div className="px-4 py-3 border-t border-gray-100 text-[10px] text-gray-400">
              <p>Solina Health / SCIDaR</p>
              <p>Data: Sep 2024 – Aug 2026</p>
            </div>
          )}
        </aside>

        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center px-4">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <span className="ml-3 font-bold text-sm text-gray-900">SAM Assessment Dashboard</span>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col">
              <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">SAM Assessment</p>
                  <p className="text-[10px] text-gray-500">Kaduna & Kano</p>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`
                    }
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} mt-14 lg:mt-0`}>
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200 h-14 hidden lg:flex items-center px-6 justify-between">
            <div>
              <h1 className="text-sm font-bold text-gray-900">
                GiveWell SAM Treatment Assessment Dashboard
              </h1>
              <p className="text-[11px] text-gray-500">
                Kaduna & Kano States — Sep 2024 to Aug 2026
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 mr-2">State:</span>
              {(['Combined', 'Kaduna', 'Kano'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStateFilter(s)
                    setLgaFilter(null)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    stateFilter === s
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </header>

          {/* Mobile state filter */}
          <div className="lg:hidden sticky top-14 z-20 bg-white border-b border-gray-200 px-4 py-2 flex gap-2">
            {(['Combined', 'Kaduna', 'Kano'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStateFilter(s)
                  setLgaFilter(null)
                }}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  stateFilter === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<Overview data={data} />} />
              <Route path="/geographic" element={<Geographic data={data} />} />
              <Route path="/reconciliation" element={<Reconciliation data={data} />} />
              <Route path="/outcomes" element={<Outcomes data={data} />} />
              <Route path="/rutf" element={<RutfAnalysis data={data} />} />
              <Route path="/footprint" element={<Footprint data={data} />} />
              <Route path="/sampling" element={<Sampling data={data} />} />
              <Route path="/classification" element={<OpportunityClass data={data} />} />
              <Route path="/facilities" element={<FacilityExplorer data={data} />} />
            </Routes>
          </div>
        </main>
      </div>
    </FilterContext.Provider>
  )
}
