import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Navigation,
  Flame,
  FlaskConical,
  AlertTriangle,
  Wind,
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
    <div className="flex h-full bg-navy-950 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-navy-900 border-r border-navy-500 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-navy-500">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center flex-shrink-0">
            <Wind className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-white leading-tight">RailAir</div>
            <div className="text-xs text-slate-400 leading-tight">Intelligence</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <p className="px-4 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
            Dashboard
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-navy-600 text-cyan-400 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-navy-500">
          <div className="text-xs text-slate-500 leading-relaxed">
            v0.1-mvp · Simulation data only
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-12 bg-navy-800 border-b border-navy-500 flex items-center px-5 gap-4">
          <h1 className="text-sm font-semibold text-white">
            {currentNav?.label ?? 'RailAir Intelligence'}
          </h1>
          <span className="text-slate-500 text-xs">·</span>
          <span className="text-xs text-slate-400">Meerut → New Delhi Corridor</span>
          <div className="ml-auto flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">All data simulated</span>
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
