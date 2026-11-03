import "reflect-metadata";
import fastifyStatic from "@fastify/static";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AppModule } from "./app.module.js";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  {
    logger: ["log", "error", "warn"],
  },
);

app.setGlobalPrefix("api");

if (process.env.NODE_ENV === "production") {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  await app.register(fastifyStatic, {
    root: resolve(currentDirectory, "../../web/dist"),
    prefix: "/",
  });

  app
    .getHttpAdapter()
    .getInstance()
    .setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Cannot ${request.method} ${request.url}`,
        });
      }

      return reply.sendFile("index.html");
    });
}

app.enableShutdownHooks();
await app.listen(Number(process.env.API_PORT ?? 3130), "0.0.0.0");
