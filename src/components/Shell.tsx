import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Navigation,
  Flame,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react';
import { SimBanner } from './SimBanner';

const NAV_ITEMS = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/corridor', label: 'Corridor Map', icon: Map },
  { to: '/journey', label: 'Journey Planner', icon: Navigation },
  { to: '/hotspots', label: 'Hotspots', icon: Flame },
  { to: '/interventions', label: 'Interventions', icon: FlaskConical },
];

export function Shell() {
  const location = useLocation();
  const currentNav = NAV_ITEMS.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="flex h-full bg-[#F5F6F8] text-[#192734] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#17365D] border-r border-[#122b4a] flex flex-col text-slate-200 shadow-sm z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f426e]">
          <div className="w-8 h-8 rounded bg-white text-[#17365D] flex items-center justify-center font-bold text-sm tracking-wider font-mono shadow-xs">
            RA
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-white tracking-tight leading-tight">RailAir</div>
            <div className="text-[10px] text-slate-300 font-mono tracking-tight leading-tight">Intelligence Prototype</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Navigation System
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-[#17365D] shadow-sm font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-[#122b4a]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#1f426e] text-[10px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5 text-emerald-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>GEO-PROVENANCE: ACTIVE</span>
          </div>
          <div className="text-slate-400">Delhi Division · Simulated v0.1</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F6F8]">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-[#DCE3EA] flex items-center justify-between px-6 z-20 shadow-2xs">
          <div className="flex items-center space-x-3">
            <h1 className="text-sm font-semibold text-[#17365D] tracking-tight">
              {currentNav?.label ?? 'RailAir Intelligence'}
            </h1>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-mono text-slate-500">Meerut → New Delhi Corridor (83 km · 7 Nodes)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-[#64748B] bg-[#F8FAFC] border border-[#DCE3EA] px-3 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>NR FLEET SPEC: WAP-7</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-[11px] text-amber-800 font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulated Sample Data</span>
            </div>
          </div>
        </header>

        {/* Sim Banner */}
        <SimBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
