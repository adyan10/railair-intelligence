import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { useEnvironmental } from '../../context/EnvironmentalContext';

export const HistoricalTimeline: React.FC = () => {
  const {
    periods,
    selectedPeriodIndex,
    setSelectedPeriodIndex,
    selectedPeriod,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    isLoading,
  } = useEnvironmental();

  if (periods.length === 0) {
    return (
      <div className="bg-slate-950/85 text-slate-300 px-4 py-2 rounded-xl backdrop-blur-md border border-slate-700/60 shadow-xl flex items-center justify-center text-xs font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 mr-2" />
        Loading historical periods index...
      </div>
    );
  }

  const isAtStart = selectedPeriodIndex === 0;
  const isAtEnd = selectedPeriodIndex === periods.length - 1;

  return (
    <div className="bg-slate-950/85 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl backdrop-blur-md border border-slate-700/70 shadow-2xl transition-all">
      {/* Sleek, Single Compact Row */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={stepBackward}
            disabled={isAtStart}
            className={`p-1.5 rounded-md border border-slate-700/80 transition-colors ${
              isAtStart
                ? 'opacity-30 cursor-not-allowed bg-slate-800/40 text-slate-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Previous month"
            aria-label="Previous month"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePlay}
            className="px-2.5 sm:px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title={isPlaying ? 'Pause timeline playback' : 'Play historical sequence'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span className="text-[11px] font-mono">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span className="text-[11px] font-mono">{isAtEnd ? 'REPLAY' : 'PLAY'}</span>
              </>
            )}
          </button>

          <button
            onClick={stepForward}
            disabled={isAtEnd}
            className={`p-1.5 rounded-md border border-slate-700/80 transition-colors ${
              isAtEnd
                ? 'opacity-30 cursor-not-allowed bg-slate-800/40 text-slate-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Next month"
            aria-label="Next month"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Active Month Pill */}
        <div className="shrink-0 flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-600/40 px-2 sm:px-2.5 py-1 rounded-md">
          <span className="text-[11px] font-mono font-bold text-emerald-400 tracking-wider">
            {selectedPeriod?.label.toUpperCase() ?? '2022'}
          </span>
          {isLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" />}
        </div>

        {/* Scrubber Range Bar */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <input
            type="range"
            min={0}
            max={periods.length - 1}
            step={1}
            value={selectedPeriodIndex}
            onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-hidden"
            aria-label="Historical monthly timeline scrubber"
          />

          <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-0.5 px-0.5">
            <span>2017</span>
            <span>2018</span>
            <span>2019</span>
            <span>2020</span>
            <span>2021</span>
            <span>2022</span>
          </div>
        </div>

        {/* Speed Selector */}
        <div className="shrink-0 hidden md:flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded border border-slate-700/60 text-[9px] font-mono">
          {([1, 2, 4] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                playbackSpeed === spd
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={`Playback speed ${spd}x`}
            >
              {spd}×
            </button>
          ))}
        </div>
      </div>

      {/* Tiny Provenance Footer */}
      <div className="text-[8px] font-mono text-slate-400 text-center mt-1 hidden sm:block">
        Historical modelled estimates · 2017–2022 (Zenodo 10km) · 72 Discrete Monthly Periods
      </div>
    </div>
  );
};
