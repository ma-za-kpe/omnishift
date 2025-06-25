/**
 * Logger - Structured logging system for production trading
 * Provides audit trail, performance monitoring, and debugging capabilities
 */

// Server-side imports - only available in Node.js environment
let winston: any;
let DailyRotateFile: any;
let Logtail: any;
let WebClient: any;

// Dynamic imports for server-side only
if (typeof window === 'undefined') {
  winston = require('winston');
  DailyRotateFile = require('winston-daily-rotate-file');
  try {
    const logtailModule = require('@logtail/node');
    Logtail = logtailModule.Logtail;
  } catch (e) {
    console.warn('Logtail not available');
  }
  try {
    const slackModule = require('@slack/web-api');
    WebClient = slackModule.WebClient;
  } catch (e) {
    console.warn('Slack Web API not available');
  }
}

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

export class TradingLogger {
  private logger: any;
  private auditLogger: any;
  private performanceLogger: any;
  private logtail?: any;
  private slackClient?: any;
  private alertChannels: Map<string, string> = new Map();

  constructor() {
    this.logger = this.createMainLogger();
    this.auditLogger = this.createAuditLogger();
    this.performanceLogger = this.createPerformanceLogger();
    this.initializeExternalServices();
  }

  /**
   * Create main application logger
   */
  private createMainLogger(): any {
    // Client-side fallback
    if (typeof window !== 'undefined' || !winston) {
      return {
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
      };
    }

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}] ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { 
        service: 'ai-trading-system',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        // Console transport with pretty formatting
        new winston.transports.Console({
          format: consoleFormat
        }),
        
        // Error log file (only if DailyRotateFile is available)
        ...(DailyRotateFile ? [new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error'
        })] : []),
        
        // Combined log file (only if DailyRotateFile is available)
        ...(DailyRotateFile ? [new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '100m',
          maxFiles: '14d'
        })] : [])
      ],
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
    });
  }

  /**
   * Create audit logger for compliance and trade tracking
   */
  private createAuditLogger(): any {
    if (typeof window !== 'undefined' || !winston) {
      return {
        info: console.info.bind(console),
        warn: console.warn.bind(console)
      };
    }

    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { type: 'audit' },
      transports: [
        ...(DailyRotateFile ? [new DailyRotateFile({
          filename: 'logs/audit/trades-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '50m',
          maxFiles: '365d' // Keep for 1 year for compliance
        })] : [])
      ]
    });
  }

  /**
   * Create performance logger for monitoring
   */
  private createPerformanceLogger(): any {
    if (typeof window !== 'undefined' || !winston) {
      return {
        info: console.info.bind(console)
      };
    }

    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { type: 'performance' },
      transports: [
        ...(DailyRotateFile ? [new DailyRotateFile({
          filename: 'logs/performance/metrics-%DATE%.log',
          datePattern: 'YYYY-MM-DD-HH',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '7d'
        })] : [])
      ]
    });
  }

  /**
   * Initialize external logging services
   */
  private initializeExternalServices(): void {
    // Only initialize on server-side
    if (typeof window !== 'undefined') return;

    // Initialize Logtail for cloud logging
    if (process.env.LOGTAIL_SOURCE_TOKEN && Logtail) {
      try {
        this.logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);
      } catch (error) {
        console.warn('Failed to initialize Logtail:', error);
      }
    }

    // Initialize Slack for alerts
    if (process.env.SLACK_BOT_TOKEN && WebClient) {
      try {
        this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
        
        // Configure alert channels
        this.alertChannels.set('critical', process.env.SLACK_CRITICAL_CHANNEL || 'trading-critical');
        this.alertChannels.set('warning', process.env.SLACK_WARNING_CHANNEL || 'trading-warnings');
        this.alertChannels.set('info', process.env.SLACK_INFO_CHANNEL || 'trading-info');
      } catch (error) {
        console.warn('Failed to initialize Slack client:', error);
      }
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.enrichContext(context));
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.enrichContext(context));
    
    // Send to cloud logging if available
    if (this.logtail) {
      this.logtail.info(message, this.enrichContext(context));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.enrichContext(context));
    
    // Send to cloud logging
    if (this.logtail) {
      this.logtail.warn(message, this.enrichContext(context));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...this.enrichContext(context),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };

    this.logger.error(message, errorContext);
    
    // Send to cloud logging
    if (this.logtail) {
      this.logtail.error(message, errorContext);
    }

    // Send critical errors to Slack
    if (this.shouldAlert('error', context)) {
      this.sendAlert('critical', `🚨 ERROR: ${message}`, errorContext);
    }
  }

  /**
   * Log critical message (highest severity)
   */
  critical(message: string, context?: LogContext): void {
    const criticalContext = {
      ...this.enrichContext(context),
      severity: 'CRITICAL'
    };

    this.logger.error(message, criticalContext);
    
    // Always alert on critical
    this.sendAlert('critical', `🚨🚨 CRITICAL: ${message}`, criticalContext);
    
    // Send SMS for critical alerts if configured
    if (process.env.TWILIO_ENABLED === 'true') {
      this.sendSMS(message);
    }
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

    // Log to audit trail
    this.auditLogger.info('TRADE_EXECUTED', tradeLog);

    // Log to main logger
    this.info(`Trade executed: ${trade.side} ${trade.quantity} ${trade.symbol} @ $${trade.price}`, {
      tradeId: trade.id,
      symbol: trade.symbol,
      action: 'TRADE_EXECUTED'
    });

    // Alert on large trades
    if (trade.quantity * trade.price > 10000) {
      this.sendAlert('info', `📊 Large trade executed: ${trade.side} $${(trade.quantity * trade.price).toLocaleString()} of ${trade.symbol}`, tradeLog);
    }
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
    const signalLog = {
      timestamp: new Date().toISOString(),
      ...signal
    };

    this.auditLogger.info('SIGNAL_GENERATED', signalLog);
    
    this.debug(`Signal generated: ${signal.action} ${signal.symbol} (confidence: ${signal.confidence})`, {
      symbol: signal.symbol,
      action: 'SIGNAL_GENERATED',
      metadata: signal
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
    const riskLog = {
      timestamp: new Date().toISOString(),
      ...alert
    };

    this.auditLogger.warn('RISK_ALERT', riskLog);

    const logMessage = `Risk Alert: ${alert.type} - ${alert.message}`;
    
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
    const perfLog = {
      timestamp: new Date().toISOString(),
      ...metric,
      durationMs: metric.duration
    };

    this.performanceLogger.info('PERFORMANCE_METRIC', perfLog);

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
    const apiLog = {
      timestamp: new Date().toISOString(),
      ...api
    };

    this.performanceLogger.info('API_CALL', apiLog);

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
   * Enrich context with additional metadata
   */
  private enrichContext(context?: LogContext): any {
    return {
      ...context,
      timestamp: new Date().toISOString(),
      processId: process.pid,
      hostname: process.env.HOSTNAME || 'unknown'
    };
  }

  /**
   * Determine if an alert should be sent
   */
  private shouldAlert(level: string, context?: LogContext): boolean {
    // Always alert on errors in production
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      return true;
    }

    // Alert on specific actions
    const alertActions = ['TRADE_EXECUTED', 'RISK_ALERT', 'SYSTEM_ERROR'];
    return alertActions.includes(context?.action || '');
  }

  /**
   * Send alert to Slack
   */
  private async sendAlert(severity: string, message: string, context: any): Promise<void> {
    if (!this.slackClient) return;

    const channel = this.alertChannels.get(severity) || this.alertChannels.get('info')!;
    
    try {
      await this.slackClient.chat.postMessage({
        channel,
        text: message,
        attachments: [{
          color: severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'good',
          fields: [
            {
              title: 'Environment',
              value: process.env.NODE_ENV || 'unknown',
              short: true
            },
            {
              title: 'Component',
              value: context.component || 'unknown',
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date().toLocaleString(),
              short: true
            }
          ],
          footer: 'AI Trading System',
          ts: Math.floor(Date.now() / 1000).toString()
        }]
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Send SMS alert for critical issues
   */
  private async sendSMS(message: string): Promise<void> {
    // Only available on server-side
    if (typeof window !== 'undefined') return;
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return;

    try {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      await twilio.messages.create({
        body: `AI Trading Alert: ${message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.ALERT_PHONE_NUMBER
      });
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
    }
  }

  /**
   * Flush all pending logs
   */
  async flush(): Promise<void> {
    if (this.logtail) {
      await this.logtail.flush();
    }
  }

  /**
   * Query logs for analysis
   */
  async queryLogs(params: {
    startTime: Date;
    endTime: Date;
    level?: string;
    action?: string;
    symbol?: string;
  }): Promise<any[]> {
    // This would integrate with your log storage solution
    // For now, returning empty array as placeholder
    return [];
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(operation: string, timeRange: { start: Date; end: Date }): Promise<{
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    successRate: number;
    totalCalls: number;
  }> {
    // Query performance logs and calculate statistics
    // Placeholder implementation
    return {
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      successRate: 0,
      totalCalls: 0
    };
  }
}

// Export singleton instance
export const logger = new TradingLogger();

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