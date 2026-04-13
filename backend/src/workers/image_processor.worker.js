import { Worker } from "bullmq";
import path from "path";
import {
  redisConnection,
  NIRF_QUEUE_NAME,
  defaultWorkerOptions,
} from "../config/redis.js";
import { downloadImage, deleteImage } from "../service/downloader.js";
import { extractDataFromImage } from "../service/ai_extractor.js";
import prisma from "../lib/prisma.js";


// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve a value to a number. Returns null if input is missing/null/empty, otherwise returns the number (defaulting to 0 if malformed). */
const toNullableNumber = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

/** Sleep for ms milliseconds. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Normalize AI-extracted score object into a strict numeric structure. */
const normalizeScore = (extracted = {}) => ({
  tlr: {
    score:  toNullableNumber(extracted?.tlr?.score),
    ss:     toNullableNumber(extracted?.tlr?.ss),
    fsr:    toNullableNumber(extracted?.tlr?.fsr),
    fqe:    toNullableNumber(extracted?.tlr?.fqe),
    fru:    toNullableNumber(extracted?.tlr?.fru),
    oe_mir: toNullableNumber(extracted?.tlr?.oe_mir),
  },
  rp: {
    score: toNullableNumber(extracted?.rp?.score),
    pu:    toNullableNumber(extracted?.rp?.pu),
    qp:    toNullableNumber(extracted?.rp?.qp),
    ipr:   toNullableNumber(extracted?.rp?.ipr),
    fppp:  toNullableNumber(extracted?.rp?.fppp),
    sdg:   toNullableNumber(extracted?.rp?.sdg),
  },
  go: {
    score: toNullableNumber(extracted?.go?.score),
    gue:   toNullableNumber(extracted?.go?.gue),
    gphd:  toNullableNumber(extracted?.go?.gphd),
  },
  oi: {
    score: toNullableNumber(extracted?.oi?.score),
    rd:    toNullableNumber(extracted?.oi?.rd),
    wd:    toNullableNumber(extracted?.oi?.wd),
    escs:  toNullableNumber(extracted?.oi?.escs),
    pcs:   toNullableNumber(extracted?.oi?.pcs),
  },
  pr: {
    score:   toNullableNumber(extracted?.pr?.score),
    pr_accr: toNullableNumber(extracted?.pr?.pr_accr),
  },
});


// ── Core Job Processor ────────────────────────────────────────────────────────

/**
 * Process a single NIRF image job:
 *   Download → AI Extraction → DB Upsert → Cleanup
 */
const processJob = async (job) => {
  const { id, url, year, rankingType, promptType = "PROMPT_1" } = job.data;

  console.log(`\n⚙️  [Job ${job.id}] START — ${id} [${promptType}] (attempt ${job.attemptsMade + 1})`);

  // ── Step 1: Download image ──────────────────────────────────────────────────
  const destDir = path.join(process.cwd(), "downloads", "graphs", year, rankingType);
  const fileName = `${id}.jpg`;

  const downloadResult = await downloadImage(url, destDir, fileName);
  if (!downloadResult.success) {
    throw new Error(`Download failed for ${id}: ${downloadResult.error}`);
  }

  const imagePath = downloadResult.path;
  console.log(`📥 [Job ${job.id}] Downloaded: ${imagePath}`);

  try {
    // ── Step 2: AI Extraction (Pro → Flash fallback) ────────────────────────
    console.log(`⏳ [Job ${job.id}] Waiting 20s before AI extraction...`);
    await sleep(20_000);

    let extracted;
    try {
      extracted = await extractDataFromImage(imagePath, promptType);
      console.log(`🤖 [Job ${job.id}] AI extraction done for: ${extracted?.institutionName || id} [${promptType}]`);
    } catch (aiErr) {
      // Propagate — BullMQ will retry with exponential backoff
      throw new Error(`AI extraction failed for ${id}: ${aiErr.message}`);
    }

    // ── Step 3: Fetch existing metadata from NirfCollegeData ───────────────
    let nirfDataDoc = await prisma.nirfCollegeData.findUnique({
      where: {
        institutionId_year_ranking_type: {
          institutionId: id,
          year: Number(year),
          ranking_type: rankingType,
        },
      },
    });

    // ── Step 4: Create placeholder if metadata missing ──────────────────────
    if (!nirfDataDoc) {
      console.warn(`⚠️  [Job ${job.id}] NirfCollegeData not found for ${id}. Creating placeholder.`);
      nirfDataDoc = await prisma.nirfCollegeData.create({
        data: {
          institutionId:   id,
          institutionName: extracted.institutionName || id,
          ranking_type:    rankingType,
          year:            Number(year),
          city:            extracted.city  || "Unknown",
          state:           extracted.state || "Unknown",
          score:           toNullableNumber(extracted.totalScore),
          over_all_rank:   extracted.over_all_rank || "N/A",
        },
      });
    }

    // ── Step 5: Normalize scores ────────────────────────────────────────────
    const normalizedScore = normalizeScore(extracted);

    // ── Step 6: Save / update NirfInputData ────────────────────────────────
    await prisma.nirfInputData.upsert({
      where:  { nirfCollegeDataId: nirfDataDoc.id },
      update: { score: normalizedScore },
      create: {
        institutionId:     id,
        nirfCollegeDataId: nirfDataDoc.id,
        score:             normalizedScore,
      },
    });

    console.log(`✅ [Job ${job.id}] Saved to DB: ${id}`);
    return { success: true, institutionId: id };

  } finally {
    // Always clean up downloaded image, even on failure
    await deleteImage(imagePath);
  }
};


// ── Worker Factory ────────────────────────────────────────────────────────────

/**
 * Initialise and start the BullMQ worker.
 * Call this once at server startup.
 */
export const startWorker = () => {
  const worker = new Worker(NIRF_QUEUE_NAME, processJob, {
    ...defaultWorkerOptions,
    concurrency: 3, // fast processing
  });

  // ── Completed ──────────────────────────────────────────────────────────────
  worker.on("completed", (job, result) => {
    console.log(`✅ [Worker] Job ${job.id} completed → ${result.institutionId}`);
  });

  // ── Failed ─────────────────────────────────────────────────────────────────
  worker.on("failed", async (job, err) => {
    console.error(
      `❌ [Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${defaultWorkerOptions?.attempts ?? 5}): ${err.message}`
    );

    // Pause worker on API overload and resume after OVERLOAD_PAUSE_MS
    const isOverload =
      err.message.includes("503") ||
      err.message.includes("429") ||
      err.message.includes("high demand") ||
      err.message.includes("overloaded") ||
      err.message.includes("RESOURCE_EXHAUSTED");

    if (isOverload) {
      console.warn(
        `🛑 [Worker] API overload detected — relying on job retries...`
      );
    }
  });

  // ── Stalled ────────────────────────────────────────────────────────────────
  worker.on("stalled", (jobId) => {
    console.warn(`⚠️  [Worker] Job ${jobId} stalled — will be retried.`);
  });

  console.log(
    `🚀 NIRF Image Worker started | concurrency: 100`
  );

  return worker;
};