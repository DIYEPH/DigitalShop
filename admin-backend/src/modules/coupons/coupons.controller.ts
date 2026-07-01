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
import { CurrentShop } from "../../common/decorators/current-shop.decorator";
import { ShopScoped } from "../../common/decorators/shop-scoped.decorator";
import { CouponQueryDto } from "./dto/coupon-query.dto";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { GrantCouponDto } from "./dto/grant-coupon.dto";
import { UpdateCouponDto } from "./dto/update-coupon.dto";
import { CouponsService } from "./coupons.service";

@ApiTags("Coupons")
@Controller("coupons")
@ShopScoped()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: "List coupons (admin)" })
  findAll(@CurrentShop("id") shopId: string, @Query() query: CouponQueryDto) {
    return this.couponsService.findAll(shopId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create coupon" })
  create(@CurrentShop("id") shopId: string, @Body() dto: CreateCouponDto) {
    return this.couponsService.create(shopId, dto);
  }

  @Post("grant")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Grant ownership coupon to users" })
  grant(@CurrentShop("id") shopId: string, @Body() dto: GrantCouponDto) {
    return this.couponsService.grant(shopId, dto);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update coupon" })
  update(
    @CurrentShop("id") shopId: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(shopId, id, dto);
  }
}
