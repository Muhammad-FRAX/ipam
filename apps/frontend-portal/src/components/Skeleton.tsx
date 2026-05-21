import React from 'react';

export function SkeletonText({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#12121a]/80 border border-white/5 rounded-3xl p-6 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 shrink-0" />
        <div className="flex-1 space-y-3">
          <SkeletonText className="h-3 w-24" />
          <SkeletonText className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-8 py-4 border-b border-white/5">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonText
              key={j}
              className={`h-4 ${j === 0 ? 'w-40' : j === cols - 1 ? 'w-20 ml-auto' : 'w-28'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="flex items-end gap-2 h-full">
        {[60, 80, 55, 90, 70, 85, 65, 95, 75, 88, 62, 78].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-white/5 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
