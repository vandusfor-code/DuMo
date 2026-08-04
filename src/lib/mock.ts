/**
 * Simulates network latency for the mock data layer so loading states are
 * exercised in development. Real repositories (Google Sheets) won't need this.
 */
export function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}
