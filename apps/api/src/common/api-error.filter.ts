import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Uniform error envelope: { error: { code, message } }.
 * Internal errors never leak their message to the client.
 */
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiError');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const http = exception instanceof HttpException ? exception : null;
    const status = http?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload = http?.getResponse();
    const detail =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : {};

    let message: string;
    if (status >= 500) {
      message = 'Lỗi hệ thống. Vui lòng thử lại sau.';
    } else if (Array.isArray(detail.message)) {
      message = detail.message.join('; ');
    } else if (typeof detail.message === 'string') {
      message = detail.message;
    } else {
      message = http?.message ?? 'Yêu cầu không hợp lệ.';
    }

    const code =
      typeof detail.code === 'string'
        ? detail.code
        : status >= 500
          ? 'INTERNAL_ERROR'
          : status === 400
            ? 'VALIDATION_FAILED'
            : status === 404
              ? 'NOT_FOUND'
              : 'REQUEST_FAILED';

    response.status(status).json({ error: { code, message } });
  }
}
