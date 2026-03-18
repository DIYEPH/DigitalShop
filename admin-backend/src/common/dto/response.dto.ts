export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: any;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Helper function to create success response
export function createSuccessResponse<T>(
  data: T,
  meta?: any,
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

// Helper function to create error response
export function createErrorResponse(
  code: string,
  message: string,
  path: string,
  details?: any,
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path,
    },
  };
}
