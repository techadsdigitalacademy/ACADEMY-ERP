import React from 'react';
import { Award } from 'lucide-react';
import { formatCurrency } from '../../services/mockData';

interface DailyLeaderboardMarqueeProps {
  dailyLeaderboard: { name: string; amount: number; avatar?: string }[];
}

export const DailyLeaderboardMarquee: React.FC<DailyLeaderboardMarqueeProps> = ({ dailyLeaderboard }) => {
  if (!dailyLeaderboard || dailyLeaderboard.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 text-center text-xs text-slate-400 font-extrabold uppercase tracking-wider flex items-center justify-center gap-2">
        <Award className="w-4 h-4 text-indigo-400" />
        LEADERBOARD: NO DAILY SALES LOGGED TODAY
      </div>
    );
  }

  // Duplicate items array for a 100% seamless, continuous looping scroll
  const marqueeItems = [...dailyLeaderboard, ...dailyLeaderboard];

  return (
    <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/70 to-purple-950/40 border border-white/10 rounded-2xl p-2.5 flex items-center gap-3 overflow-hidden relative shadow-lg shadow-indigo-950/20">
      {/* Fixed Title Badge */}
      <div className="flex items-center gap-2 shrink-0 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl z-10 shadow-md">
        <Award className="w-4 h-4 text-amber-400" />
        <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">Today's Leaders</span>
      </div>
      
      {/* Continuous Scrolling Marquee Ticker */}
      <div className="relative w-full overflow-hidden whitespace-nowrap select-none">
        <div className="animate-marquee inline-flex gap-6 items-center">
          {marqueeItems.map((item, index) => {
            const rank = (index % dailyLeaderboard.length) + 1;
            return (
              <div key={`${item.name}-${index}`} className="inline-flex items-center gap-2 text-xs font-semibold">
                <span className="font-black text-amber-400 text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {rank}. {item.name}
                </span>
                <span className="font-extrabold text-emerald-400 text-xs">
                  ({formatCurrency(item.amount)})
                </span>
                <span className="text-slate-600 font-bold px-2.5">•</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS Keyframe Animation for Infinite Continuous Motion */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 22s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
