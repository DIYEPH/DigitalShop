"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const node_path_1 = require("node:path");
const dotenv_1 = require("dotenv");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const cleanup_service_1 = require("./cleanup.service");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(process.cwd(), "../backend/.env") });
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(process.cwd(), ".env"), override: true });
function hasFlag(name) {
    return process.argv.includes(name);
}
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ["error", "warn", "log"],
    });
    try {
        const cleanup = app.get(cleanup_service_1.CleanupService);
        const result = await cleanup.cleanupCancelledOrders({
            dryRun: hasFlag("--dry-run"),
        });
        console.log(JSON.stringify({
            job: "clean:cancelled-orders",
            ...result,
        }, null, 2));
    }
    finally {
        await app.close();
    }
}
bootstrap().catch((error) => {
    console.error(error);
    process.exit(1);
});
