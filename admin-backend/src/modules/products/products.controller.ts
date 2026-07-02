import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentShop } from '../../common/decorators/current-shop.decorator';
import { ShopScoped } from '../../common/decorators/shop-scoped.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
@ShopScoped()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (paginated)' })
  findAll(@CurrentShop('id') shopId: string, @Query() query: ProductQueryDto) {
    return this.productsService.findAll(shopId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product with plans and variants' })
  findOne(@CurrentShop('id') shopId: string, @Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(shopId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product' })
  create(@CurrentShop('id') shopId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(shopId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  update(
    @CurrentShop('id') shopId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(shopId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product' })
  async remove(@CurrentShop('id') shopId: string, @Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(shopId, id);
    return { message: 'Product deleted successfully' };
  }
}
