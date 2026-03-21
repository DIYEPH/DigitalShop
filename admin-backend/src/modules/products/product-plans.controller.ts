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
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ProductsService } from './products.service';

@ApiTags('Product Plans')
@Controller('products/:productId/plans')
@AdminOnly()
export class ProductPlansController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product plan' })
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreatePlanDto,
  ) {
    return this.productsService.createPlan(productId, dto);
  }

  @Put(':planId')
  @ApiOperation({ summary: 'Update product plan' })
  update(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.productsService.updatePlan(productId, planId, dto);
  }

  @Delete(':planId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product plan' })
  async remove(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    await this.productsService.removePlan(productId, planId);
    return { message: 'Plan deleted successfully' };
  }
}
