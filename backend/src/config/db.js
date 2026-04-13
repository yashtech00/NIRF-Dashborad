import prisma from "../lib/prisma.js";


export const ConnectionDb = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL via Prisma");
  } catch (e) {
    console.error("❌ Failed to connect to PostgreSQL:", e.message);
    process.exit(1);
  }
};