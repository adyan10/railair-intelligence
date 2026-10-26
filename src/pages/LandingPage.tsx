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
            {/* 1. Authentic Survey of India Map & NCR Sector Corridors */}
            <g id="hero-india-map" className="anim-map-reveal">
              {/* Mainland India Outline */}
              <path
                d="M827.1,50.0 L831.6,50.3 L842.4,44.0 L848.0,43.8 L856.2,50.8 L857.9,48.9 L860.3,50.1 L856.4,59.7 L849.9,62.8 L851.0,65.5 L848.7,68.4 L842.8,68.8 L845.1,72.9 L843.0,73.1 L843.4,76.1 L848.8,78.5 L847.9,80.8 L850.4,84.9 L843.7,89.1 L841.1,84.6 L837.1,86.7 L841.6,93.3 L841.5,101.8 L845.2,100.0 L849.0,105.4 L854.0,106.0 L858.3,108.6 L858.0,110.9 L867.3,115.0 L859.7,121.2 L856.4,132.6 L869.4,138.4 L877.1,144.6 L886.6,146.3 L886.9,149.0 L893.5,151.2 L894.4,149.3 L899.8,151.0 L903.1,148.8 L908.5,151.0 L908.7,154.7 L915.2,158.2 L920.0,156.8 L922.6,160.6 L928.1,160.0 L932.6,162.4 L936.6,160.4 L939.6,163.3 L945.9,161.6 L947.3,163.2 L949.3,158.5 L947.0,153.8 L948.5,143.9 L954.5,141.4 L957.4,144.6 L955.9,148.2 L957.7,151.6 L955.7,153.5 L960.2,157.6 L993.7,157.1 L994.4,151.7 L993.2,149.3 L989.0,149.3 L988.9,145.8 L998.2,145.4 L1001.4,143.1 L1000.8,141.0 L1009.4,134.6 L1018.9,131.3 L1019.3,128.6 L1023.1,126.8 L1030.4,129.6 L1039.5,125.7 L1042.3,128.1 L1041.0,130.0 L1042.6,129.0 L1046.1,133.8 L1043.5,136.6 L1047.0,135.3 L1054.4,140.3 L1054.8,142.7 L1049.0,147.7 L1051.9,154.1 L1046.9,150.6 L1041.5,151.8 L1029.1,160.0 L1029.5,166.7 L1023.2,175.2 L1024.1,180.9 L1017.7,194.3 L1008.2,191.4 L1008.9,203.2 L1005.9,204.3 L1006.8,214.0 L1003.4,218.0 L1001.0,215.3 L999.9,217.5 L996.2,195.9 L992.5,195.7 L991.1,203.7 L988.7,205.6 L986.8,201.6 L985.5,203.6 L983.4,197.3 L985.9,191.1 L991.9,190.8 L992.1,188.3 L994.9,187.3 L995.7,181.3 L998.7,181.6 L997.9,179.7 L968.3,176.4 L968.8,168.3 L966.4,164.7 L965.3,168.0 L962.7,167.6 L959.7,162.7 L957.6,162.6 L959.2,164.7 L954.8,164.4 L951.8,159.9 L951.0,161.7 L953.2,163.2 L949.2,165.8 L948.4,169.9 L958.7,176.8 L952.3,177.4 L951.8,180.7 L948.8,180.8 L947.3,184.2 L955.6,189.0 L953.6,196.8 L956.4,198.7 L955.4,201.7 L958.6,202.2 L956.9,204.7 L959.8,221.8 L955.5,221.2 L956.1,217.1 L954.5,216.3 L952.4,222.1 L950.3,220.6 L950.0,222.7 L949.6,215.4 L947.4,214.5 L949.4,216.0 L944.9,221.0 L934.7,225.5 L934.2,232.4 L936.5,233.1 L932.7,235.4 L932.0,238.4 L933.4,237.8 L928.5,242.7 L913.3,249.6 L902.8,263.0 L882.0,278.8 L881.9,284.7 L870.1,288.0 L866.3,295.3 L863.3,293.0 L858.6,295.7 L856.1,303.1 L859.5,325.3 L852.8,345.3 L854.2,362.2 L847.4,362.8 L842.9,372.4 L846.2,375.0 L835.7,378.2 L833.4,386.2 L827.5,390.0 L821.3,386.5 L816.0,379.7 L817.3,378.5 L815.9,379.3 L813.8,373.9 L808.2,352.1 L800.6,341.2 L792.7,313.5 L780.6,291.0 L778.8,275.6 L774.6,264.2 L776.5,265.1 L776.3,262.9 L774.4,262.5 L773.7,258.3 L775.5,258.0 L774.3,255.7 L776.1,254.2 L775.2,252.1 L773.1,255.8 L772.9,250.7 L774.3,250.9 L772.4,248.8 L774.1,248.0 L772.2,247.9 L771.4,244.1 L774.5,232.6 L770.7,226.0 L774.5,221.3 L770.0,221.4 L772.5,217.6 L769.7,217.6 L770.6,214.7 L774.3,214.0 L767.6,213.4 L765.2,227.2 L750.4,233.5 L742.8,229.0 L728.8,213.5 L730.3,211.3 L732.1,214.1 L743.0,210.5 L746.1,205.2 L743.5,204.2 L737.7,208.1 L731.8,206.9 L725.3,202.8 L722.9,198.5 L727.3,194.0 L720.0,197.2 L722.1,192.8 L726.7,192.8 L727.3,188.6 L741.3,190.3 L747.4,187.2 L749.1,189.8 L753.8,187.5 L748.5,171.3 L744.0,171.2 L742.1,168.4 L743.0,160.8 L735.4,158.4 L736.2,153.0 L745.2,142.7 L751.0,146.5 L762.7,143.3 L768.4,133.3 L774.7,130.1 L779.9,118.7 L786.5,115.6 L786.0,112.0 L794.8,104.7 L792.6,104.0 L793.8,94.6 L802.5,90.4 L799.4,87.3 L794.6,87.1 L794.9,82.8 L791.1,83.7 L782.6,79.7 L779.9,63.8 L788.3,54.6 L783.9,53.3 L784.3,49.5 L780.0,49.5 L776.8,47.1 L777.4,45.4 L770.4,45.5 L770.2,40.8 L776.0,35.0 L785.1,34.7 L783.0,32.2 L799.9,30.8 L817.9,41.7 L819.3,45.4 L825.2,47.1 L827.1,50.0 Z"
                fill="#EEF3F9"
                stroke="#CBD5E1"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />

              {/* Andaman & Nicobar Islands */}
              <g id="andaman-nicobar">
                <ellipse cx="1003" cy="328" rx="2.2" ry="7.5" fill="#EEF3F9" stroke="#CBD5E1" strokeWidth="0.9" />
                <ellipse cx="1001" cy="346" rx="2.2" ry="6.5" fill="#EEF3F9" stroke="#CBD5E1" strokeWidth="0.9" />
                <ellipse cx="1014" cy="396" rx="2.8" ry="5.0" fill="#EEF3F9" stroke="#CBD5E1" strokeWidth="0.9" />
              </g>

              {/* Lakshadweep Islands */}
              <g id="lakshadweep">
                <circle cx="770" cy="358" r="1.8" fill="#EEF3F9" stroke="#CBD5E1" strokeWidth="0.8" />
                <circle cx="766" cy="364" r="1.5" fill="#EEF3F9" stroke="#CBD5E1" strokeWidth="0.8" />
              </g>

              {/* Strategic Railway Arterial Corridors Radiating from NCR */}
              <g opacity="0.6">
                {/* Western Corridor (Delhi -> Mumbai) */}
                <path d="M824,135 L805,160 L778,215 L773,255" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
                {/* Grand Trunk Corridor (Delhi -> Chennai) */}
                <path d="M824,135 L826,202 L837,245 L829,280 L859,328" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
                {/* Eastern Corridor (Delhi -> Kolkata) */}
                <path d="M824,135 L857,168 L905,178 L951,210" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
                {/* Northern Corridor (Delhi -> Amritsar) */}
                <path d="M824,135 L818,114 L797,98" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3,3" />
              </g>

              {/* NCR Hub Pointer & Sector Callout */}
              <g id="ncr-pointer">
                {/* Outer radar pulse rings */}
                <circle cx="824" cy="135" r="12" fill="#17365D" fillOpacity="0.08" />
                <circle cx="824" cy="135" r="8" fill="none" stroke="#17365D" strokeWidth="1" strokeDasharray="2,2" />

                {/* Meerut-Delhi corridor active link */}
                <line x1="824" y1="135" x2="829" y2="131" stroke="#17365D" strokeWidth="2.5" strokeLinecap="round" />

                {/* Delhi Node */}
                <circle cx="824" cy="135" r="3.5" fill="#17365D" />
                <circle cx="824" cy="135" r="1.5" fill="#38BDF8" />

                {/* Meerut Node */}
                <circle cx="829" cy="131" r="2.5" fill="#0284C7" />

                {/* Leader line to callout */}
                <path d="M829,131 L844,122 L854,122" fill="none" stroke="#17365D" strokeWidth="1.2" />

                {/* NCR Sector Label */}
                <text
                  x="858"
                  y="120"
                  fill="#17365D"
                  fontFamily="'JetBrains Mono', ui-monospace, monospace"
                  fontSize="8.5"
                  fontWeight="700"
                  letterSpacing="0.4"
                >
                  NORTHERN / NCR SECTOR
                </text>
                <text
                  x="858"
                  y="130"
                  fill="#64748B"
                  fontFamily="'JetBrains Mono', ui-monospace, monospace"
                  fontSize="7"
                  fontWeight="600"
                  letterSpacing="0.2"
                >
                  MEERUT ⇄ NEW DELHI (83 KM)
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
