/**
 * Client-Safe Logger - Browser-compatible logging for the AI trading system
 * Provides structured logging without server-side dependencies
 */

export interface LogContext {
  userId?: string;
  tradeId?: string;
  strategyId?: string;
  symbol?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export class ClientTradingLogger {
  private isProduction = process.env.NODE_ENV === 'production';

  constructor() {
    console.log('🚀 Client Trading Logger initialized');
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    console.info(`[INFO] ${message}`, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };

    console.error(`[ERROR] ${message}`, errorContext);
  }

  /**
   * Log critical message (highest severity)
   */
  critical(message: string, context?: LogContext): void {
    console.error(`[CRITICAL] 🚨 ${message}`, {
      ...context,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log trade execution for audit trail
   */
  logTrade(trade: {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    strategy: string;
    signal: any;
    execution: any;
  }): void {
    const tradeLog = {
      timestamp: new Date().toISOString(),
      tradeId: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      value: trade.quantity * trade.price,
      strategy: trade.strategy,
      signal: trade.signal,
      execution: trade.execution,
      environment: process.env.NODE_ENV
    };

    console.info(`[TRADE] ${trade.side} ${trade.quantity} ${trade.symbol} @ $${trade.price}`, tradeLog);
  }

  /**
   * Log signal generation for analysis
   */
  logSignal(signal: {
    symbol: string;
    action: string;
    strength: number;
    confidence: number;
    strategy: string;
    reasoning: string;
  }): void {
    console.debug(`[SIGNAL] ${signal.action} ${signal.symbol} (confidence: ${signal.confidence})`, {
      timestamp: new Date().toISOString(),
      ...signal
    });
  }

  /**
   * Log risk alert
   */
  logRiskAlert(alert: {
    type: string;
    severity: string;
    message: string;
    currentValue: number;
    limit: number;
  }): void {
    const logMessage = `[RISK] ${alert.type} - ${alert.message}`;
    
    if (alert.severity === 'CRITICAL') {
      this.critical(logMessage, { action: 'RISK_ALERT', metadata: alert });
    } else if (alert.severity === 'HIGH') {
      this.error(logMessage, undefined, { action: 'RISK_ALERT', metadata: alert });
    } else {
      this.warn(logMessage, { action: 'RISK_ALERT', metadata: alert });
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(metric: PerformanceMetric): void {
    console.info(`[PERF] ${metric.operation}: ${metric.duration}ms`, {
      timestamp: new Date().toISOString(),
      ...metric
    });

    // Alert on slow operations
    if (metric.duration > 1000) {
      this.warn(`Slow operation detected: ${metric.operation} took ${metric.duration}ms`, {
        action: 'SLOW_OPERATION',
        metadata: metric
      });
    }
  }

  /**
   * Log API call for monitoring
   */
  logApiCall(api: {
    service: string;
    endpoint: string;
    duration: number;
    status: number;
    error?: string;
  }): void {
    console.info(`[API] ${api.service}${api.endpoint}: ${api.status} (${api.duration}ms)`, {
      timestamp: new Date().toISOString(),
      ...api
    });

    if (api.error || api.status >= 400) {
      this.error(`API call failed: ${api.service} ${api.endpoint}`, undefined, {
        action: 'API_ERROR',
        metadata: api
      });
    }
  }

  /**
   * Create performance timer
   */
  startTimer(): { end: (metadata?: any) => number } {
    const start = Date.now();
    return {
      end: (metadata?: any) => {
        const duration = Date.now() - start;
        return duration;
      }
    };
  }

  /**
   * Flush all pending logs (no-op for client)
   */
  async flush(): Promise<void> {
    // No-op for client-side
  }
}

// Export singleton instance
export const logger = new ClientTradingLogger();

// Export convenience methods
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => logger.error(message, error, context),
  critical: (message: string, context?: LogContext) => logger.critical(message, context),
  trade: (trade: any) => logger.logTrade(trade),
  signal: (signal: any) => logger.logSignal(signal),
  risk: (alert: any) => logger.logRiskAlert(alert),
  performance: (metric: PerformanceMetric) => logger.logPerformance(metric),
  api: (api: any) => logger.logApiCall(api),
  timer: () => logger.startTimer()
};