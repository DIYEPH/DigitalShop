import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ListCategoriesQueryDto } from './dto/catalog-query.dto';
import { languageFromCountry } from './utils/catalog-mapper';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  listCategories(
    @Query() query: ListCategoriesQueryDto,
    @Headers('x-country') country?: string,
  ) {
    return this.catalogService.listCategories(languageFromCountry(country), query.flat ?? true);
  }

  @Get(':slug')
  getCategoryBySlug(@Param('slug') slug: string, @Headers('x-country') country?: string) {
    return this.catalogService.getCategoryBySlug(slug, languageFromCountry(country));
  }
}
