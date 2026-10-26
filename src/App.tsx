import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  Map, GitCompare, HeartPulse, Package, Building2,
  Target, Tag, Search, ChevronLeft, ChevronRight, Menu, X, Activity,
} from 'lucide-react'
import { useDataLoader, FilterContext } from './hooks/useData'
import type { StateFilter } from './types'
import Geographic from './pages/Geographic'
import Reconciliation from './pages/Reconciliation'
import Outcomes from './pages/Outcomes'
import RutfAnalysis from './pages/RutfAnalysis'
import Footprint from './pages/Footprint'
import Sampling from './pages/Sampling'
import OpportunityClass from './pages/OpportunityClass'
import FacilityExplorer from './pages/FacilityExplorer'

const NAV_ITEMS = [
  { path: '/', label: 'Health Facility Profile', icon: Building2 },
  { path: '/geographic', label: 'Geographic Intelligence', icon: Map },
  { path: '/reconciliation', label: 'Admissions Reconciliation', icon: GitCompare },
  { path: '/outcomes', label: 'Treatment Outcomes', icon: HeartPulse },
  { path: '/rutf', label: 'RUTF Supply Analysis', icon: Package },
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

  if (data.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading assessment data...</p>
          <p className="text-slate-400 text-sm mt-1">Kaduna & Kano States</p>
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-red-600">
          <p className="font-bold text-lg">Error loading data</p>
          <p className="text-sm mt-2">{data.error}</p>
        </div>
      </div>
    )
  }

  return (
    <FilterContext.Provider value={{ stateFilter, setStateFilter, lgaFilter, setLgaFilter }}>
      <div className="min-h-screen flex bg-slate-50">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ${
            sidebarOpen ? 'w-[260px]' : 'w-[68px]'
          } hidden lg:flex`}
          style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #172554 100%)' }}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 px-4 h-[68px] flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 border border-white/10">
              <Activity size={20} className="text-blue-300" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white truncate tracking-wide">SAM Assessment</p>
                <p className="text-[10px] text-blue-300/80 truncate">Kaduna & Kano States</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-blue-300/60 flex-shrink-0 transition-colors"
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-white/10" />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur'
                      : 'text-blue-200/70 hover:bg-white/8 hover:text-white'
                  } ${!sidebarOpen ? 'justify-center px-0' : ''}`
                }
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          {sidebarOpen && (
            <div className="px-4 py-4 border-t border-white/10">
              <p className="text-[10px] text-blue-300/50 font-medium">Solina Health / SCIDaR</p>
              <p className="text-[10px] text-blue-300/40">Data: Sep 2024 – Aug 2026</p>
            </div>
          )}
        </aside>

        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center px-4"
          style={{ background: 'linear-gradient(90deg, #1e3a5f 0%, #172554 100%)' }}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Activity size={18} className="text-blue-300" />
            <span className="font-bold text-[13px] text-white">SAM Assessment Dashboard</span>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 flex flex-col shadow-2xl"
              style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #172554 100%)' }}>
              <div className="flex items-center gap-3 px-4 h-14 border-b border-white/10">
                <Activity size={20} className="text-blue-300" />
                <div>
                  <p className="text-[13px] font-bold text-white">SAM Assessment</p>
                  <p className="text-[10px] text-blue-300/80">Kaduna & Kano States</p>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-blue-200/70 hover:bg-white/8 hover:text-white'
                      }`
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
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[68px]'} mt-14 lg:mt-0`}>
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-[60px] hidden lg:flex items-center px-6 justify-between">
            <div>
              <h1 className="text-[15px] font-bold text-slate-900 tracking-tight">
                GiveWell SAM Treatment Assessment
              </h1>
              <p className="text-[11px] text-slate-500">
                Kaduna & Kano States — September 2024 to August 2026
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
              {(['Combined', 'Kaduna', 'Kano'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStateFilter(s)
                    setLgaFilter(null)
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    stateFilter === s
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/25'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </header>

          {/* Mobile state filter */}
          <div className="lg:hidden sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-2">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {(['Combined', 'Kaduna', 'Kano'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStateFilter(s)
                    setLgaFilter(null)
                  }}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    stateFilter === s
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<Footprint data={data} />} />
              <Route path="/geographic" element={<Geographic data={data} />} />
              <Route path="/reconciliation" element={<Reconciliation data={data} />} />
              <Route path="/outcomes" element={<Outcomes data={data} />} />
              <Route path="/rutf" element={<RutfAnalysis data={data} />} />
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
