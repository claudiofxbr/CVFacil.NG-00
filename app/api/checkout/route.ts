import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// Inicializa o Stripe com a chave secreta (server-side apenas)
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada.');
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
};

// Preços fixos por plano (em centavos, BRL)
const PLAN_LOOKUP: Record<string, { name: string; amount: number; credits: number }> = {
  basico: { name: 'CVFacil.NG — Plano Básico', amount: 1500, credits: 1 },
  padrao: { name: 'CVFacil.NG — Plano Padrão', amount: 4000, credits: 6 },
  premium: { name: 'CVFacil.NG — Plano Premium', amount: 9000, credits: 9 },
};

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const { plan } = await req.json();
    const userId = payload.sub as string;
    const userEmail = payload.email as string | undefined;

    if (!plan || !PLAN_LOOKUP[plan]) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    }

    const stripe = getStripe();
    const planData = PLAN_LOOKUP[plan];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      // Fixado em "card" até o Pix ser aprovado pela Stripe para esta conta —
      // Google Pay e Apple Pay não são métodos separados, são carteiras que
      // aparecem automaticamente dentro de "card" quando o dispositivo suporta.
      // Quando o Pix for aprovado, trocar para automatic_payment_methods (via
      // PaymentIntent) ou incluir 'pix' aqui, conforme o método escolhido.
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: planData.name,
              description: `${planData.credits} currículo(s) — CVFacil.NG`,
              images: [`${baseUrl}/cvfacil-logo.png`],
            },
            unit_amount: planData.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}&credits=${planData.credits}&userId=${userId ?? ''}`,
      cancel_url: `${baseUrl}/checkout/canceled`,
      metadata: {
        plan,
        userId: userId ?? '',
        credits: String(planData.credits),
      },
      locale: 'pt-BR',
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[Stripe Checkout Error]', err.message);
    return NextResponse.json({ error: err.message ?? 'Erro interno no servidor.' }, { status: 500 });
  }
}
