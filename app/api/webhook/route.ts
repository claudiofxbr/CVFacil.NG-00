import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';
import { generateUUID } from '@/services/resumeService';

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada.');
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
};

const PLAN_NAMES: Record<string, string> = {
  basico: 'Básico',
  padrao: 'Padrão',
  premium: 'Premium',
};

// Resolve o método de pagamento realmente usado (cartão, pix, etc.) via o
// PaymentIntent da sessão — o Checkout Session sozinho só lista os métodos
// oferecidos, não qual foi escolhido.
async function resolvePaymentMethod(session: Stripe.Checkout.Session): Promise<{ method: string | null; paymentIntentId: string | null }> {
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
  if (!paymentIntentId) return { method: null, paymentIntentId: null };
  try {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ['payment_method'] });
    const pm = pi.payment_method;
    const method = typeof pm === 'string' ? null : pm?.type ?? null;
    return { method, paymentIntentId };
  } catch {
    return { method: null, paymentIntentId };
  }
}

// Credita o usuário e registra o pagamento como pago. Chamada tanto para
// pagamentos síncronos (cartão, já confirmados em checkout.session.completed)
// quanto assíncronos (Pix, confirmados só em checkout.session.async_payment_succeeded).
async function handleSessionPaid(session: Stripe.Checkout.Session) {
  const { userId, plan, credits } = session.metadata ?? {};
  if (!userId || !plan || !credits) return;

  const { method, paymentIntentId } = await resolvePaymentMethod(session);

  await sql`
    UPDATE users SET plan = ${PLAN_NAMES[plan] ?? plan}, credits = ${Number(credits)}, status = 'Ativo'
    WHERE id = ${userId}
  `;

  await sql`
    INSERT INTO payments (id, "userId", plan, amount, currency, method, status, "stripeSessionId", "stripePaymentIntentId")
    VALUES (${generateUUID()}, ${userId}, ${plan}, ${session.amount_total ?? 0}, ${session.currency ?? 'brl'}, ${method}, 'paid', ${session.id}, ${paymentIntentId})
    ON CONFLICT ("stripeSessionId") DO UPDATE SET status = 'paid', method = EXCLUDED.method
  `;

  console.log(`[Webhook] Plano ${plan} ativado para usuário ${userId} (método: ${method ?? 'desconhecido'})`);
}

// Pix (ou outro método assíncrono) que não confirmou — registra como falho,
// sem creditar o usuário.
async function handleSessionAsyncFailed(session: Stripe.Checkout.Session) {
  const { userId, plan } = session.metadata ?? {};
  if (!userId) return;

  await sql`
    INSERT INTO payments (id, "userId", plan, amount, currency, status, "stripeSessionId")
    VALUES (${generateUUID()}, ${userId}, ${plan ?? ''}, ${session.amount_total ?? 0}, ${session.currency ?? 'brl'}, 'failed', ${session.id})
    ON CONFLICT ("stripeSessionId") DO UPDATE SET status = 'failed'
  `;
  console.log(`[Webhook] Pagamento assíncrono falhou para usuário ${userId}`);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      // Métodos síncronos (cartão) já vêm com payment_status 'paid' aqui.
      // Métodos assíncronos (Pix) ainda podem estar 'unpaid' neste evento —
      // nesse caso, aguardamos checkout.session.async_payment_succeeded para
      // não creditar o usuário antes do pagamento de fato confirmar.
      if (session.payment_status === 'paid') {
        await handleSessionPaid(session);
      }
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
      await handleSessionPaid(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      await handleSessionAsyncFailed(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err: any) {
    console.error('[Webhook] Error processing event:', err.message);
  }

  return NextResponse.json({ received: true });
}
