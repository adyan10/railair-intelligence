import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import emblemImg from '../../UI resources/Futuristic AI Rail Emblem.png';

export function LandingPage() {
  const navigate = useNavigate();
  const [replayKey, setReplayKey] = useState<number>(0);

  const handleReplay = useCallback(() => {
    setReplayKey((prev) => prev + 1);
  }, []);

  const handleLaunch = useCallback(() => {
    navigate('/corridor');
  }, [navigate]);

  return (
    <section
      id="landing"
      className="min-h-screen w-full bg-rail-bg bg-grid overflow-y-auto flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 text-rail-text font-sans antialiased"
    >
      {/* =========================================================================
          HEADER: LOGO & SYSTEM STATUS
         ========================================================================= */}
      <header className="flex justify-between items-center w-full max-w-[1560px] mx-auto shrink-0 pb-4">
        <div className="flex items-center gap-3.5">
          <img
            src={emblemImg}
            alt="RailAir Intelligence Emblem"
            className="w-10 h-10 object-contain shrink-0"
          />
          <div>
            <div className="text-base font-semibold tracking-tight text-rail-navy">
              RailAir Intelligence
            </div>
            <div className="text-xs text-rail-muted font-mono">
              National Railway Aerosol &amp; Geospatial Prototype
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-rail-muted bg-white border border-rail-border px-3.5 py-1.5 rounded-md shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>SYSTEM READY: NORTHERN RAILWAY (DELHI DIV)</span>
        </div>
      </header>

      {/* =========================================================================
          HERO SECTION: EDITORIAL COPY & WAP-7 HIGH-SPEED LOCOMOTIVE
         ========================================================================= */}
      <div className="my-auto w-full max-w-[1560px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-10 xl:gap-14 py-6 lg:py-10">
        {/* Left Column: Mission & Core CTA */}
        <div className="w-full lg:w-[42%] xl:w-[40%] lg:max-w-xl space-y-6 lg:space-y-7 anim-content-reveal shrink-0">
          <div className="inline-flex text-xs font-mono font-medium px-2.5 py-1 rounded bg-rail-navy/10 text-rail-navy border border-rail-navy/15">
            GEOSPATIAL INSTRUMENT PROTOTYPE
          </div>
          <h1 className="text-4xl md:text-5xl xl:text-[3.25rem] font-semibold tracking-tight text-rail-navy leading-[1.14]">
            Atmospheric exposure along national railway corridors.
          </h1>
          <p className="text-sm md:text-base text-rail-muted leading-relaxed">
            Continuous particulate intelligence for India's railway infrastructure. Monitor PM2.5 and PM10 gradients,
            assess platform microclimates, and evaluate ambient risk along trunk alignments.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={handleLaunch}
              className="px-6 py-3 bg-rail-navy hover:bg-rail-deep text-white rounded-md font-medium text-sm transition-all flex items-center gap-2.5 shadow-sm active:scale-95 cursor-pointer"
              aria-label="Launch Corridor Instrument"
            >
              <span>Launch Corridor Instrument</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <div className="text-xs font-mono text-rail-muted">
              Focus: <strong className="text-rail-navy font-semibold">Meerut—Ghaziabad—Delhi</strong>
            </div>
          </div>

          <div className="pt-5 grid grid-cols-3 gap-4 border-t border-rail-border text-xs font-mono text-rail-muted">
            <div>
              <div className="text-slate-400 text-[10px]">ROUTE LENGTH</div>
              <div className="text-rail-navy font-medium mt-0.5">71.8 km Corridor</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">MONITORED NODES</div>
              <div className="text-rail-navy font-medium mt-0.5">7 Stations</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">BASELINE METHOD</div>
              <div className="text-rail-navy font-medium mt-0.5">NAQI Micro-buffer</div>
            </div>
          </div>
        </div>

        {/* Right Column: Prominent WAP-7 Locomotive Vector Presentation */}
        <div className="w-full lg:flex-1 bg-white/90 backdrop-blur-md rounded-xl border border-rail-border p-6 lg:p-7 shadow-sm anim-content-reveal flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3 text-[11px] font-mono text-rail-muted">
            <span className="font-semibold text-rail-navy">CLASS WAP-7 HIGH-SPEED PASSENGER LOCOMOTIVE</span>
            <span>25 kV AC 50Hz</span>
          </div>

          <svg
            key={replayKey}
            id="hero-vector-canvas"
            className="w-full h-auto min-h-[260px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[380px] xl:min-h-[420px]"
            viewBox="0 0 1080 440"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="WAP-7 High-Speed Passenger Locomotive Technical Vector"
          >
            {/* 1. Decorative Regional Northern India Sector Map */}
            <g transform="translate(-70, -15) scale(1.18)">
              <g id="hero-india-map" className="anim-map-reveal">
                <path
                  d="M780,45 L805,40 L825,55 L840,75 L865,95 L845,120 L870,140 L915,145 L945,160 L940,185 L905,190 L885,205 L875,230 L840,250 L830,290 L810,335 L795,370 L785,340 L765,300 L745,260 L730,225 L715,195 L705,175 L730,145 L745,115 L740,85 L760,65 Z"
                  fill="#EEF3F9"
                  stroke="#CBD5E1"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path d="M760,65 L775,30 L795,32 L805,40" fill="#EEF3F9" stroke="#CBD5E1" strokeWidth="1.2" />

                <path d="M755,110 L775,150 L815,185 L845,240" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
                <path d="M755,110 L740,165 L765,230 L795,330" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
                <path d="M755,110 L830,135 L890,155" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />

                <circle cx="775" cy="125" r="4" fill="#17365D" />
                <circle cx="775" cy="125" r="9" fill="none" stroke="#17365D" strokeWidth="1" strokeDasharray="2,2" />
                <text x="790" y="128" fill="#17365D" fontFamily="'JetBrains Mono'" fontSize="9" fontWeight="600">
                  NORTHERN / NCR SECTOR
                </text>
              </g>
            </g>

            {/* 2. Track Guideline & Origin Point */}
            <line x1="30" y1="360" x2="755" y2="360" stroke="#17365D" strokeWidth="1.8" className="anim-guideline" />
            <line
              x1="30"
              y1="366"
              x2="755"
              y2="366"
              stroke="#94A3B8"
              strokeWidth="1.2"
              strokeDasharray="4,6"
              className="anim-guideline"
            />
            <circle cx="35" cy="360" r="5" fill="#17365D" className="anim-origin-point" />

            {/* 3. WAP-7 Electric Locomotive Body */}
            <g transform="translate(34, 25) scale(1.22)">
              <g id="hero-locomotive">
                <g className="anim-loco-fill">
                  {/* Chassis base */}
                  <rect x="70" y="240" width="460" height="24" rx="2" fill="#1E293B" />
                  <rect x="230" y="264" width="140" height="14" fill="#334155" rx="1" />
                  {/* Cab body */}
                  <path d="M50,140 L80,105 L520,105 L550,140 L550,240 L50,240 Z" fill="#FFFFFF" stroke="#DCE3EA" strokeWidth="1" />
                  <path d="M50,140 L80,105 L520,105 L550,140 L550,165 L50,165 Z" fill="#17365D" />
                  {/* Red livery stripe */}
                  <rect x="50" y="195" width="500" height="6" fill="#DC2626" />
                  <rect x="50" y="201" width="500" height="39" fill="#17365D" />

                  {/* Windshields & Cab Glazing */}
                  <polygon points="522,112 546,140 520,140 500,112" fill="#0F172A" />
                  <polygon points="524,115 542,138 522,138 504,115" fill="#38BDF8" opacity="0.35" />
                  <polygon points="78,112 54,140 80,140 100,112" fill="#0F172A" />

                  {/* Side Portholes & Air Grilles */}
                  <circle cx="210" cy="150" r="10" fill="#E2E8F0" stroke="#17365D" strokeWidth="1.5" />
                  <circle cx="390" cy="150" r="10" fill="#E2E8F0" stroke="#17365D" strokeWidth="1.5" />
                  <rect x="250" y="132" width="100" height="32" rx="2" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
                  <line x1="260" y1="138" x2="340" y2="138" stroke="#94A3B8" strokeWidth="1" />
                  <line x1="260" y1="144" x2="340" y2="144" stroke="#94A3B8" strokeWidth="1" />
                  <line x1="260" y1="150" x2="340" y2="150" stroke="#94A3B8" strokeWidth="1" />
                  <line x1="260" y1="156" x2="340" y2="156" stroke="#94A3B8" strokeWidth="1" />

                  {/* Twin Headlight Unit */}
                  <circle cx="550" cy="180" r="5" fill="#FEF08A" stroke="#17365D" strokeWidth="1.5" />
                  <circle cx="550" cy="180" r="2.5" fill="#FACC15" />

                  {/* Cattle Guards & Buffers */}
                  <polygon points="550,240 570,268 535,268" fill="#17365D" stroke="#0F172A" strokeWidth="1" />
                  <polygon points="50,240 30,268 65,268" fill="#17365D" stroke="#0F172A" strokeWidth="1" />
                  <rect x="550" y="234" width="16" height="6" fill="#475569" />
                  <circle cx="566" cy="237" r="7" fill="#1E293B" />
                  <rect x="34" y="234" width="16" height="6" fill="#475569" />
                  <circle cx="34" cy="237" r="7" fill="#1E293B" />

                  {/* Co-Co Bogies (Front 3-Axle Assembly) */}
                  <g transform="translate(85, 246)">
                    <rect x="0" y="0" width="130" height="12" rx="2" fill="#334155" />
                    <circle cx="20" cy="18" r="14" fill="#0F172A" stroke="#64748B" strokeWidth="2.5" />
                    <circle cx="20" cy="18" r="6" fill="#94A3B8" />
                    <circle cx="65" cy="18" r="14" fill="#0F172A" stroke="#64748B" strokeWidth="2.5" />
                    <circle cx="65" cy="18" r="6" fill="#94A3B8" />
                    <circle cx="110" cy="18" r="14" fill="#0F172A" stroke="#64748B" strokeWidth="2.5" />
                    <circle cx="110" cy="18" r="6" fill="#94A3B8" />
                  </g>

                  {/* Co-Co Bogies (Rear 3-Axle Assembly) */}
                  <g transform="translate(385, 246)">
                    <rect x="0" y="0" width="130" height="12" rx="2" fill="#334155" />
                    <circle cx="20" cy="18" r="14" fill="#0F172A" stroke="#64748B" strokeWidth="2.5" />
                    <circle cx="20" cy="18" r="6" fill="#94A3B8" />
                    <circle cx="65" cy="18" r="14" fill="#0F172A" stroke="#64748B" strokeWidth="2.5" />
                    <circle cx="65" cy="18" r="6" fill="#94A3B8" />
                    <circle cx="110" cy="18" r="14" fill="#0F172A" stroke="#64748B" strokeWidth="2.5" />
                    <circle cx="110" cy="18" r="6" fill="#94A3B8" />
                  </g>

                  {/* Technical Fleet Identification Labels */}
                  <text
                    x="300"
                    y="185"
                    fill="#17365D"
                    fontFamily="'JetBrains Mono'"
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                    letterSpacing="2"
                  >
                    WAP-7 • 30201 IR
                  </text>
                  <text
                    x="300"
                    y="222"
                    fill="#FFFFFF"
                    fontFamily="'Inter'"
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="middle"
                    letterSpacing="1"
                  >
                    NORTHERN RAILWAY
                  </text>
                </g>

                {/* Pantographs (25kV AC Overhead Current Collector) */}
                <g id="loco-pantographs" className="anim-loco-fill">
                  <line x1="120" y1="105" x2="140" y2="92" stroke="#64748B" strokeWidth="2.5" />
                  <line x1="140" y1="92" x2="165" y2="105" stroke="#64748B" strokeWidth="2" />
                  <rect x="110" y="103" width="20" height="3" fill="#DC2626" />
                  <line x1="450" y1="105" x2="475" y2="60" stroke="#17365D" strokeWidth="3" />
                  <line x1="475" y1="60" x2="455" y2="25" stroke="#17365D" strokeWidth="2.5" />
                  <line x1="435" y1="24" x2="480" y2="24" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M435,24 Q430,22 432,18" stroke="#0F172A" strokeWidth="2" fill="none" />
                  <path d="M480,24 Q485,22 483,18" stroke="#0F172A" strokeWidth="2" fill="none" />
                  <line x1="150" y1="100" x2="460" y2="100" stroke="#DC2626" strokeWidth="2" />
                  <rect x="200" y="98" width="8" height="7" fill="#D97706" />
                  <rect x="280" y="98" width="10" height="7" fill="#D97706" />
                  <rect x="360" y="98" width="8" height="7" fill="#D97706" />
                  <line x1="0" y1="23" x2="620" y2="23" stroke="#CBD5E1" strokeWidth="1.2" strokeDasharray="8,4" />
                </g>

                {/* Progressive Outline Contour Line Drawing */}
                <path
                  id="loco-progressive-outline"
                  className="anim-loco-contour"
                  d="M50,240 L30,268 L65,268 L70,240 L85,240 
                     L85,260 L215,260 L215,240 L385,240 L385,260 L515,260 L515,240 
                     L535,268 L570,268 L550,240 L550,140 L520,105 
                     L475,105 L475,60 L455,25 L480,25 M455,25 L435,25 
                     M475,105 L165,105 L140,92 L120,105 L80,105 L50,140 L50,240 Z"
                  fill="none"
                  stroke="#17365D"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </svg>

          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-rail-border text-[10px] font-mono text-rail-muted">
            <span>SCALE: 1676 mm BROAD GAUGE</span>
            <button
              onClick={handleReplay}
              className="hover:text-rail-navy bg-white border border-rail-border px-3 py-1 rounded shadow-sm transition-colors cursor-pointer"
              title="Replay locomotive assembly intro animation"
            >
              ↺ REPLAY INTRO
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FOOTER: INSTITUTIONAL ATTRIBUTION & PROVENANCE NOTICE
         ========================================================================= */}
      <footer className="w-full max-w-[1560px] mx-auto border-t border-rail-border pt-4 shrink-0 space-y-2">
        <div className="flex justify-between items-center text-xs font-mono text-rail-muted">
          <div>MINISTRY OF RAILWAYS RESEARCH COLLABORATION</div>
          <div className="hidden sm:flex gap-6">
            <span>DELHI DIVISION</span>
            <span>EPSG:4326 PROJECTION</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          Simulated baseline dataset for prototype validation. Not connected to active CPCB instrumentation.
        </div>
      </footer>
    </section>
  );
}
