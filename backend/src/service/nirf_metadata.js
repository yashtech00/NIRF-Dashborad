import axios from "axios";
import https from "https";
import * as cheerio from "cheerio";
import { nirfQueue } from "../config/redis.js";
import prisma from "../lib/prisma.js";
import { getPromptForRanking } from "../config/ranking.js";

const CONCURRENCY_LIMIT = 1;
const BATCH_SIZE = 20; // controls DB batch size



// ✅ Global SSL bypass (fix for all axios calls)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// ✅ Axios instance (SSL fix + anti-bot)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  headers: {
    "User-Agent": "Mozilla/5.0",
  },
  timeout: 15000,
});

/**
 * Fetch institute data from NIRF page
 */
const getInstitutesData = async (year, rankingType) => {
  const url = `https://www.nirfindia.org/Rankings/${year}/${rankingType}Ranking.html`;

  try {
    const { data } = await axiosInstance.get(url);
    const $ = cheerio.load(data);
    const institutes = [];

    $("table tbody tr").each((_, el) => {
      const tds = $(el).children("td");

      if (tds.length >= 6) {
        const id = $(tds[0]).text().trim();

        if (id.match(/IR-[-a-zA-Z0-9]+/)) {
          const nameHtml = $(tds[1]).text().trim();
          const name = nameHtml.split("More Details")[0].trim();

          const scoreStr = $(tds[4]).text().trim();
          const score = isNaN(parseFloat(scoreStr))
            ? 0
            : parseFloat(scoreStr);

          institutes.push({
            institutionId: id,
            institutionName: name,
            ranking_type: rankingType,
            year: Number(year),
            city: $(tds[2]).text().trim(),
            state: $(tds[3]).text().trim(),
            score,
            over_all_rank: $(tds[5]).text().trim(),
          });
        }
      }
    });

    // ✅ Remove duplicates
    const uniqueMap = new Map();
    institutes.forEach((inst) => {
      uniqueMap.set(inst.institutionId, inst);
    });

    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error(`❌ Failed to fetch ranking page: ${url}`);
    console.error("Error:", error.message);
    throw error;
  }
};

/**
 * Batch upsert to avoid DB timeout
 */
const upsertInstitutes = async (institutes) => {
  for (let i = 0; i < institutes.length; i += BATCH_SIZE) {
    const batch = institutes.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map((inst) =>
        prisma.nirfCollegeData.upsert({
          where: {
            institutionId_year_ranking_type: {
              institutionId: inst.institutionId,
              year: inst.year,
              ranking_type: inst.ranking_type,
            },
          },
          update: inst,
          create: inst,
        })
      )
    );

    console.log(
      `✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} processed (${batch.length} records)`
    );
  }
};

/**
 * Generate image URLs
 */
const generateImageLinks = (institutes, year, rankingType) => {
  return institutes.map((inst) => ({
    id: inst.institutionId,
    url: `https://www.nirfindia.org/nirfpdfcdn/${year}/graph/${rankingType}/${inst.institutionId}.jpg`,
  }));
};

/**
 * Fetch institute list from NIRF page, save metadata to DB, and return
 * the full institute array. Used by the synchronous batch scraper.
 */
export const getInstitutesAndSave = async (year, rankingType) => {
  const institutes = await getInstitutesData(year, rankingType);

  if (institutes.length > 0) {
    await upsertInstitutes(institutes);
    console.log(`  💾 Saved ${institutes.length} metadata records to DB`);
  }

  return institutes;
};

/**
 * Main function
 */
export const scrapeAndDownloadImages = async (year, rankingType) => {
  try {
    // 0. Check if this combo has output images to process
    const { hasOutput } = getPromptForRanking(year, rankingType);
    if (!hasOutput) {
      console.log(`⏭️  Skipping ${year}/${rankingType} — no output images available`);
      return {
        year,
        rankingType,
        skipped: true,
        totalJobs: 0,
        message: `Skipped: no output images for ${year}/${rankingType}`,
      };
    }

    console.log(`🚀 Starting NIRF Job Enqueuing for ${year} ${rankingType}`);

    // 1. Fetch data
    const institutes = await getInstitutesData(year, rankingType);
    console.log(`📄 Found ${institutes.length} institutes`);

    // 2. Save to DB (batch)
    if (institutes.length > 0) {
      await upsertInstitutes(institutes);
      console.log(`💾 Saved metadata to DB`);
    }

    // 3. Generate image links
    const imageLinks = generateImageLinks(institutes, year, rankingType);

    // 4. Create jobs (unified prompt is used internally by AI extractor)
    const jobs = imageLinks.map((item, idx) => ({
      name: `process-${item.id}`,
      data: {
        id: item.id,
        url: item.url,
        year,
        rankingType,
      },
      opts: {
        delay: idx * 15000, // 15 sec stagger between jobs
      },
    }));

    // 5. Add to queue
    await nirfQueue.addBulk(jobs);

    console.log(`📬 Enqueued ${jobs.length} jobs`);

    return {
      year,
      rankingType,
      totalJobs: jobs.length,
      message: `${jobs.length} jobs added to queue`,
    };
  } catch (error) {
    console.error(`❌ Job enqueueing failed: ${error.message}`);
    throw error;
  }
};