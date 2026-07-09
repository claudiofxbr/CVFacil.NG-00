'use client';

import { useRouter } from 'next/navigation';

export default function CheckoutCanceledPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-forest-deep flex items-center justify-center p-8">
      <div className="bg-forest-surface border border-forest-border rounded-3xl p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-amber-400">info</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Pagamento Cancelado</h1>
        <p className="text-stone-400 mb-8">
          Nenhuma cobrança foi realizada. Você pode escolher um plano sempre que quiser.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-primary hover:bg-secondary text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
          >
            Ver Planos
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 border border-forest-border text-stone-400 font-bold rounded-xl hover:bg-forest-border/30 transition-colors text-sm"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
