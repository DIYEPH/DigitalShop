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
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductsService } from './products.service';

@ApiTags('Product Variants')
@Controller()
@ShopScoped()
export class ProductVariantsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('products/:productId/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product variant' })
  create(
    @CurrentShop('id') shopId: string,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(shopId, productId, dto);
  }

  @Put('products/variants/:variantId')
  @ApiOperation({ summary: 'Update variant by id' })
  update(
    @CurrentShop('id') shopId: string,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(shopId, variantId, dto);
  }

  @Delete('products/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete variant' })
  async remove(
    @CurrentShop('id') shopId: string,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    await this.productsService.removeVariant(shopId, variantId);
    return { message: 'Variant deleted successfully' };
  }
}
