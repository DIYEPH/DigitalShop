import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'worker_threads';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { getSharedPgPool } from '../../shared/infrastructure/pg-pool';
import { decryptShopSecretJson, sha256Hex } from '../../shared/infrastructure/shop-secret-crypto';

interface DesiredBotRow {
  bot_id: number;
  shop_id: string;
  shop_name: string;
  bot_username: string | null;
  support_url: string | null;
  bank_enabled: boolean;
  bot_token_encrypted: string;
  secret_encrypted: string;
  updated_at: Date;
}

interface RunningBot {
  worker: Worker;
  /** Hash of the injected per-shop config; any change restarts the worker. */
  fingerprint: string;
}

const DEFAULT_POLL_MS = 15_000;

/**
 * Embeds the Telegram bot runner (bot_binance_pay) as an in-process service:
 * one worker thread per ACTIVE bot of an ACTIVE shop, reconciled against
 * telegram_bots. Toggling the bot in the seller admin starts/stops its worker
 * on the next tick.
 */
@Injectable()
export class BotRunnerManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotRunnerManagerService.name);
  private readonly running = new Map<number, RunningBot>();
  private intervalId?: ReturnType<typeof setInterval>;
  private reconciling = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (!this.isEnabled()) {
      this.logger.log('Bot runner manager disabled (BOT_RUNNER_ENABLED=false)');
      return;
    }
    const runnerDir = this.runnerDir();
    if (!existsSync(join(runnerDir, 'src', 'bot.js'))) {
      this.logger.warn(`Bot runner manager disabled: runner not found at ${runnerDir}`);
      return;
    }

    void this.reconcile();
    const pollMs = this.pollMs();
    this.intervalId = setInterval(() => void this.reconcile(), pollMs);
    if (typeof this.intervalId.unref === 'function') this.intervalId.unref();
    this.logger.log(`Bot runner manager enabled (reconcile every ${pollMs}ms, dir=${runnerDir})`);
  }

  onModuleDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    for (const [botId, bot] of this.running) {
      void bot.worker.terminate();
      this.logger.log(`Stopped bot service #${botId} (shutdown)`);
    }
    this.running.clear();
  }

  async reconcile(): Promise<void> {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const desired = await this.loadDesiredBots();
      const desiredIds = new Set(desired.map((row) => row.bot_id));

      for (const [botId, bot] of this.running) {
        if (!desiredIds.has(botId)) {
          void bot.worker.terminate();
          this.running.delete(botId);
          this.logger.log(`Stopped bot service #${botId} (deactivated)`);
        }
      }

      for (const row of desired) {
        const fingerprint = this.fingerprintOf(row);
        const current = this.running.get(row.bot_id);
        if (current) {
          if (current.fingerprint === fingerprint) continue;
          void current.worker.terminate();
          this.running.delete(row.bot_id);
          this.logger.log(`Restarting bot service #${row.bot_id} (shop config changed)`);
        }
        this.startBot(row, fingerprint);
      }
    } catch (err) {
      this.logger.warn(
        `Bot runner reconcile failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.reconciling = false;
    }
  }

  private async loadDesiredBots(): Promise<DesiredBotRow[]> {
    const result = await getSharedPgPool().query<DesiredBotRow>(
      `SELECT tb.id AS bot_id,
              tb.shop_id::text AS shop_id,
              s.name AS shop_name,
              tb.bot_username,
              s.support_url,
              EXISTS (
                SELECT 1 FROM shop_payment_credentials pc
                WHERE pc.shop_id = tb.shop_id
                  AND pc.payment_method = 'BANK'
                  AND pc.status = 'ACTIVE'
              ) AS bank_enabled,
              tb.bot_token_encrypted,
              tb.secret_encrypted,
              tb.updated_at
       FROM telegram_bots tb
       INNER JOIN shops s ON s.id = tb.shop_id
       WHERE tb.status = 'ACTIVE'
         AND s.status = 'ACTIVE'
         AND tb.bot_token_encrypted IS NOT NULL
         AND tb.secret_encrypted IS NOT NULL
       ORDER BY tb.id ASC`,
    );
    return result.rows;
  }

  private fingerprintOf(row: DesiredBotRow): string {
    return sha256Hex(
      [
        row.bot_token_encrypted,
        row.secret_encrypted,
        row.shop_name,
        row.bot_username ?? '',
        row.support_url ?? '',
        String(row.bank_enabled),
      ].join(':'),
    );
  }

  private startBot(row: DesiredBotRow, fingerprint: string): void {
    const botToken = String(decryptShopSecretJson(row.bot_token_encrypted).bot_token || '');
    const botSecret = String(decryptShopSecretJson(row.secret_encrypted).secret || '');
    if (!botToken || !botSecret) {
      this.logger.warn(`Bot #${row.bot_id}: cannot decrypt token/secret, skipping`);
      return;
    }

    const worker = new Worker(join(this.runnerDir(), 'src', 'bot.js'), {
      env: {
        ...process.env,
        BOT_TOKEN: botToken,
        SHOP_NAME: row.shop_name,
        BOT_USERNAME: row.bot_username ?? '',
        SUPPORT_URL: row.support_url ?? '',
        BANK_ENABLED: row.bank_enabled ? 'true' : 'false',
        BACKEND_API_BASE_URL: this.backendBaseUrl(),
        BACKEND_BOT_SECRET: botSecret,
      },
      stdout: true,
      stderr: true,
    });

    worker.stdout.on('data', (chunk: Buffer) => {
      this.logger.log(`[bot#${row.bot_id}] ${String(chunk).trimEnd()}`);
    });
    worker.stderr.on('data', (chunk: Buffer) => {
      this.logger.warn(`[bot#${row.bot_id}] ${String(chunk).trimEnd()}`);
    });
    worker.on('error', (err: Error) => {
      this.logger.warn(`[bot#${row.bot_id}] worker error: ${err.message}`);
    });
    worker.on('exit', (code) => {
      // Next reconcile tick restarts the service if it is still desired.
      if (this.running.get(row.bot_id)?.worker === worker) {
        this.running.delete(row.bot_id);
      }
      this.logger.warn(`Bot service #${row.bot_id} exited (code=${code})`);
    });

    this.running.set(row.bot_id, { worker, fingerprint });
    this.logger.log(`Started bot service #${row.bot_id} for shop ${row.shop_name}`);
  }

  private isEnabled(): boolean {
    const raw = this.config.get<string>('BOT_RUNNER_ENABLED', 'true');
    return raw !== 'false' && raw !== '0';
  }

  private pollMs(): number {
    const raw = Number(this.config.get<string>('BOT_RUNNER_POLL_MS', String(DEFAULT_POLL_MS)));
    return Number.isFinite(raw) && raw >= 5_000 ? raw : DEFAULT_POLL_MS;
  }

  private runnerDir(): string {
    const configured = this.config.get<string>('BOT_RUNNER_DIR', '');
    return resolve(configured || join(process.cwd(), '..', 'bot_binance_pay'));
  }

  /** Without `/api` — the runner already prefixes its request paths. */
  private backendBaseUrl(): string {
    const configured = this.config.get<string>('BOT_RUNNER_BACKEND_URL', '');
    if (configured) return configured.replace(/\/api\/?$/, '');
    const port = Number(this.config.get<string>('PORT', '3000'));
    return `http://localhost:${port}`;
  }
}
