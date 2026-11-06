import recording from '../fixtures/rpc/testnet.json';

export { recording };
export const recorded = recording.records;
export const address = recorded.staker.response.result.data.address;
export const readAt = Date.parse(recording.recordedAt);
export function success<T>(data: T) {
  return { ok: true as const, data, metadata: null, readAt };
}

// Preserve the recorded envelope; only correlate its id with the current request.
export function fixtureFetch(record: { response: object }): typeof fetch {
  return async (_url, init) => {
    const request: unknown = JSON.parse(String(init?.body));
    if (typeof request !== 'object' || request === null || !('id' in request)) throw new Error('Missing id');
    return Response.json({ ...record.response, id: request.id });
  };
}
