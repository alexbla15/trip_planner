// Nominatim's usage policy caps requests to ~1/sec from a single client. Both geo
// routes can have many cache-miss lookups fire in parallel (e.g. every city in a
// country on first view), which would otherwise burst far past that limit and get
// 429'd. Serialize all outgoing Nominatim requests through this shared queue.

const MIN_INTERVAL_MS = 1100;
let chain: Promise<void> = Promise.resolve();

export function queueNominatimFetch(url: string, init: RequestInit): Promise<Response> {
  const run = chain.then(async () => {
    const res = await fetch(url, init);
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS));
    return res;
  });
  // Keep the chain alive even if this particular request throws, so one failure
  // doesn't stall every subsequent queued request forever.
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
