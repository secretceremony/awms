import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

export interface ResponseStructure<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: unknown;
}

interface PaginatedResponse<T> {
  data: T;
  meta: unknown;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseStructure<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseStructure<T>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();
    return next.handle().pipe(
      map((data: unknown) => {
        // If data is already structured with metadata (e.g. from pagination)
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          const paginated = data as PaginatedResponse<T>;
          return {
            success: true,
            statusCode: response.statusCode,
            message: 'Success',
            data: paginated.data,
            meta: paginated.meta,
          };
        }
        return {
          success: true,
          statusCode: response.statusCode,
          message: 'Success',
          data: data as T,
        };
      }),
    );
  }
}
