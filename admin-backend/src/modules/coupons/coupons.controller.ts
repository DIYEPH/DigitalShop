import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly } from "../../common/decorators/admin-only.decorator";
import { CouponQueryDto } from "./dto/coupon-query.dto";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { GrantCouponDto } from "./dto/grant-coupon.dto";
import { UpdateCouponDto } from "./dto/update-coupon.dto";
import { CouponsService } from "./coupons.service";

@ApiTags("Coupons")
@Controller("coupons")
@AdminOnly()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: "List coupons (admin)" })
  findAll(@Query() query: CouponQueryDto) {
    return this.couponsService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create coupon" })
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Post("grant")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Grant ownership coupon to users" })
  grant(@Body() dto: GrantCouponDto) {
    return this.couponsService.grant(dto);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update coupon" })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }
}
