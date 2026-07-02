import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentShop as CurrentShopDecorator } from "../../common/decorators/current-shop.decorator";
import { ShopScoped } from "../../common/decorators/shop-scoped.decorator";
import { CurrentShop } from "../tenant/types/current-shop";
import {
  UpdateTelegramBotDto,
  UpsertPaymentCredentialDto,
} from "./dto/shop-settings.dto";
import { ShopSettingsService } from "./shop-settings.service";

@ApiTags("Shop Settings")
@Controller("shops/:shopId")
export class ShopSettingsController {
  constructor(private readonly shopSettingsService: ShopSettingsService) {}

  @Get("bot")
  @ShopScoped()
  @ApiOperation({ summary: "Get Telegram bot configuration metadata" })
  getTelegramBot(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
  ) {
    return this.shopSettingsService.getTelegramBot(currentShop, shopId);
  }

  @Put("bot")
  @ShopScoped()
  @ApiOperation({ summary: "Create or replace Telegram bot token" })
  updateTelegramBot(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
    @Body() dto: UpdateTelegramBotDto,
  ) {
    return this.shopSettingsService.updateTelegramBot(currentShop, shopId, dto);
  }

  @Get("payment-credentials")
  @ShopScoped()
  @ApiOperation({ summary: "List shop payment credentials metadata" })
  listPaymentCredentials(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
  ) {
    return this.shopSettingsService.listPaymentCredentials(currentShop, shopId);
  }

  @Put("payment-credentials")
  @ShopScoped()
  @ApiOperation({ summary: "Create or replace an active payment credential" })
  upsertPaymentCredential(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
    @Body() dto: UpsertPaymentCredentialDto,
  ) {
    return this.shopSettingsService.upsertPaymentCredential(currentShop, shopId, dto);
  }

  @Delete("payment-credentials/:credentialId")
  @ShopScoped()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disable a shop payment credential" })
  disablePaymentCredential(
    @CurrentShopDecorator() currentShop: CurrentShop,
    @Param("shopId") shopId: string,
    @Param("credentialId", ParseIntPipe) credentialId: number,
  ) {
    return this.shopSettingsService.disablePaymentCredential(
      currentShop,
      shopId,
      credentialId,
    );
  }
}
