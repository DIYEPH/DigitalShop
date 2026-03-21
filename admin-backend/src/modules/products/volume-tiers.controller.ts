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
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { UpdateVolumeTiersDto } from './dto/volume-tier.dto';
import { ProductsService } from './products.service';

@ApiTags('Volume Tiers')
@Controller('products/variants/:variantId/volume-tiers')
@AdminOnly()
export class VolumeTiersController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List volume tiers for variant' })
  findAll(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.productsService.getVolumeTiers(variantId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace volume tiers for variant' })
  replace(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVolumeTiersDto,
  ) {
    return this.productsService.replaceVolumeTiers(variantId, dto);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate volume tier configuration' })
  validate(@Body() dto: UpdateVolumeTiersDto) {
    return this.productsService.validateVolumeTiersPayload(dto.tiers);
  }
}
