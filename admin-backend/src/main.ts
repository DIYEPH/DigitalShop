import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { validateEnv } from "./config/validate-env";

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // API prefix and versioning
  app.setGlobalPrefix("api/admin/v1", {
    exclude: ["ping"], // Health check không cần prefix
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  const corsOrigin = configService.get<string[]>("cors.origin") || [
    "http://localhost:4100",
  ];
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Shop-Id"],
  });

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("DigitalShop Admin API")
    .setDescription("Admin backend API for managing DigitalShop operations")
    .setVersion("1.0")
    .addServer("/api/admin/v1", "Admin API v1")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "access-token",
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/admin/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>("port") || 3000;
  await app.listen(port);

  console.log(`🚀 Admin Backend running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/admin/docs`);
  console.log(
    `🔐 Auth Endpoint: http://localhost:${port}/api/admin/v1/auth/login`,
  );
}

bootstrap();
