import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { MagicBusLogo } from './MagicBusLogo';

interface SplashScreenProps {
  durationMs?: number;
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  durationMs = 2000,
  onComplete,
}) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 select-none"
      style={{
        background:
          'radial-gradient(circle at 50% 42%, #0C3570 0%, #06214A 56%, #031531 100%)',
      }}
    >
      {/* Subtle Architectural Gold & Navy Corner Arc */}
      <svg
        width="420"
        height="220"
        viewBox="0 0 420 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-0 right-0 w-[260px] sm:w-[380px] h-auto opacity-30 pointer-events-none"
        aria-hidden="true"
      >
        <path
          d="M420 0 L420 220 L80 220 C220 205 340 132 385 0 Z"
          fill="#FCD116"
        />
        <path
          d="M420 52 L420 220 L185 220 C295 202 374 146 420 52 Z"
          fill="#052048"
        />
      </svg>

      {/* Animated Center Emblem & Brand Reveal */}
      <div className="relative flex flex-col items-center text-center max-w-md">
        <div className="relative flex items-center justify-center">
          {/* Outer Expanding Golden Ring (compositor-only transform + opacity) */}
          <motion.div
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: [0.85, 1.18, 1.24], opacity: [0, 0.5, 0] }}
            transition={{
              duration: 1.75,
              ease: [0.16, 1, 0.3, 1],
              times: [0, 0.5, 1],
            }}
            className="absolute w-[174px] h-[174px] sm:w-[196px] sm:h-[196px] rounded-full border-2 border-[#FCD116]/75 pointer-events-none"
            aria-hidden="true"
          />

          {/* Soft Radiant Halo */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute w-[166px] h-[166px] sm:w-[186px] sm:h-[186px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(252,209,22,0.22) 0%, rgba(252,209,22,0) 72%)',
            }}
            aria-hidden="true"
          />

          {/* Official Magic Bus Logo */}
          <motion.div
            initial={{ scale: 0.78, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 drop-shadow-[0_12px_32px_rgba(0,0,0,0.42)]"
          >
            <MagicBusLogo size={142} variant="dark" />
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 space-y-1.5"
        >
          <h1 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-white leading-tight">
            Magic Bus India Foundation
          </h1>
          <p
            className="text-[14px] sm:text-[15.5px] font-bold tracking-wide"
            style={{ color: '#FCD116' }}
          >
            Training Program Report Generator
          </p>
          <p className="text-[13px] italic text-[#CBD5E1] pt-0.5">
            Childhood to Livelihood
          </p>
        </motion.div>

        {/* Smooth 2-Second Gold Progress Sweep (compositor scaleX) */}
        <div className="mt-8 w-52 h-[3px] rounded-full bg-white/15 overflow-hidden">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: durationMs / 1000,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              transformOrigin: 'left center',
              backgroundColor: '#FCD116',
            }}
            className="w-full h-full rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
};
