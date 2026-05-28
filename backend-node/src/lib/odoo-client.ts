import axios, { AxiosInstance } from 'axios';
import { env }    from '../config/env';
import { logger } from './logger';

// ─── Types JSON-RPC ──────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method:  'call';
  id:      number;
  params: {
    model?:  string;
    method?: string;
    args?:   unknown[];
    kwargs?: Record<string, unknown>;
    service?: string;
    [key: string]: unknown;
  };
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id:      number;
  result?: T;
  error?: {
    code:    number;
    message: string;
    data?: { name: string; message: string; debug: string };
  };
}

// ─── Erreur Odoo typée ────────────────────────────────────────────────────────

export class OdooError extends Error {
  constructor(
    message: string,
    public readonly odooError?: JsonRpcResponse['error'],
  ) {
    super(message);
    this.name = 'OdooError';
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

class OdooClient {
  private readonly http:    AxiosInstance;
  private sessionCookie:    string | null = null;
  private uid:              number | null = null;
  private authenticating:   Promise<void> | null = null;
  private requestCounter = 0;

  constructor() {
    this.http = axios.create({
      baseURL: env.ODOO_URL,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

    // Inject session cookie on every request
    this.http.interceptors.request.use((config) => {
      if (this.sessionCookie) {
        config.headers['Cookie'] = this.sessionCookie;
      }
      return config;
    });

    // Capture Set-Cookie from responses
    this.http.interceptors.response.use((response) => {
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        const session = setCookie
          .flatMap((c: string) => c.split(';'))
          .find((c: string) => c.trim().startsWith('session_id='));
        if (session) this.sessionCookie = session.trim();
      }
      return response;
    });
  }

  // ── Authentification ─────────────────────────────────────────────────────

  private async authenticate(): Promise<void> {
    if (this.authenticating) return this.authenticating;

    this.authenticating = (async () => {
      logger.debug('[Odoo] Authenticating API user…');
      const res = await this.http.post<JsonRpcResponse<{ uid: number }>>('/web/session/authenticate', {
        jsonrpc: '2.0',
        method:  'call',
        id:      0,
        params: {
          db:       env.ODOO_DB,
          login:    env.ODOO_API_USER,
          password: env.ODOO_API_PASSWORD,
        },
      });
      const { result, error } = res.data;
      if (error || !result?.uid) {
        throw new OdooError(`Odoo authentication failed: ${error?.data?.message ?? 'unknown'}`, error);
      }
      this.uid = result.uid;
      logger.info(`[Odoo] Authenticated as uid=${this.uid}`);
    })().finally(() => {
      this.authenticating = null;
    });

    return this.authenticating;
  }

  // ── Appel générique ──────────────────────────────────────────────────────

  async callKw<T = unknown>(
    model:  string,
    method: string,
    args:   unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<T> {
    if (!this.uid) await this.authenticate();

    const id = ++this.requestCounter;
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      method:  'call',
      id,
      params: {
        model,
        method,
        args,
        kwargs: { context: { lang: 'fr_FR', tz: 'Europe/Paris' }, ...kwargs },
      },
    };

    try {
      const res = await this.http.post<JsonRpcResponse<T>>(
        '/web/dataset/call_kw',
        body,
      );
      const { result, error } = res.data;
      if (error) {
        // Session expired → re-authenticate and retry once
        if (error.code === 100 || error.message?.includes('session')) {
          this.uid = null;
          this.sessionCookie = null;
          await this.authenticate();
          return this.callKw(model, method, args, kwargs);
        }
        const msg = error.data?.message ?? error.message;
        logger.error(`[Odoo] ${model}.${method} error: ${msg}`);
        throw new OdooError(msg, error);
      }
      return result as T;
    } catch (err) {
      if (err instanceof OdooError) throw err;
      logger.error(`[Odoo] Network error on ${model}.${method}:`, err);
      throw new OdooError(`Network error calling ${model}.${method}`);
    }
  }

  // ── Raccourcis ───────────────────────────────────────────────────────────

  async search<T = unknown>(
    model:   string,
    domain:  unknown[][] = [],
    fields?: string[],
    limit?:  number,
    offset?: number,
  ): Promise<T[]> {
    return this.callKw<T[]>(model, 'search_read', [domain], {
      fields: fields ?? [],
      limit:  limit  ?? 100,
      offset: offset ?? 0,
    });
  }

  async create(model: string, values: Record<string, unknown>): Promise<number> {
    return this.callKw<number>(model, 'create', [values]);
  }

  async write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean> {
    return this.callKw<boolean>(model, 'write', [ids, values]);
  }

  async read<T = unknown>(model: string, ids: number[], fields?: string[]): Promise<T[]> {
    return this.callKw<T[]>(model, 'read', [ids, fields ?? []]);
  }
}

// Singleton
export const odoo = new OdooClient();
