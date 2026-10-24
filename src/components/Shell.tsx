import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Navigation,
  Flame,
  FlaskConical,
  AlertTriangle,
  Play,
  Pause,
  Clock,
} from 'lucide-react';
import { SimBanner } from './SimBanner';
import type { ActivePollutant, CorridorContextType } from '../types/railair';
import { getDiurnalFactor, formatHourIST } from '../lib/diurnal';
import emblemImg from '../../UI resources/Futuristic AI Rail Emblem.png';

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

  const [selectedPollutant, setSelectedPollutant] = useState<ActivePollutant>('PM2.5');
  const [selectedHour, setSelectedHour] = useState<number>(18);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const diurnalFactor = getDiurnalFactor(selectedHour);

  // Auto-play through 24-hour diurnal cycle
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSelectedHour((prev) => (prev + 1) % 24);
    }, 1600);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const contextValue: CorridorContextType = {
    selectedPollutant,
    setSelectedPollutant,
    selectedHour,
    setSelectedHour,
    isPlaying,
    setIsPlaying,
    togglePlay,
    diurnalFactor,
  };

  return (
    <div className="flex h-full bg-[#F5F6F8] text-[#192734] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#17365D] border-r border-[#122b4a] flex flex-col text-slate-200 shadow-sm z-20">
        {/* Logo */}
        <NavLink
          to="/"
          title="Back to landing"
          className="flex items-center gap-3 px-5 py-4 border-b border-[#1f426e] hover:bg-[#122b4a] transition-colors group cursor-pointer"
        >
          <img
            src={emblemImg}
            alt="RailAir Intelligence Emblem"
            className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="min-w-0">
            <div className="font-semibold text-sm text-white tracking-tight leading-tight">RailAir</div>
            <div className="text-[10px] text-slate-300 font-mono tracking-tight leading-tight">Intelligence Prototype</div>
          </div>
        </NavLink>

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
        <header className="flex-shrink-0 min-h-14 bg-white border-b border-[#DCE3EA] flex flex-wrap items-center justify-between px-6 py-2 z-20 shadow-2xs gap-3">
          {/* Route Info */}
          <div className="flex items-center space-x-3">
            <h1 className="text-sm font-semibold text-[#17365D] tracking-tight">
              {currentNav?.label ?? 'RailAir Intelligence'}
            </h1>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-mono text-slate-500">Meerut → New Delhi (83 km · 7 Nodes)</span>
          </div>

          {/* Global Telemetry Controls */}
          <div className="flex items-center flex-wrap gap-3">
            {/* Pollutant Switcher */}
            <div className="inline-flex rounded-md border border-[#DCE3EA] p-0.5 bg-slate-50 text-[11px] font-mono shadow-2xs">
              {(['PM2.5', 'PM10', 'NAQI'] as const).map((pol) => (
                <button
                  key={pol}
                  onClick={() => setSelectedPollutant(pol)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    selectedPollutant === pol
                      ? 'bg-[#17365D] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Select ${pol} parameter`}
                >
                  {pol}
                </button>
              ))}
            </div>

            {/* 24-Hour Diurnal Scrubber */}
            <div className="flex items-center gap-2.5 bg-white border border-[#DCE3EA] rounded-md px-3 py-1 text-xs font-mono shadow-2xs">
              <button
                onClick={togglePlay}
                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-[#17365D] flex items-center justify-center transition-colors"
                title={isPlaying ? 'Pause 24h cycle' : 'Play 24h diurnal cycle'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
              </button>
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 text-[10px] leading-tight">
                  <span className="font-semibold text-[#17365D] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    {formatHourIST(selectedHour)}
                  </span>
                  <span className="text-slate-400 text-[9px]">
                    ({diurnalFactor.toFixed(2)}× factor)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={23}
                  step={1}
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(Number(e.target.value))}
                  className="w-28 sm:w-36 h-1 accent-[#17365D] cursor-pointer mt-1"
                  aria-label="Diurnal hour scrubber"
                />
              </div>
            </div>

            {/* Simulated Data Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-[11px] text-amber-800 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulated Sample Data</span>
            </div>
          </div>
        </header>

        {/* Sim Banner */}
        <SimBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto relative flex flex-col min-h-0">
          <Outlet context={contextValue} />
        </main>
      </div>
    </div>
  );
}
