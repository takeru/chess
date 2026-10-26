import type { ApiErrorBody, ErrorCode } from '@chess/protocol';

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  not_your_turn: 409,
  game_full: 409,
  game_not_active: 409,
  illegal_move: 422,
  internal: 500,
};

/** An error that maps directly onto an API error response. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get status(): number {
    return STATUS[this.code];
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message } };
  }
}

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

export function errorResponse(error: ApiError): Response {
  return json(error.toBody(), error.status);
}

const MAX_BODY_BYTES = 16 * 1024;

/** Reads a JSON object body. An empty body is treated as `{}`. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError('bad_request', 'Request body is too large');
  if (!text.trim()) return {};
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ApiError('bad_request', 'Request body must be valid JSON');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiError('bad_request', 'Request body must be a JSON object');
  }
  return value as Record<string, unknown>;
}

export function bearerToken(request: Request): string {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) throw new ApiError('unauthorized', 'Missing "Authorization: Bearer <token>" header');
  return match[1]!;
}
