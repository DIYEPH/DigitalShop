import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../dto/api-response.dto';

type MaybeWrappedResponse<T> = T | ApiResponse<T>;

function isWrappedResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<MaybeWrappedResponse<T>>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        if (isWrappedResponse(value)) {
          return value as ApiResponse<T>;
        }

        return { data: value as T };
      }),
    );
  }
}
