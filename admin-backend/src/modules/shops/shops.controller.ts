import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly } from "../../common/decorators/admin-only.decorator";
import { CurrentAdmin } from "../../common/decorators/current-admin.decorator";
import { CurrentShop as CurrentShopDecorator } from "../../common/decorators/current-shop.decorator";
import { ShopScoped } from "../../common/decorators/shop-scoped.decorator";
import { AdminUser } from "../auth/types/admin-user";
import { CurrentShop } from "../tenant/types/current-shop";
import {
  AddShopMemberDto,
  CreateShopDto,
  SelectShopCategoriesDto,
  UpdateShopDto,
} from "./dto/create-shop.dto";
import { ShopsService } from "./shops.service";

@ApiTags("Shops")
@Controller("shops")
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: "List shops for current seller" })
  list(@CurrentAdmin() user: AdminUser) {
    return this.shopsService.listForUser(user.id);
  }

  @Post()
  @AdminOnly()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create shop for a permitted seller" })
  create(@CurrentAdmin() user: AdminUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user, dto);
  }

  @Patch(":shopId")
  @ShopScoped()
  @ApiOperation({ summary: "Update current shop profile" })
  update(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.update(currentShop, shopId, dto);
  }

  @Get(":shopId/members")
  @ShopScoped()
  @ApiOperation({ summary: "List shop members" })
  listMembers(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
  ) {
    return this.shopsService.listMembers(currentShop, shopId);
  }

  @Post(":shopId/members")
  @ShopScoped()
  @ApiOperation({ summary: "Add or update shop member" })
  addMember(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
    @Body() dto: AddShopMemberDto,
  ) {
    return this.shopsService.addMember(currentShop, shopId, dto);
  }

  @Delete(":shopId/members/:userId")
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove non-owner shop member" })
  removeMember(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
    @Param("userId", ParseIntPipe) userId: number,
  ) {
    return this.shopsService.removeMember(currentShop, shopId, userId);
  }

  @Get(":shopId/categories")
  @ShopScoped()
  @ApiOperation({ summary: "List selectable shared categories" })
  listCategories(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
  ) {
    return this.shopsService.listCategories(currentShop, shopId);
  }

  @Post(":shopId/categories")
  @ShopScoped()
  @ApiOperation({ summary: "Replace selected categories for a shop" })
  selectCategories(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
    @Body() dto: SelectShopCategoriesDto,
  ) {
    return this.shopsService.selectCategories(currentShop, shopId, dto);
  }
}
