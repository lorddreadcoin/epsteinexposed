'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animate = true,
}: SkeletonProps) {
  const baseClasses = 'bg-[#1a1a24] overflow-hidden';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };
  
  const style: React.CSSProperties = {
    width: width ?? (variant === 'circular' ? height : '100%'),
    height: height ?? (variant === 'text' ? undefined : 40),
  };
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    >
      {animate && (
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-[#ffffff08] to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-[#12121a] rounded-lg border border-[#ffffff10] ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonGraph({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full h-full bg-[#0a0a0f] ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-8 h-8 rounded-full bg-[#1a1a24]"
              style={{
                left: Math.cos((i * Math.PI * 2) / 6) * 60,
                top: Math.sin((i * Math.PI * 2) / 6) * 60,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
          <motion.div
            className="w-12 h-12 rounded-full bg-[#00d4ff]/20 border border-[#00d4ff]/30"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <motion.p
          className="text-[#606070] text-sm font-mono"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading entity graph...
        </motion.p>
      </div>
    </div>
  );
}

export function SkeletonEntityPanel({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-[#12121a]/95 rounded-lg border border-[#ffffff15] ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="text" width="70%" className="mb-2" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <Skeleton variant="text" width={80} />
          <Skeleton variant="text" width={40} />
        </div>
        <div className="flex justify-between">
          <Skeleton variant="text" width={100} />
          <Skeleton variant="text" width={30} />
        </div>
      </div>
      
      <Skeleton variant="rounded" height={36} />
    </div>
  );
}
