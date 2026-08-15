import "dotenv/config";

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    ...(process.env.DIRECT_URL ? { directUrl: process.env.DIRECT_URL } : {}),
  },
};
