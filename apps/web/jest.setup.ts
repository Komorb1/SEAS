import "dotenv/config";
import dotenv from "dotenv";
import { prisma, pgPool } from "@/lib/prisma";

dotenv.config({ path: ".env.test" });

afterAll(async () => {
  await prisma.$disconnect();
  await pgPool.end();
});