import { Module } from "@nestjs/common";
import { CleanupService } from "./cleanup.service";
import { DatabaseService } from "./database.service";

@Module({
  providers: [DatabaseService, CleanupService],
})
export class AppModule {}
