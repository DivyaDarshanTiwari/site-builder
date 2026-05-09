import axios from 'axios';

interface ApiErrorResponse {
  message?: string;
}

export const getErrorMessage = (
  error: unknown,
  fallbackMessage = 'Something went wrong',
): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
