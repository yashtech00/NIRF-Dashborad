import "dotenv/config";
import { PrismaClient } from "@prisma/client";

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Defined" : "Undefined");

try {
  const prisma = new PrismaClient({});
  console.log("Prisma Client created successfully");
  await prisma.$connect();
  console.log("Prisma Client connected successfully");
  await prisma.$disconnect();
} catch (e) {
  console.error("Prisma Error:", e);
}
