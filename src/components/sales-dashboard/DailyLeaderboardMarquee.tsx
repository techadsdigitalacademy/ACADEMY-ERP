import React from 'react';
import { Award } from 'lucide-react';
import { formatCurrency } from '../../services/mockData';

interface DailyLeaderboardMarqueeProps {
  dailyLeaderboard: { name: string; amount: number }[];
}

export const DailyLeaderboardMarquee: React.FC<DailyLeaderboardMarqueeProps> = ({ dailyLeaderboard }) => {
  if (dailyLeaderboard.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
        Leaderboard: No daily sales logged today.
      </div>
    );
  }

  const renderRankIcon = (rank: number) => {
    if (rank === 1) return <span className="text-sm">🥇</span>;
    if (rank === 2) return <span className="text-sm">🥈</span>;
    if (rank === 3) return <span className="text-sm">🥉</span>;
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-850 border border-white/10 text-[9px] font-extrabold text-slate-350">
        {rank}
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-r from-indigo-950/30 via-slate-900/50 to-purple-950/30 border border-white/5 rounded-2xl p-3 flex items-center gap-4 overflow-hidden relative">
      <div className="flex items-center gap-2 shrink-0 bg-slate-950/60 border border-white/5 px-3 py-1.5 rounded-xl z-10 shadow-md">
        <Award className="w-4 h-4 text-indigo-400" />
        <span className="text-[10px] font-extrabold text-slate-350 uppercase tracking-widest">Daily Leaderboard</span>
      </div>
      
      {/* Scrolling wrapper */}
      <div className="relative w-full overflow-hidden whitespace-nowrap select-none">
        <div className="animate-ticker inline-flex gap-8 pl-4">
          {dailyLeaderboard?.map((item, index) => {
            const rank = index + 1;
            return (
              <div key={`${item.name}-${index}`} className="inline-flex items-center gap-2.5 text-xs font-semibold">
                {renderRankIcon(rank)}
                <span className="text-slate-200">{item.name}</span>
                <span className="font-extrabold text-emerald-400">{formatCurrency(item.amount)}</span>
                {index < dailyLeaderboard.length - 1 && (
                  <span className="text-slate-700 font-bold px-2">|</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS for Marquee animation */}
      <style>{`
        @keyframes ticker {
          0% { transform: translate3d(100vw, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .animate-ticker {
          animation: ticker 25s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
