import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ErrorCodes } from "../enums/error-codes.enum";
import { createErrorResponse } from "../dto/response.dto";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorCode = this.getErrorCode(exception, status);
    const errorMessage = this.getErrorMessage(exception);
    const errorDetails = this.getErrorDetails(exception);

    const errorResponse = createErrorResponse(
      errorCode,
      errorMessage,
      request.url,
      errorDetails,
    );

    console.error("HTTP Exception:", {
      code: errorCode,
      message: errorMessage,
      status,
      path: request.url,
      method: request.method,
      details: errorDetails,
    });

    response.status(status).json(errorResponse);
  }

  private getErrorCode(exception: HttpException, status: number): string {
    const body = exception.getResponse();

    if (typeof body === "object" && body !== null && body["code"]) {
      return String(body["code"]);
    }

    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION_ERROR;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCodes.AUTH_TOO_MANY_ATTEMPTS;
      default:
        return ErrorCodes.INTERNAL_ERROR;
    }
  }

  private getErrorMessage(exception: HttpException): string {
    const body = exception.getResponse();

    if (typeof body === "string") {
      return body;
    }

    if (typeof body === "object" && body !== null) {
      const msg = body["message"];
      if (typeof msg === "string") return msg;
      if (Array.isArray(msg)) return msg.map(String).join("; ");
    }

    return exception.message;
  }

  private getErrorDetails(
    exception: HttpException,
  ): Record<string, unknown> | null {
    const body = exception.getResponse();

    if (typeof body === "object" && body !== null && body["details"]) {
      return body["details"] as Record<string, unknown>;
    }

    if (
      typeof body === "object" &&
      body !== null &&
      Array.isArray(body["message"])
    ) {
      return { validationErrors: body["message"] };
    }

    return null;
  }
}
