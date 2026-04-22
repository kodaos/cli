/**
 * Agent Interaction Utilities
 *
 * Provides structured output, error formatting, and exit codes
 * for machine-to-machine interaction.
 */

export type OutputMode = 'json' | 'text'

export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  NETWORK_ERROR: 3,
  FILE_SYSTEM_ERROR: 4,
  CONFIG_ERROR: 5,
} as const

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES]

export interface AgentError {
  code: string
  message: string
  details?: unknown
  suggestion?: string
}

export interface DryRunResult {
  action: string
  wouldPerform: boolean
  changes: string[]
  details?: unknown
}

/**
 * Check if output should be JSON based on --output option
 */
export function isJsonMode(output: unknown): boolean {
  return output === 'json'
}

/**
 * Format success result as JSON
 */
export function formatJsonSuccess(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Format error as AgentError structure
 */
export function formatAgentError(
  code: string,
  message: string,
  details?: unknown,
  suggestion?: string,
): AgentError {
  return {
    code,
    message,
    ...(details !== undefined && { details }),
    ...(suggestion !== undefined && { suggestion }),
  }
}

/**
 * Output error and exit with appropriate code
 */
export function exitWithError(
  output: OutputMode,
  code: ExitCode,
  message: string,
  details?: unknown,
  suggestion?: string,
): never {
  if (isJsonMode(output)) {
    const error = formatAgentError(errorCodeToString(code), message, details, suggestion)
    console.error(JSON.stringify(error, null, 2))
  } else {
    console.error(`Error: ${message}`)
    if (suggestion) {
      console.error(`Suggestion: ${suggestion}`)
    }
  }
  process.exit(code)
}

/**
 * Map ExitCode to error code string for AgentError
 */
function errorCodeToString(code: ExitCode): string {
  switch (code) {
    case EXIT_CODES.VALIDATION_ERROR:
      return 'VALIDATION_ERROR'
    case EXIT_CODES.NETWORK_ERROR:
      return 'NETWORK_ERROR'
    case EXIT_CODES.FILE_SYSTEM_ERROR:
      return 'FILE_SYSTEM_ERROR'
    case EXIT_CODES.CONFIG_ERROR:
      return 'CONFIG_ERROR'
    default:
      return 'GENERAL_ERROR'
  }
}

/**
 * Determine exit code from error
 */
export function getExitCode(error: unknown): ExitCode {
  if (error instanceof ValidationError) {
    return EXIT_CODES.VALIDATION_ERROR
  }
  if (error instanceof NetworkError) {
    return EXIT_CODES.NETWORK_ERROR
  }
  if (error instanceof FileSystemError) {
    return EXIT_CODES.FILE_SYSTEM_ERROR
  }
  if (error instanceof ConfigError) {
    return EXIT_CODES.CONFIG_ERROR
  }
  return EXIT_CODES.GENERAL_ERROR
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly suggestion?: string,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly suggestion?: string,
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly suggestion?: string,
  ) {
    super(message)
    this.name = 'FileSystemError'
  }
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly suggestion?: string,
  ) {
    super(message)
    this.name = 'ConfigError'
  }
}
