'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// RF-3: apos 10 minutos sem uso, o sistema deve redirecionar para o login.
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;

// RF-4: contagem regressiva exibida antes de concluir o encerramento.
// Duracao nao especificada no requisito original -- assumida como 60s.
const COUNTDOWN_SECONDS = 60;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

interface InactivityGuardProps {
  onTimeout: () => void;
}

export const InactivityGuard: React.FC<InactivityGuardProps> = ({ onTimeout }) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const onTimeoutRef = useRef(onTimeout);
  const warningActiveRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    warningActiveRef.current = false;
    setSecondsLeft(null);
  }, []);

  const handleContinue = useCallback(() => {
    lastActivityRef.current = Date.now();
    stopCountdown();
  }, [stopCountdown]);

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      // Qualquer atividade durante a contagem regressiva cancela o encerramento.
      if (warningActiveRef.current) {
        stopCountdown();
      }
    };

    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    const tick = setInterval(() => {
      if (warningActiveRef.current) return;

      const idleMs = Date.now() - lastActivityRef.current;
      const warnAfterMs = INACTIVITY_LIMIT_MS - COUNTDOWN_SECONDS * 1000;

      if (idleMs >= warnAfterMs) {
        warningActiveRef.current = true;
        let remaining = COUNTDOWN_SECONDS;
        setSecondsLeft(remaining);

        countdownIntervalRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            stopCountdown();
            onTimeoutRef.current();
          } else {
            setSecondsLeft(remaining);
          }
        }, 1000);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handleActivity));
      clearInterval(tick);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [stopCountdown]);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-forest-deep border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        <p className="text-stone-200 font-display font-bold text-lg mb-2">Sessão prestes a expirar</p>
        <p className="text-stone-400 text-sm mb-4">
          Por inatividade, você será desconectado em{' '}
          <span className="text-primary font-bold">{secondsLeft}s</span>.
        </p>
        <button
          onClick={handleContinue}
          className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition"
        >
          Continuar conectado
        </button>
      </div>
    </div>
  );
};
