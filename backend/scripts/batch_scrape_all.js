/**
 * batch_scrape_all.js
 * -------------------
 * Runs the full NIRF scrape pipeline for ALL years (2016-2025) and ALL
 * ranking_type combinations defined in the constant file.
 *
 * FOR EACH (year, rankingType):
 *   1. Fetch institute metadata from NIRF website (names, IDs, city, state)
 *   2. Save metadata to DB
 *   3. Process each image ONE BY ONE: Download → AI Extraction → Save to DB → Cleanup
 *   4. Any image that fails → retry up to MAX_RETRIES times before giving up
 *   5. Only after ALL images are done (succeeded or exhausted):
 *      → print "✅ 2024 Engineering fetched successfully (95/100 ok, 5 failed)"
 *      → move to NEXT category
 *
 * Usage:
 *   node scripts/batch_scrape_all.js
 *   node scripts/batch_scrape_all.js --dry-run
 *   node scripts/batch_scrape_all.js --year 2024
 *   node scripts/batch_scrape_all.js --year 2024 --type University
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../src/models/.env") });

import { getPromptForRanking } from "../src/config/ranking.js";
import { downloadImage, deleteImage } from "../src/service/downloader.js";
import { extractDataFromImage } from "../src/service/ai_extractor.js";
import { getInstitutesAndSave } from "../src/service/nirf_metadata.js";
import prisma from "../src/lib/prisma.js";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const MAX_RETRIES        = 3;      // Max AI retry attempts per image
const RETRY_DELAY_MS     = 15_000; // 15s wait between retries (AI cool-down)
const IMAGE_GAP_MS       = 3_000;  // 3s gap between each image (avoid AI throttle)
const COMBO_GAP_MS       = 5_000;  // 5s gap between year/type combos

// ── All year/type combinations (2016→2025) ────────────────────────────────────
const ALL_COMBOS = [
  { year: "2016", types: ["University", "Engineering", "Management", "Pharmacy"] },
  { year: "2017", types: ["Overall", "University", "College", "Engineering", "Management", "Pharmacy"] },
  { year: "2018", types: ["Overall", "University", "College", "Engineering", "Management", "Pharmacy", "Medical", "Law", "Architecture"] },
  { year: "2019", types: ["Overall", "University", "College", "Engineering", "Management", "Pharmacy", "Medical", "Dental", "Law", "Architecture"] },
  { year: "2020", types: ["Overall", "University", "College", "Engineering", "Management", "Pharmacy", "Medical", "Dental", "Law", "Architecture"] },
  { year: "2021", types: ["Overall", "University", "College", "Research", "Engineering", "Management", "Pharmacy", "Medical", "Dental", "Law", "Architecture"] },
  { year: "2022", types: ["Overall", "University", "College", "Research", "Engineering", "Management", "Pharmacy", "Medical", "Dental", "Law", "Architecture"] },
  { year: "2023", types: ["Overall", "University", "College", "Research", "Engineering", "Management", "Pharmacy", "Medical", "Dental", "Law", "Architecture", "Agriculture", "Innovation"] },
  { year: "2024", types: ["Overall", "University", "College", "Research", "Engineering", "Management", "Pharmacy", "Medical", "Dental", "Law", "Architecture", "Agriculture", "Innovation", "OPENUNIVERSITY", "SKILLUNIVERSITY", "STATEPUBLICUNIVERSITY"] },
  { year: "2025", types: ["Overall", "University", "College", "Research", "Engineering", "Management", "Pharmacy", "Medical", "Dental", "Law", "Architecture", "Agriculture", "Innovation", "OPENUNIVERSITY", "SKILLUNIVERSITY", "STATEPUBLICUNIVERSITY", "SDGInstitutions"] },
];

// ── CLI args ──────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const isDryRun   = args.includes("--dry-run");
const yearFilter = args.includes("--year") ? args[args.indexOf("--year") + 1] : null;
const typeFilter = args.includes("--type") ? args[args.indexOf("--type") + 1] : null;

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Resolve a value to a number. Returns null if missing/null/empty. */
const toNullableNumber = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

/** Normalise scores (same as worker) ──────────────────────────────────────── */
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

// ── Process a single image (download → AI → DB → cleanup) ────────────────────
const processImage = async ({ inst, year, rankingType, promptType }) => {
  const imageUrl = `https://www.nirfindia.org/nirfpdfcdn/${year}/graph/${rankingType}/${inst.institutionId}.jpg`;
  const destDir  = path.join(process.cwd(), "downloads", "graphs", String(year), rankingType);
  const fileName = `${inst.institutionId}.jpg`;

  // Step 1: Download
  const dl = await downloadImage(imageUrl, destDir, fileName);
  if (!dl.success) throw new Error(`Download failed: ${dl.error}`);

  try {
    // Step 2: AI Extraction
    const extracted = await extractDataFromImage(dl.path, promptType);

    // Step 3: Find or create NirfCollegeData record
    let nirfDataDoc = await prisma.nirfCollegeData.findUnique({
      where: {
        institutionId_year_ranking_type: {
          institutionId: inst.institutionId,
          year:          Number(year),
          ranking_type:  rankingType,
        },
      },
    });

    if (!nirfDataDoc) {
      nirfDataDoc = await prisma.nirfCollegeData.create({
        data: {
          institutionId:   inst.institutionId,
          institutionName: extracted.institutionName || inst.institutionName || inst.institutionId,
          ranking_type:    rankingType,
          year:            Number(year),
          city:            extracted.city  || inst.city  || "Unknown",
          state:           extracted.state || inst.state || "Unknown",
          score:           toNullableNumber(extracted.totalScore || inst.score),
          over_all_rank:   extracted.over_all_rank || inst.over_all_rank || "N/A",
        },
      });
    }

    // Step 4: Upsert AI scores
    await prisma.nirfInputData.upsert({
      where:  { nirfCollegeDataId: nirfDataDoc.id },
      update: { score: normalizeScore(extracted) },
      create: {
        institutionId:     inst.institutionId,
        nirfCollegeDataId: nirfDataDoc.id,
        score:             normalizeScore(extracted),
      },
    });

    return { success: true };
  } finally {
    // Always cleanup downloaded image
    await deleteImage(dl.path);
  }
};

// ── Process one image with retry logic ───────────────────────────────────────
const processWithRetry = async ({ inst, year, rankingType, promptType, imageIndex, total }) => {
  const label = `[${imageIndex + 1}/${total}] ${inst.institutionId}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await processImage({ inst, year, rankingType, promptType });
      console.log(`    ✅ ${label}`);
      return { success: true, id: inst.institutionId };
    } catch (err) {
      const isOverload =
        err.message?.includes("503") ||
        err.message?.includes("429") ||
        err.message?.includes("overloaded") ||
        err.message?.includes("high demand") ||
        err.message?.includes("RESOURCE_EXHAUSTED") ||
        err.message?.includes("SERVICE_UNAVAILABLE");

      if (attempt < MAX_RETRIES) {
        const waitMs = isOverload ? RETRY_DELAY_MS * attempt : RETRY_DELAY_MS;
        console.warn(`    ⚠️  ${label} — attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${waitMs / 1000}s...`);
        console.warn(`       Reason: ${err.message?.slice(0, 120)}`);
        await sleep(waitMs);
      } else {
        console.error(`    ❌ ${label} — all ${MAX_RETRIES} attempts failed: ${err.message?.slice(0, 120)}`);
        return { success: false, id: inst.institutionId, error: err.message };
      }
    }
  }
};

// ── Process ONE (year, rankingType) category fully ───────────────────────────
const processCategory = async (year, rankingType, promptType) => {
  console.log(`\n${"─".repeat(65)}`);
  console.log(`▶  ${year} / ${rankingType}  [${promptType}]`);
  console.log(`${"─".repeat(65)}`);

  // Step 1: Fetch institute list + save metadata to DB
  console.log(`  📡 Fetching institute list from NIRF...`);
  const institutes = await getInstitutesAndSave(year, rankingType);

  if (!institutes || institutes.length === 0) {
    console.log(`  ⚠️  No institutes found — skipping`);
    return { total: 0, succeeded: 0, failed: [] };
  }

  console.log(`  📄 Found ${institutes.length} institutes. Processing images...\n`);

  const failed = [];

  // Step 2: Process each image one-by-one
  for (let i = 0; i < institutes.length; i++) {
    const result = await processWithRetry({
      inst:        institutes[i],
      year,
      rankingType,
      promptType,
      imageIndex:  i,
      total:       institutes.length,
    });

    if (!result.success) {
      failed.push(result.id);
    }

    // Small gap between images to avoid AI rate limiting
    if (i < institutes.length - 1) {
      await sleep(IMAGE_GAP_MS);
    }
  }

  const succeeded = institutes.length - failed.length;
  return { total: institutes.length, succeeded, failed };
};

// ── Summary tracking ──────────────────────────────────────────────────────────
const batchSummary = {
  done:    [],  // { label, total, succeeded, failedCount }
  skipped: [],
  errored: [],  // combos that crashed entirely (network, DB etc)
};

// ── Main batch runner ─────────────────────────────────────────────────────────
async function run() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║       NIRF BATCH SCRAPER — 2016 to 2025             ║");
  console.log("║   Synchronous: one category at a time, with retry   ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  if (isDryRun) console.log("🔍 DRY RUN mode — no actual scraping will happen\n");

  // Build filtered combo list
  const combos = [];
  for (const { year, types } of ALL_COMBOS) {
    if (yearFilter && year !== yearFilter) continue;
    for (const rankingType of types) {
      if (typeFilter && rankingType !== typeFilter) continue;
      combos.push({ year, rankingType });
    }
  }

  console.log(`📋 Total combos to evaluate: ${combos.length}\n`);

  for (const { year, rankingType } of combos) {
    const config = getPromptForRanking(year, rankingType);

    if (!config.hasOutput) {
      console.log(`⏭  SKIP  ${year} / ${rankingType}  (no output images)`);
      batchSummary.skipped.push(`${year}/${rankingType}`);
      continue;
    }

    const promptType = config.prompt;

    if (isDryRun) {
      console.log(`🔍 WOULD RUN: ${year} / ${rankingType} [${promptType}]`);
      batchSummary.done.push({ label: `${year}/${rankingType}`, total: "?", succeeded: "?", failedCount: 0 });
      continue;
    }

    try {
      const { total, succeeded, failed } = await processCategory(year, rankingType, promptType);

      const label = `${year}/${rankingType}`;
      const allOk = failed.length === 0;

      if (allOk) {
        console.log(`\n✅ DONE  ${label} — all ${total} images fetched successfully\n`);
      } else {
        console.log(`\n⚠️  DONE  ${label} — ${succeeded}/${total} ok | ${failed.length} failed permanently`);
        if (failed.length > 0) {
          console.log(`   Failed IDs: ${failed.slice(0, 10).join(", ")}${failed.length > 10 ? "..." : ""}\n`);
        }
      }

      batchSummary.done.push({ label, total, succeeded, failedCount: failed.length });
    } catch (err) {
      console.error(`\n❌ CRASHED  ${year}/${rankingType}: ${err.message}\n`);
      batchSummary.errored.push(`${year}/${rankingType}: ${err.message}`);
    }

    // Brief pause before next category
    await sleep(COMBO_GAP_MS);
  }

  // ── Final Summary ─────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║                  BATCH COMPLETE                     ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  console.log(`✅ Processed : ${batchSummary.done.length}`);
  console.log(`⏭  Skipped   : ${batchSummary.skipped.length}`);
  console.log(`💥 Crashed   : ${batchSummary.errored.length}\n`);

  if (batchSummary.done.length > 0) {
    console.log("Category Results:");
    console.log(`${"CATEGORY".padEnd(34)} ${"TOTAL".padEnd(8)} ${"OK".padEnd(8)} FAILED`);
    console.log("─".repeat(60));
    for (const { label, total, succeeded, failedCount } of batchSummary.done) {
      const status = failedCount === 0 ? "✅" : "⚠️ ";
      console.log(`${status} ${label.padEnd(32)} ${String(total).padEnd(8)} ${String(succeeded).padEnd(8)} ${failedCount}`);
    }
  }

  if (batchSummary.errored.length > 0) {
    console.log("\nCrashed combos:");
    batchSummary.errored.forEach((e) => console.log(`  💥 ${e}`));
  }

  console.log("");
  process.exit(batchSummary.errored.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("❌ Fatal batch error:", err);
  process.exit(1);
});
