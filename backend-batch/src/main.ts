import "reflect-metadata";
import { resolve } from "node:path";
import { config } from "dotenv";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { CleanupService } from "./cleanup.service";

config({ path: resolve(process.cwd(), "../backend/.env") });
config({ path: resolve(process.cwd(), ".env"), override: true });

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const cleanup = app.get(CleanupService);
    const result = await cleanup.cleanupCancelledOrders({
      dryRun: hasFlag("--dry-run"),
    });

    console.log(JSON.stringify({
      job: "clean:cancelled-orders",
      ...result,
    }, null, 2));
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
