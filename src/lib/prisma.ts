import { PrismaClient, Prisma } from "@prisma/client";
import logger from "./logger";

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL_POOL || process.env.DATABASE_URL,
      },
    },
  });

  client.$on('query' as never, (e: Prisma.QueryEvent) => {
    if (e.duration >= 300) {
      logger.warn({
        query: e.query,
        params: e.params,
        duration: e.duration,
      }, "Slow DB Query Detected");
    }
  });

  return client;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
