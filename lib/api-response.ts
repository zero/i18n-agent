import { NextResponse } from 'next/server';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    message,
  });
}

export function errorResponse(error: string, status = 500) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
    },
    { status }
  );
}

export function notFoundResponse(message = 'Resource not found') {
  return errorResponse(message, 404);
}

export function badRequestResponse(message = 'Bad request') {
  return errorResponse(message, 400);
}
