import {
  Body,
  Controller,
  Get,
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
import { UpdateVolumeTiersDto } from './dto/volume-tier.dto';
import { ProductsService } from './products.service';

@ApiTags('Volume Tiers')
@Controller('products/variants/:variantId/volume-tiers')
@ShopScoped()
export class VolumeTiersController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List volume tiers for variant' })
  findAll(
    @CurrentShop('id') shopId: string,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    return this.productsService.getVolumeTiers(shopId, variantId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace volume tiers for variant' })
  replace(
    @CurrentShop('id') shopId: string,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVolumeTiersDto,
  ) {
    return this.productsService.replaceVolumeTiers(shopId, variantId, dto);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate volume tier configuration' })
  validate(@Body() dto: UpdateVolumeTiersDto) {
    return this.productsService.validateVolumeTiersPayload(dto.tiers);
  }
}
