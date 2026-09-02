import React from 'react';
import { Award } from 'lucide-react';
import { formatCurrency } from '../../services/mockData';

interface DailyLeaderboardMarqueeProps {
  dailyLeaderboard: { name: string; amount: number; avatar?: string }[];
}

export const DailyLeaderboardMarquee: React.FC<DailyLeaderboardMarqueeProps> = ({ dailyLeaderboard }) => {
  if (!dailyLeaderboard || dailyLeaderboard.length === 0) {
    return (
      <div className="bg-muted-2 border border-border rounded-lg p-3 text-center text-xs text-muted-foreground font-extrabold uppercase tracking-wider flex items-center justify-center gap-2">
        <Award className="w-4 h-4 text-primary" />
        LEADERBOARD: NO DAILY SALES LOGGED TODAY
      </div>
    );
  }

  // Duplicate items array for a 100% seamless, continuous looping scroll
  const marqueeItems = [...dailyLeaderboard, ...dailyLeaderboard];

  return (
    <div className="bg-muted-2 border border-border rounded-lg p-2.5 flex items-center gap-3 overflow-hidden relative">
      {/* Fixed Title Badge */}
      <div className="flex items-center gap-2 shrink-0 bg-card/80 border border-border px-3 py-1.5 rounded-md z-10 shadow-md">
        <Award className="w-4 h-4 text-warning" />
        <span className="text-[10px] font-black text-warning uppercase tracking-widest">Today's Leaders</span>
      </div>
      
      {/* Continuous Scrolling Marquee Ticker */}
      <div className="relative w-full overflow-hidden whitespace-nowrap select-none">
        <div className="animate-marquee inline-flex gap-6 items-center">
          {marqueeItems.map((item, index) => {
            const rank = (index % dailyLeaderboard.length) + 1;
            return (
              <div key={`${item.name}-${index}`} className="inline-flex items-center gap-2 text-xs font-semibold">
                <span className="font-black text-warning text-[11px] bg-warning-soft px-2 py-0.5 rounded-md border border-warning/20">
                  {rank}. {item.name}
                </span>
                <span className="font-extrabold text-success text-xs">
                  ({formatCurrency(item.amount)})
                </span>
                <span className="text-muted-foreground font-bold px-2.5">•</span>
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
