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
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductsService } from './products.service';

@ApiTags('Product Variants')
@Controller()
@AdminOnly()
export class ProductVariantsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('products/:productId/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product variant' })
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(productId, dto);
  }

  @Put('products/variants/:variantId')
  @ApiOperation({ summary: 'Update variant by id' })
  update(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(variantId, dto);
  }

  @Delete('products/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete variant' })
  async remove(@Param('variantId', ParseIntPipe) variantId: number) {
    await this.productsService.removeVariant(variantId);
    return { message: 'Variant deleted successfully' };
  }
}
