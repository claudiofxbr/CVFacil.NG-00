import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada.');
    _sql = neon(url);
  }
  return _sql;
}

export function sql(...args: Parameters<NeonQueryFunction<false, false>>) {
  return getSql()(...args);
}

// Múltiplas queries executadas atomicamente como uma única transação Postgres
// não-interativa via HTTP (recurso nativo do driver @neondatabase/serverless).
// Ou todas as queries são aplicadas, ou nenhuma é — usado onde uma falha
// parcial não pode deixar o banco em estado inconsistente (ex.: conceder
// crédito e criar a notificação correspondente).
export function sqlTransaction(queries: any[]) {
  return (getSql() as any).transaction(queries);
}
