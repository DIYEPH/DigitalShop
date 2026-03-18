import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { SuccessResponse } from "../dto/response.dto";

/**
 * Transform all successful responses to follow the standard format
 * This interceptor ensures all API responses have a consistent structure
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response already has success property, return as-is
        if (typeof data === "object" && data !== null && "success" in data) {
          return data;
        }

        // Otherwise, wrap in standard success response format
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
