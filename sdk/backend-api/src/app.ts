import { Elysia } from "elysia";
import swagger from "@elysiajs/swagger";
import logger from "logixlysia";
import { AppRoutes } from "./app.routes";
import dotenv from "dotenv";

dotenv.config();

const app = new Elysia()
  .use(logger())
  .use(
    swagger({
      exclude: ['/swagger'],
      autoDarkMode: true,
      documentation: {
        info: {
          title: 'backend-api',
          description:
            'backend api to interact with the contracts',
          version: '1.0.0',
        },
      },
    }),
  )
  .use(AppRoutes);

app.listen({ port: process.env.PORT });

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
