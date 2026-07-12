'use client';

import React, { useState } from 'react';
// ─── Tipos ────────────────────────────────────────────────────────────────────

type PlanKey = 'basico' | 'padrao' | 'premium';

interface Plan {
  id: PlanKey;
  name: string;
  price: string;
  priceNum: number;
  subtitle: string;
  credits: number;
  highlight: boolean;
  badge?: string;
  features: string[];
  buttonLabel: string;
}

const PLANS: Plan[] = [
  {
    id: 'basico',
    name: 'Básico',
    price: '15,00',
    priceNum: 15,
    subtitle: 'Para 1 Currículo',
    credits: 1,
    highlight: false,
    features: [
      'Criação de 1 currículo',
      'Layouts básicos',
      'Exportação PDF',
    ],
    buttonLabel: 'Criar Meu Currículo',
  },
  {
    id: 'padrao',
    name: 'Padrão',
    price: '40,00',
    priceNum: 40,
    subtitle: 'Para 6 Currículos',
    credits: 6,
    highlight: true,
    badge: 'Mais Popular',
    features: [
      'Criação de até 6 currículos',
      'Acesso a todos os layouts',
      'Exportação PDF, DOCX, HTML',
      'Importação de PDF com IA',
    ],
    buttonLabel: 'Quero Mais Opções',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '90,00',
    priceNum: 90,
    subtitle: 'Para 9 Currículos',
    credits: 9,
    highlight: false,
    features: [
      'Criação de até 9 currículos',
      'Todos os benefícios do Padrão',
      'Suporte Prioritário',
      'Templates Exclusivos',
    ],
    buttonLabel: 'Plano Completo',
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

const Pricing: React.FC = () => {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (plan: PlanKey) => {
    setError(null);
    setLoadingPlan(plan);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Erro ao iniciar pagamento.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <header className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">Planos de Criação</h2>
        <p className="text-stone-400 max-w-2xl mx-auto">
          Escolha o plano ideal para impulsionar sua carreira com currículos profissionais de alto impacto visual.
        </p>
      </header>

      {/* Erro global */}
      {error && (
        <div className="mb-8 p-4 bg-red-950/60 border border-red-700 rounded-xl text-red-300 text-sm text-center flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`bg-forest-surface flex flex-col rounded-[1.5rem] p-8 transition-all duration-300 relative ${
              plan.highlight
                ? 'border-2 border-primary shadow-2xl shadow-primary/10 md:-translate-y-4'
                : 'border border-forest-border hover:border-primary/30'
            }`}
          >
            {plan.badge && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                {plan.badge}
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-stone-400">R$</span>
                <span className="text-4xl font-display font-bold text-primary">{plan.price}</span>
              </div>
              <p className="text-xs text-stone-500 mt-2 uppercase tracking-wide">{plan.subtitle}</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map(feat => (
                <li key={feat} className="flex gap-3 text-sm text-stone-300">
                  <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                  {feat}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={!!loadingPlan}
              className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                plan.highlight
                  ? 'bg-primary hover:bg-secondary text-white shadow-lg shadow-primary/25'
                  : 'border border-forest-border text-white hover:bg-forest-border'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loadingPlan === plan.id ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Aguarde...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">credit_card</span>
                  {plan.buttonLabel}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-stone-500 text-sm flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          Pagamento 100% seguro via Stripe
        </div>
        <p className="text-xs text-stone-600 max-w-md">
          Os planos são pagamentos únicos (sem recorrência). Após o pagamento confirmado, seus créditos são liberados imediatamente.
        </p>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">verified</span>Stripe SSL</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">payments</span>Pix / Cartão</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">receipt_long</span>NF disponível</span>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
