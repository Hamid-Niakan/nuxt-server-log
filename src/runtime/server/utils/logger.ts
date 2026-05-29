import { getRequestContext } from './context'
import { parseStackTrace } from './helpers'
import type { ErrorLog } from './context'

class Logger {
  private static instance: Logger
  private logLevel: number
  private levels = { debug: 0, info: 1, warn: 2, error: 3 }

  private constructor(level: string = 'info') {
    this.logLevel = this.levels[level as keyof typeof this.levels] || 1
  }

  static getInstance(level?: string): Logger {
    if (!Logger.instance) Logger.instance = new Logger(level)
    return Logger.instance
  }

  private shouldLog(level: keyof typeof this.levels): boolean {
    return this.levels[level] >= this.logLevel
  }

  private formatLog(
    level: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    const ctx = getRequestContext()
    const baseLog = {
      '@timestamp': new Date().toISOString(),
      level,
      message,
      requestId: ctx?.requestId,
      ...data,
    }
    return JSON.stringify(baseLog)
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (this.shouldLog('debug'))
      console.log(this.formatLog('debug', message, data))
  }

  info(message: string, data?: Record<string, unknown>) {
    if (this.shouldLog('info'))
      console.log(this.formatLog('info', message, data))
  }

  warn(message: string, data?: Record<string, unknown>) {
    if (this.shouldLog('warn'))
      console.warn(this.formatLog('warn', message, data))
  }

  error(
    message: string,
    error?: Error,
    data?: Record<string, unknown>,
    action: ErrorLog['action'] = 'unhandled'
  ) {
    if (this.shouldLog('error')) {
      const errorLog: ErrorLog = {
        '@timestamp': new Date().toISOString(),
        error: error?.message || message,
        type: error?.name || 'Error',
        trace: parseStackTrace(error?.stack),
        action,
        context: error?.cause ? { cause: error.cause } : undefined,
      }

      const ctx = getRequestContext()
      if (ctx) ctx.errors.push(errorLog)

      console.error(this.formatLog('error', message, { error: errorLog, data }))
    }
  }

  logRequest(data: Record<string, unknown>) {
    console.log(JSON.stringify(data))
  }
}

export const logger = Logger.getInstance()
