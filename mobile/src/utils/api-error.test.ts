import { AxiosError, type AxiosResponse } from 'axios';

import { ApiError, toApiError } from './api-error';

function axiosErrorWithResponse(status: number, data?: unknown): AxiosError {
  const response = { status, data } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response);
}

describe('toApiError', () => {
  it('returns an existing ApiError unchanged', () => {
    const original = new ApiError('boom', 418, 'TEAPOT');

    expect(toApiError(original)).toBe(original);
  });

  it('maps an axios error without response to a network error', () => {
    const result = toApiError(new AxiosError('Network Error'));

    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.status).toBeUndefined();
  });

  it('uses message, code and status from the server response body', () => {
    const result = toApiError(
      axiosErrorWithResponse(409, {
        message: 'Email này đã được sử dụng.',
        code: 'EMAIL_ALREADY_USED',
      }),
    );

    expect(result.status).toBe(409);
    expect(result.code).toBe('EMAIL_ALREADY_USED');
    expect(result.message).toBe('Email này đã được sử dụng.');
  });

  it('falls back to a generic message when the body has none', () => {
    const result = toApiError(axiosErrorWithResponse(500));

    expect(result.status).toBe(500);
    expect(result.message).toBe('Đã có lỗi xảy ra.');
  });

  it('wraps plain errors and unknown values', () => {
    expect(toApiError(new Error('oops')).message).toBe('oops');
    expect(toApiError('weird').message).toBe('Lỗi không xác định.');
  });
});
