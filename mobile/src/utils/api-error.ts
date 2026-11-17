import axios from 'axios';

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  message?: string;
  code?: string;
}

/** Normalizes any thrown value into an ApiError with a user-friendly message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError(
        'Không thể kết nối tới máy chủ. Kiểm tra mạng hoặc địa chỉ API.',
        undefined,
        'NETWORK_ERROR',
      );
    }
    const body = error.response.data as ErrorBody | undefined;
    return new ApiError(body?.message ?? 'Đã có lỗi xảy ra.', error.response.status, body?.code);
  }

  return new ApiError(error instanceof Error ? error.message : 'Lỗi không xác định.');
}
