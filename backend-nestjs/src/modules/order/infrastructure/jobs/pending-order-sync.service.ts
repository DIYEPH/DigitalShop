import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BinancePayGateway } from '../../../../integration/binance/binance-pay.gateway';
import { ProcessBankOrderPaymentUseCase } from '../../application/use-cases/process-bank-order-payment.use-case';
import { ProcessBinanceOrderPaymentUseCase } from '../../application/use-cases/process-binance-order-payment.use-case';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { BINANCE_PAY_GATEWAY } from '../../../../integration/binance/binance.tokens';
import { ORDER_REPOSITORY } from '../../order.tokens';

/**
 * Job nền duy nhất cho toàn bộ vòng đời đơn PENDING có thời hạn.
 *
 * Mỗi tick (mặc định 30s) chạy tuần tự:
 *  1. Expire  — hủy batch đơn BINANCE/CRYPTO/BANK quá PENDING_PAYMENT_TIMEOUT_MS, trả stock RESERVED → AVAILABLE.
 *  2. BINANCE — poll Binance Pay API, confirm PAID, deliver IN_STOCK.
 *  3. BANK    — (feature 07) poll SePay API.
 *  4. CRYPTO  — (feature sau) kiểm tra on-chain.
 */
const DEFAULT_POLL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 100;

@Injectable()
export class PendingOrderSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PendingOrderSyncService.name);
  private intervalId?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(BINANCE_PAY_GATEWAY)
    private readonly binanceGateway: BinancePayGateway,
    private readonly processBinancePayment: ProcessBinanceOrderPaymentUseCase,
    private readonly processBankPayment: ProcessBankOrderPaymentUseCase,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.isEnabled()) return;
    void this.tick();
    const pollMs = this.resolvePollMs();
    this.intervalId = setInterval(() => void this.tick(), pollMs);
    if (typeof this.intervalId.unref === 'function') this.intervalId.unref();
    this.logger.log(`Pending order sync job enabled (every ${pollMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  /** Một vòng sync — dùng được trong test/script. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.expireStep();
      await this.binanceStep();
      await this.bankStep();
      // feature future: await this.cryptoStep();
    } catch (err) {
      this.logger.warn(
        `Pending order sync tick failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async expireStep(): Promise<void> {
    const batchSize = this.resolveBatchSize();
    let batch: { cancelledCount: number };
    do {
      batch = await this.orderRepository.expireTimedPendingOrders(batchSize);
      if (batch.cancelledCount > 0) {
        this.logger.log(`Expired ${batch.cancelledCount} timed pending order(s)`);
      }
    } while (batch.cancelledCount >= batchSize);
  }

  private async binanceStep(): Promise<void> {
    if (!this.binanceGateway.isEnabled()) return;
    const orders = await this.orderRepository.listPendingBinanceOrders();
    for (const order of orders) {
      await this.processBinancePayment.execute(order);
    }
  }

  private async bankStep(): Promise<void> {
    const orders = await this.orderRepository.listPendingBankOrders();
    for (const order of orders) {
      await this.processBankPayment.execute(order);
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
