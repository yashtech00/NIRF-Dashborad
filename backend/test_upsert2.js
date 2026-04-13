import { PrismaClient } from "./src/models/generated/prisma/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config({ path: "src/models/.env" });
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query", "error"] });

async function main() {
  const inst = {
    institutionId: 'IR-C-C-34165',
    institutionName: 'Hindu College',
    ranking_type: 'College',
    year: 2024,
    city: 'Delhi',
    state: 'Delhi',
    score: 73.49,
    over_all_rank: '1'
  };

  try {
    await prisma.nirfCollegeData.upsert({
      where: {
        institutionId_year_ranking_type: {
          institutionId: inst.institutionId,
          year: inst.year,
          ranking_type: inst.ranking_type,
        },
      },
      update: inst,
      create: inst,
    });
    console.log("Upsert succeeded");
  } catch(e) {
    console.error("Cause:", JSON.stringify(e.meta?.driverAdapterError?.cause ?? e, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main();
