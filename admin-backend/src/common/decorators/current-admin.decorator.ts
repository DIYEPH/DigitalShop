import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AdminUser } from "../../modules/auth/types/admin-user";

export type { AdminUser };

interface RequestWithAdmin {
  user?: AdminUser;
}

export const CurrentAdmin = createParamDecorator(
  (
    data: keyof AdminUser | undefined,
    ctx: ExecutionContext,
  ): AdminUser | any => {
    const request = ctx.switchToHttp().getRequest<RequestWithAdmin>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
