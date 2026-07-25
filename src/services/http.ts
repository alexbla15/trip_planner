export class ApiError<TBody = unknown> extends Error {
  readonly status: number;
  readonly body: TBody | null;

  constructor(status: number, body: TBody | null) {
    super(`Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Parses a fetch Response as JSON, throwing ApiError (with the parsed body) on a non-OK status. */
export async function parseOrThrow<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
