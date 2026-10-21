import type { ArgumentsHost } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresentationExceptionFilter } from '@/modules/shared/http-exception.filter.ts';

describe('dependency failures', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each(['08006', '57P01', '57P03', '53300', 'ECONNREFUSED', 'CONNECT_TIMEOUT', 'CONNECTION_CLOSED'])(
    'maps %s to a retryable response without database details', (code) => {
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const send = vi.fn();
      const status = vi.fn().mockReturnValue({ send });
      const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
      new PresentationExceptionFilter().catch(Object.assign(new Error('private database connection details'), { code }), host);
      expect(status).toHaveBeenCalledWith(503);
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ code: 'SERVICE_UNAVAILABLE' }));
      expect(JSON.stringify(send.mock.calls)).not.toContain('private database');
    },
  );
  it('keeps unexpected failures as server errors', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
    new PresentationExceptionFilter().catch(Object.assign(new Error('private schema details'), { code: '42P01' }), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(send.mock.calls)).not.toContain('private schema');
  });
});
