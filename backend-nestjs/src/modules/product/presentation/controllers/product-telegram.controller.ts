import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { BotSecretGuard } from '../../../auth/presentation/guards/bot-secret.guard';
import { GetTelegramProductDetailUseCase } from '../../application/use-cases/get-telegram-product-detail.use-case';
import { ListTelegramProductsUseCase } from '../../application/use-cases/list-telegram-products.use-case';

@Controller('product/telegram')
@UseGuards(BotSecretGuard)
export class ProductTelegramController {
  constructor(
    private readonly listTelegramProductsUseCase: ListTelegramProductsUseCase,
    private readonly getTelegramProductDetailUseCase: GetTelegramProductDetailUseCase,
  ) {}

  @Get('products')
  async listProducts(
    @Query('category_id') categoryIdQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('limit') limitQuery?: string,
  ) {
    const categoryId = categoryIdQuery ? Number(categoryIdQuery) : null;
    const page = Math.max(1, Number(pageQuery || 1));
    const limit = Math.min(50, Math.max(1, Number(limitQuery || 20)));
    const result = await this.listTelegramProductsUseCase.execute(categoryId, page, limit);
    return {
      data: result.data,
      meta: { page, limit, total: result.total },
    };
  }

  @Get('products/:id')
  async getProductDetail(@Param('id', ParseIntPipe) productId: number) {
    const data = await this.getTelegramProductDetailUseCase.execute(productId);
    return { data };
  }
}
