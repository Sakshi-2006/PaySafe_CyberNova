import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { riskLevelColor, type RiskLevel } from '@/lib/riskEngine';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  size?: number;
}

export function RiskGauge({ score, level, size = 220 }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const color = riskLevelColor[level];
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference * 0.75;
  const arcLength = circumference * 0.75;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="12"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono font-bold text-glow"
          style={{ fontSize: size * 0.22, color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {animatedScore}
        </motion.span>
        <span className="font-mono text-sm text-gray-500 mt-1">/ 100</span>
        <span
          className="font-mono text-xs font-bold uppercase tracking-widest mt-2 px-3 py-1 rounded-full"
          style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}40` }}
        >
          {level} RISK
        </span>
      </div>
    </div>
  );
}
