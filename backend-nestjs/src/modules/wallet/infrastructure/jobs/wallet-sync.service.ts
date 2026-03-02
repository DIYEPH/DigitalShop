import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProcessBankTelegramTopupUseCase } from '../../application/use-cases/process-bank-topup.use-case';
import { ProcessBinanceTelegramTopupUseCase } from '../../application/use-cases/process-binance-topup.use-case';
import { TopupRepository } from '../../domain/repositories/topup.repository';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';

/**
 * Job nền cho wallet: expire PENDING quá hạn + poll Binance topup.
 * Chạy trong WalletModule — tách khỏi PendingOrderSyncService để giữ module boundaries.
 */
const DEFAULT_POLL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 100;

@Injectable()
export class WalletSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WalletSyncService.name);
  private intervalId?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
    private readonly processBinanceTopup: ProcessBinanceTelegramTopupUseCase,
    private readonly processBankTopup: ProcessBankTelegramTopupUseCase,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.isEnabled()) return;
    void this.tick();
    const pollMs = this.resolvePollMs();
    this.intervalId = setInterval(() => void this.tick(), pollMs);
    if (typeof this.intervalId.unref === 'function') this.intervalId.unref();
    this.logger.log(`Wallet sync job enabled (every ${pollMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.expireStep();
      await this.binanceTopupStep();
      await this.bankTopupStep();
    } catch (err) {
      this.logger.warn(
        `Wallet sync tick failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async expireStep(): Promise<void> {
    const batchSize = this.resolveBatchSize();
    let batch: { cancelledCount: number };
    do {
      batch = await this.topupRepository.expireTimedPendingTopups(batchSize);
      if (batch.cancelledCount > 0) {
        this.logger.log(`Expired ${batch.cancelledCount} timed pending topup(s)`);
      }
    } while (batch.cancelledCount >= batchSize);
  }

  private async binanceTopupStep(): Promise<void> {
    const topups = await this.topupRepository.listPendingBinanceTopups();
    for (const topup of topups) {
      await this.processBinanceTopup.execute(topup);
    }
  }

  private async bankTopupStep(): Promise<void> {
    const topups = await this.topupRepository.listPendingBankTopups();
    for (const topup of topups) {
      await this.processBankTopup.execute(topup);
    }
  }

  private isEnabled(): boolean {
    const raw = this.config.get<string>('PENDING_ORDER_SYNC_ENABLED', 'true');
    return raw !== 'false' && raw !== '0';
  }

  private resolvePollMs(): number {
    const raw = Number(this.config.get<string>('PENDING_ORDER_SYNC_POLL_MS', String(DEFAULT_POLL_MS)));
    return Number.isFinite(raw) && raw >= 5_000 ? raw : DEFAULT_POLL_MS;
  }

  private resolveBatchSize(): number {
    const raw = Number(this.config.get<string>('PENDING_ORDER_SYNC_BATCH_SIZE', String(DEFAULT_BATCH_SIZE)));
    return Number.isInteger(raw) && raw >= 1 ? raw : DEFAULT_BATCH_SIZE;
  }
}
