import { test, expect } from '@playwright/test';
import { mock } from 'node:test';
import { abortable, readSolarResponse } from '../src/lib/solar-response';

test.describe('roof download deadlines', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600000);
  test.beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
  test.afterEach(() => mock.timers.reset());
  test('a stalled image-module import stops when cancelled', async () => {
    const controller = new AbortController();
    const result = abortable(new Promise(() => {}), controller.signal);
    const rejected = expect(result).rejects.toThrow();
    controller.abort();
    await rejected;
  });
  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  test('a progressing download survives 55 seconds and reports received bytes', async () => {
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const response = new Response(
      new ReadableStream({
        start(c) {
          stream = c;
        },
      }),
    );
    const abort = new AbortController();
    const progress: number[] = [];
    const result = readSolarResponse(response, abort, (n) => progress.push(n));
    const parts = ['{"status":', '"available",', '"data_available":', 'true}'];
    for (const part of parts) {
      mock.timers.tick(15000);
      stream.enqueue(new TextEncoder().encode(part));
      await flush();
    }
    stream.close();
    expect(await result).toEqual({ status: 'available', data_available: true });
    expect(abort.signal.aborted).toBe(false);
    expect(progress.length).toBe(4);
    expect(progress.at(-1)).toBe(parts.join('').length);
    mock.timers.tick(120000);
    expect(abort.signal.aborted).toBe(false);
  });

  test('a stalled download aborts and cancels its reader', async () => {
    let cancelled = false;
    const response = new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
    );
    const abort = new AbortController();
    const result = readSolarResponse(response, abort, () => {});
    const rejected = expect(result).rejects.toThrow();
    mock.timers.tick(20001);
    await rejected;
    expect(cancelled).toBe(true);
    expect(abort.signal.aborted).toBe(true);
  });

  test('continuous progress cannot exceed the overall deadline', async () => {
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const abort = new AbortController();
    const result = readSolarResponse(
      new Response(
        new ReadableStream({
          start(c) {
            stream = c;
          },
        }),
      ),
      abort,
      () => {},
    );
    const rejected = expect(result).rejects.toThrow();
    for (let i = 0; i < 11; i++) {
      mock.timers.tick(10000);
      stream.enqueue(new Uint8Array([32]));
      await flush();
    }
    mock.timers.tick(10001);
    await rejected;
    expect(abort.signal.aborted).toBe(true);
  });

  test('oversized, malformed and cancelled downloads cannot produce a result', async () => {
    for (const kind of ['large', 'invalid', 'cancelled']) {
      const abort = new AbortController();
      if (kind === 'cancelled') abort.abort();
      const response = new Response(
        kind === 'large' ? new Uint8Array(12000001) : '<html>error</html>',
      );
      await expect(
        readSolarResponse(response, abort, () => {}),
      ).rejects.toThrow();
      expect(response.body!.locked).toBe(false);
      mock.timers.tick(130000);
      expect(abort.signal.aborted).toBe(kind === 'cancelled');
    }
  });
});
