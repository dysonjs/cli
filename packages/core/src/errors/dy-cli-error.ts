export type DyCliErrorCode =
  | 'UNKNOWN_COMMAND'
  | 'INVALID_ARGUMENT'
  | 'CONFIG_NOT_FOUND'
  | 'SCRIPT_NOT_DEFINED'
  | 'PACKAGE_PRIVATE'
  | 'TARGET_DIR_NOT_EMPTY'
  | 'TEMPLATE_NOT_FOUND';

export class DyCliError extends Error {
  public code: DyCliErrorCode;

  public cause?: unknown;

  constructor(code: DyCliErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'DyCliError';
    this.code = code;
    this.cause = cause;
  }
}
