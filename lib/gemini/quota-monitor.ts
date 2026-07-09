/**
 * Monitor de Quota do Gemini API
 * Rastreia uso e envia alertas proativamente
 */

export interface QuotaMetrics {
  requestsThisMinute: number;
  tokensThisMinute: number;
  requestsThisDay: number;
  tokensThisDay: number;
  timestamp: Date;
}

export interface QuotaThresholds {
  rpm: { warning: number; critical: number };
  tokensPerMin: { warning: number; critical: number };
  requestsPerDay: { warning: number; critical: number };
  tokensPerDay: { warning: number; critical: number };
}

export interface AlertEvent {
  type: 'RPM_WARNING' | 'RPM_CRITICAL' | 'TOKENS_WARNING' | 'TOKENS_CRITICAL' | 'DAILY_WARNING' | 'DAILY_CRITICAL';
  message: string;
  metrics: QuotaMetrics;
  timestamp: Date;
}

type AlertCallback = (event: AlertEvent) => void;

export class QuotaMonitor {
  private metrics: QuotaMetrics = {
    requestsThisMinute: 0,
    tokensThisMinute: 0,
    requestsThisDay: 0,
    tokensThisDay: 0,
    timestamp: new Date(),
  };

  private minuteStart = Date.now();
  private dayStart = Date.now();

  private thresholds: QuotaThresholds = {
    rpm: { warning: 12, critical: 15 }, // Free tier: 15/min
    tokensPerMin: { warning: 900_000, critical: 1_000_000 }, // Free tier: 1M/min
    requestsPerDay: { warning: 270, critical: 300 }, // Free tier: 300/day
    tokensPerDay: { warning: 0, critical: 0 }, // Sem limite específico por dia
  };

  private alertCallbacks: AlertCallback[] = [];
  private alertHistory: AlertEvent[] = [];

  /**
   * Registrar requisição
   */
  recordRequest(tokensUsed: number): void {
    const now = Date.now();

    // Resetar métricas de minuto se necessário
    if (now - this.minuteStart > 60_000) {
      this.metrics.requestsThisMinute = 0;
      this.metrics.tokensThisMinute = 0;
      this.minuteStart = now;
    }

    // Resetar métricas de dia se necessário
    if (now - this.dayStart > 86_400_000) {
      this.metrics.requestsThisDay = 0;
      this.metrics.tokensThisDay = 0;
      this.dayStart = now;
    }

    // Incrementar contadores
    this.metrics.requestsThisMinute++;
    this.metrics.tokensThisMinute += tokensUsed;
    this.metrics.requestsThisDay++;
    this.metrics.tokensThisDay += tokensUsed;

    this.metrics.timestamp = new Date();

    // Verificar limites
    this.checkThresholds();
  }

  /**
   * Verificar violação de limites
   */
  private checkThresholds(): void {
    // Check RPM
    if (this.metrics.requestsThisMinute >= this.thresholds.rpm.critical) {
      this.emitAlert({
        type: 'RPM_CRITICAL',
        message: `🚨 CRÍTICO: ${this.metrics.requestsThisMinute}/${this.thresholds.rpm.critical} requisições por minuto atingido!`,
        metrics: { ...this.metrics },
        timestamp: new Date(),
      });
    } else if (this.metrics.requestsThisMinute >= this.thresholds.rpm.warning) {
      this.emitAlert({
        type: 'RPM_WARNING',
        message: `⚠️ AVISO: ${this.metrics.requestsThisMinute}/${this.thresholds.rpm.critical} requisições por minuto (${this.getPercentage(
          this.metrics.requestsThisMinute,
          this.thresholds.rpm.critical
        )}%)`,
        metrics: { ...this.metrics },
        timestamp: new Date(),
      });
    }

    // Check Tokens per Minute
    if (this.metrics.tokensThisMinute >= this.thresholds.tokensPerMin.critical) {
      this.emitAlert({
        type: 'TOKENS_CRITICAL',
        message: `🚨 CRÍTICO: ${this.metrics.tokensThisMinute.toLocaleString()}/${this.thresholds.tokensPerMin.critical.toLocaleString()} tokens por minuto atingido!`,
        metrics: { ...this.metrics },
        timestamp: new Date(),
      });
    } else if (this.metrics.tokensThisMinute >= this.thresholds.tokensPerMin.warning) {
      this.emitAlert({
        type: 'TOKENS_WARNING',
        message: `⚠️ AVISO: ${this.metrics.tokensThisMinute.toLocaleString()}/${this.thresholds.tokensPerMin.critical.toLocaleString()} tokens por minuto (${this.getPercentage(
          this.metrics.tokensThisMinute,
          this.thresholds.tokensPerMin.critical
        )}%)`,
        metrics: { ...this.metrics },
        timestamp: new Date(),
      });
    }

    // Check Daily Requests
    if (
      this.metrics.requestsThisDay >= this.thresholds.requestsPerDay.critical
    ) {
      this.emitAlert({
        type: 'DAILY_CRITICAL',
        message: `🚨 CRÍTICO: ${this.metrics.requestsThisDay}/${this.thresholds.requestsPerDay.critical} requisições diárias atingido!`,
        metrics: { ...this.metrics },
        timestamp: new Date(),
      });
    } else if (
      this.metrics.requestsThisDay >= this.thresholds.requestsPerDay.warning
    ) {
      this.emitAlert({
        type: 'DAILY_WARNING',
        message: `⚠️ AVISO: ${this.metrics.requestsThisDay}/${this.thresholds.requestsPerDay.critical} requisições diárias (${this.getPercentage(
          this.metrics.requestsThisDay,
          this.thresholds.requestsPerDay.critical
        )}%)`,
        metrics: { ...this.metrics },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Emitir alerta
   */
  private emitAlert(event: AlertEvent): void {
    // Evitar alertas duplicados dentro de 5 segundos
    const recentSameAlert = this.alertHistory
      .slice(-1)
      .find(
        (a) =>
          a.type === event.type && Date.now() - a.timestamp.getTime() < 5000
      );

    if (recentSameAlert) {
      return;
    }

    this.alertHistory.push(event);
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift(); // Manter apenas últimas 100
    }

    // Executar callbacks
    this.alertCallbacks.forEach((cb) => {
      try {
        cb(event);
      } catch (error) {
        console.error('Erro ao executar callback de alert:', error);
      }
    });
  }

  /**
   * Registrar callback para alertas
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.push(callback);

    // Retornar função para unsubscribe
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Obter métricas atuais
   */
  getMetrics(): QuotaMetrics {
    return { ...this.metrics };
  }

  /**
   * Obter relatório formatado
   */
  getReport(): string {
    const rpmPercent = this.getPercentage(
      this.metrics.requestsThisMinute,
      this.thresholds.rpm.critical
    );
    const tokensPercent = this.getPercentage(
      this.metrics.tokensThisMinute,
      this.thresholds.tokensPerMin.critical
    );
    const dailyPercent = this.getPercentage(
      this.metrics.requestsThisDay,
      this.thresholds.requestsPerDay.critical
    );

    return `
╔════════════════════════════════════════════════════════╗
║           📊 Quota Gemini API - Relatório              ║
╚════════════════════════════════════════════════════════╝

⏱️  POR MINUTO:
   Requisições: ${this.metrics.requestsThisMinute}/${this.thresholds.rpm.critical} (${rpmPercent}%)
   Tokens:      ${this.metrics.tokensThisMinute.toLocaleString()}/${this.thresholds.tokensPerMin.critical.toLocaleString()} (${tokensPercent}%)

📅 POR DIA:
   Requisições: ${this.metrics.requestsThisDay}/${this.thresholds.requestsPerDay.critical} (${dailyPercent}%)
   Tokens:      ${this.metrics.tokensThisDay.toLocaleString()} (sem limite específico)

🔔 ALERTAS RECENTES:
${
  this.alertHistory.length === 0
    ? '   ✅ Nenhum alerta nos últimos minutos'
    : this.alertHistory
        .slice(-5)
        .map(
          (a) =>
            `   ${a.type.includes('CRITICAL') ? '🚨' : '⚠️'} [${a.timestamp.toLocaleTimeString()}] ${a.message}`
        )
        .join('\n')
}

⌚ Atualizado: ${this.metrics.timestamp.toLocaleTimeString()}
╚════════════════════════════════════════════════════════╝
    `;
  }

  /**
   * Calcular percentagem
   */
  private getPercentage(current: number, limit: number): string {
    return ((current / limit) * 100).toFixed(1);
  }

  /**
   * Resetar monitor (para testes)
   */
  reset(): void {
    this.metrics = {
      requestsThisMinute: 0,
      tokensThisMinute: 0,
      requestsThisDay: 0,
      tokensThisDay: 0,
      timestamp: new Date(),
    };
    this.minuteStart = Date.now();
    this.dayStart = Date.now();
    this.alertHistory = [];
  }

  /**
   * Configurar limiares customizados
   */
  setThresholds(thresholds: Partial<QuotaThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}

/**
 * Monitor singleton global
 */
let globalMonitor: QuotaMonitor | null = null;

export function getQuotaMonitor(): QuotaMonitor {
  if (!globalMonitor) {
    globalMonitor = new QuotaMonitor();

    // Setup default alert handler (log)
    globalMonitor.onAlert((event) => {
      console.log(event.message);
    });
  }
  return globalMonitor;
}

export default getQuotaMonitor();
