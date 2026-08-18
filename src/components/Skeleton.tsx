import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded'
}) => {
  const variantStyles = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-xl'
  }[variant];

  return (
    <div
      className={`relative overflow-hidden bg-slate-800/40 dark:bg-slate-800/40 light:bg-slate-200/80 animate-pulse ${variantStyles} ${className}`}
    >
      <div 
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 dark:via-white/5 light:via-black/5 to-transparent animate-[shimmer_2s_infinite]"
      />
    </div>
  );
};

export const MetricCardsSkeleton: React.FC<{ count?: number; cols?: string }> = ({ 
  count = 7, 
  cols = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7' 
}) => {
  return (
    <div className={`grid ${cols} gap-2.5 w-full`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx} 
          className="glass-card p-3 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[82px] animate-pulse"
        >
          <Skeleton className="h-3 w-16 mb-2 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-lg mt-1" />
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6
}) => {
  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden w-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-40 rounded-md" />
        </div>
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>

      {/* Table Head */}
      <div className="bg-slate-900/40 px-4 py-3 border-b border-white/5 flex gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton key={idx} className="h-4 flex-1 rounded-md" />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-4 py-3.5 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <Skeleton 
                key={cIdx} 
                className={`h-5 flex-1 rounded-md ${cIdx === 0 ? 'h-6 !w-1/3' : ''}`} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-72' }) => {
  return (
    <div className={`glass-card p-5 rounded-2xl border border-white/5 w-full flex flex-col justify-between ${height}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
      <div className="flex-1 flex items-end gap-3 px-4 pb-2">
        {Array.from({ length: 8 }).map((_, idx) => {
          const heights = ['h-2/5', 'h-4/5', 'h-3/5', 'h-full', 'h-1/2', 'h-3/4', 'h-2/3', 'h-4/5'];
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton className={`w-full ${heights[idx % heights.length]} rounded-t-lg`} />
              <Skeleton className="h-3 w-8 rounded-sm" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const StaffGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="glass-card p-4 rounded-2xl border border-white/5 flex flex-col gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-12 h-12 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const PageLoader: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#090d16] p-4 md:p-8 space-y-6 animate-pulse">
      {/* Top Navbar Skeleton */}
      <div className="glass-panel rounded-2xl px-6 py-4 flex items-center justify-between border border-white/5">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton variant="circular" className="w-9 h-9" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <MetricCardsSkeleton count={4} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* Main Body Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TableSkeleton rows={6} columns={5} />
        </div>
        <div className="space-y-6">
          <ChartSkeleton height="h-64" />
          <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-3">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
