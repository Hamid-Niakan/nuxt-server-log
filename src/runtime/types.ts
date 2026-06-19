export interface LoggerRuntimeConfig {
  enabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  sampleRate: number;
  excludePaths: string[];
  apiDurationWarning: number;
  responseDurationWarning: number;
  remoteAddressHeader?: string;
  redactQueryKeys: string[];
  traceDepth: number;
}
