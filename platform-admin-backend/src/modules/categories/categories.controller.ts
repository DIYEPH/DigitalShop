import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Matches } from "class-validator";
import { Type } from "class-transformer";
import { PlatformAdminGuard } from "../auth/platform-admin.guard";
import { CategoriesService } from "./categories.service";

class CreateCategoryDto {
  @IsString()
  name_en!: string;

  @IsString()
  name_vi!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parent_id?: number;
}

class SetCategoryActiveDto {
  @IsBoolean()
  is_active!: boolean;
}

@ApiTags("Categories")
@ApiBearerAuth("access-token")
@UseGuards(PlatformAdminGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list() {
    return this.categoriesService.list();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(":id/active")
  setActive(@Param("id", ParseIntPipe) id: number, @Body() dto: SetCategoryActiveDto) {
    return this.categoriesService.setActive(id, dto.is_active);
  }
}
