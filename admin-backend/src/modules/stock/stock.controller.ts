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
import { AddStockDto } from './dto/add-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockService } from './stock.service';

@ApiTags('Stock')
@Controller('stock')
@ShopScoped()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'List stock items' })
  findAll(@CurrentShop('id') shopId: string, @Query() query: StockQueryDto) {
    return this.stockService.findAll(shopId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add stock payloads for a variant' })
  add(@CurrentShop('id') shopId: string, @Body() dto: AddStockDto) {
    return this.stockService.add(shopId, dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fill or edit a stock payload (not for DELIVERED items)' })
  update(
    @CurrentShop('id') shopId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
  ) {
    return this.stockService.update(shopId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete AVAILABLE stock item' })
  remove(@CurrentShop('id') shopId: string, @Param('id', ParseIntPipe) id: number) {
    return this.stockService.remove(shopId, id);
  }
}
