import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ListProductsQueryDto } from './dto/catalog-query.dto';
import { languageFromCountry } from './utils/catalog-mapper';

@Controller('products')
export class ProductsController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  listProducts(@Query() query: ListProductsQueryDto, @Headers('x-country') country?: string) {
    return this.catalogService.listProducts(query, languageFromCountry(country));
  }

  @Get('slug/:slug')
  getProductBySlug(@Param('slug') slug: string, @Headers('x-country') country?: string) {
    return this.catalogService.getProductBySlug(slug, languageFromCountry(country));
  }
}
