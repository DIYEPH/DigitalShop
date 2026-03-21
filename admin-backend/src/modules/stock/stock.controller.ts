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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { AddStockDto } from './dto/add-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { StockService } from './stock.service';

@ApiTags('Stock')
@Controller('stock')
@AdminOnly()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'List stock items' })
  findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add stock payloads for a variant' })
  add(@Body() dto: AddStockDto) {
    return this.stockService.add(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete AVAILABLE stock item' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.remove(id);
  }
}
