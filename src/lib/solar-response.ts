// Large roof imagery can arrive slowly on mobile connections. Bound total bytes
// and elapsed time, but do not cancel a progressing download at the request's
// header deadline. No retries or additional provider requests are made here.
export async function abortable<T>(operation: Promise<T>, signal: AbortSignal) {
  signal.throwIfAborted();
  let onAbort!: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([operation, cancelled]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

export async function readSolarResponse(
  response: Response,
  controller: AbortController,
  progress: (bytes: number) => void,
) {
  if (!response.body) throw new Error('empty_response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let idle: ReturnType<typeof setTimeout>;
  const abort = () => void reader.cancel().catch(() => {});
  const expired = () => controller.abort();
  const total = setTimeout(expired, 120000);
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(expired, 20000);
  };
  controller.signal.addEventListener('abort', abort, { once: true });
  resetIdle();
  try {
    controller.signal.throwIfAborted();
    for (;;) {
      const { value, done } = await reader.read();
      controller.signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > 12000000) {
        await reader.cancel();
        throw new Error('oversized_response');
      }
      chunks.push(value);
      progress(size);
      resetIdle();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(total);
    clearTimeout(idle!);
    controller.signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}
