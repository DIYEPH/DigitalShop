import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentShop } from '../../common/decorators/current-shop.decorator';
import { ShopScoped } from '../../common/decorators/shop-scoped.decorator';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ProductsService } from './products.service';

@ApiTags('Product Plans')
@Controller('products/:productId/plans')
@ShopScoped()
export class ProductPlansController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product plan' })
  create(
    @CurrentShop('id') shopId: string,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreatePlanDto,
  ) {
    return this.productsService.createPlan(shopId, productId, dto);
  }

  @Put(':planId')
  @ApiOperation({ summary: 'Update product plan' })
  update(
    @CurrentShop('id') shopId: string,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.productsService.updatePlan(shopId, productId, planId, dto);
  }

  @Delete(':planId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product plan' })
  async remove(
    @CurrentShop('id') shopId: string,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    await this.productsService.removePlan(shopId, productId, planId);
    return { message: 'Plan deleted successfully' };
  }
}
