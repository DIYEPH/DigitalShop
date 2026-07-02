import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CurrentShop as CurrentShopType } from "../../modules/tenant/types/current-shop";

type RequestWithTenant = {
  tenant?: CurrentShopType;
};

export const CurrentShop = createParamDecorator(
  (
    data: keyof CurrentShopType | undefined,
    ctx: ExecutionContext,
  ): CurrentShopType | any => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    const tenant = request.tenant;

    return data ? tenant?.[data] : tenant;
  },
);
