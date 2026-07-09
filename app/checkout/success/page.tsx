'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = params.get('plan') ?? '';
  const credits = Number(params.get('credits') ?? 0);

  const planLabel: Record<string, string> = { basico: 'Básico', padrao: 'Padrão', premium: 'Premium' };
  const planName = planLabel[plan] ?? plan;

  return (
    <div className="min-h-screen bg-forest-deep flex items-center justify-center p-8">
      <div className="bg-forest-surface border border-forest-border rounded-3xl p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-green-400">check_circle</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Pagamento Confirmado!</h1>
        <p className="text-stone-400 mb-6">
          Seu Plano <strong className="text-primary">{planName}</strong> foi ativado com sucesso.
          Você tem <strong className="text-white">{credits}</strong> currículo(s) disponível(is).
        </p>
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 bg-primary hover:bg-secondary text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
        >
          Ir ao Dashboard
        </button>
        <p className="text-xs text-stone-600 mt-4">
          Você receberá um email de confirmação em breve.
        </p>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-forest-deep flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
