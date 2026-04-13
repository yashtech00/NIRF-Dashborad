import { scrapeAndDownloadImages } from "../service/nirf_metadata.js";
import { generateExcelBuffer } from "../service/excel_exporter.js";
import { nirfQueue } from "../config/redis.js";
import { nirf } from "../../../frontend/constant/constant.js";
import prisma from "../lib/prisma.js";

/**
 * Controller: Trigger NIRF image scraping → enqueue jobs in Redis.
 * Returns immediately with job count. Worker processes jobs in background.
 */


export const nirf_data_controller = async (req, res) => {
  try {
    const { ranking_type, year } = req.body;

    if (!ranking_type || !year) {
      return res.status(400).json({
        success: false,
        message: "Please provide ranking_type and year in the request body.",
      });
    }

    const yearData = nirf.find((n) => n.year === year);
    if (!yearData) {
      return res.status(400).json({
        success: false,
        message: "Invalid year.",
      });
    }

    const isValidRanking = yearData.ranking_type.some((r) => r.value === ranking_type);
    if (!isValidRanking) {
      return res.status(400).json({
        success: false,
        message: "Invalid ranking_type for the selected year.",
      });
    }

    console.log(`📡 Received scrape request for ${year} ${ranking_type}`);

    const result = await scrapeAndDownloadImages(year, ranking_type);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error(`❌ Controller Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error during NIRF scraping.",
      error: error.message,
    });
  }
};

/**
 * Controller: Get queue status (how many jobs are waiting/active/completed/failed).
 */
export const getQueueStatus = async (req, res) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      nirfQueue.getWaitingCount(),
      nirfQueue.getActiveCount(),
      nirfQueue.getCompletedCount(),
      nirfQueue.getFailedCount(),
    ]);

    return res.status(200).json({
      success: true,
      queue: { waiting, active, completed, failed },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Controller: Clear all jobs from the Redis queue.
 */
export const clearQueue = async (req, res) => {
  try {
    // `obliterate` forcibly removes all jobs (waiting, active, completed, failed)
    await nirfQueue.obliterate({ force: true });
    return res.status(200).json({
      success: true,
      message: "Queue cleared successfully. All background jobs stopped.",
    });
  } catch (error) {
    console.error(`❌ Queue clear error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to clear queue",
      error: error.message,
    });
  }
};

/**
 * Controller: Export all saved NIRF output data as an Excel (.xlsx) file.
 * Supports optional query params: ?year=2024&ranking_type=Overall
 */
export const exportExcel = async (req, res) => {
  try {
    const { year, ranking_type } = req.query;

    // Build optional filter
    const filter = {};
    if (year) filter.year = Number(year);
    if (ranking_type) filter.rankingType = ranking_type;

    const buffer = await generateExcelBuffer(filter);

    const fileName = `NIRF_Rankings${year ? `_${year}` : ""}${ranking_type ? `_${ranking_type}` : ""}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.send(buffer);
  } catch (error) {
    console.error(`❌ Excel export error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate Excel file.",
    });
  }
};

/**
 * Controller: Return distinct (year, ranking_type) groups that have data in the DB.
 * Each entry includes institutionCount so the frontend knows how many rows exist.
 * GET /api/nirf/available-datasets
 */
export const getAvailableDatasets = async (req, res) => {
  try {
    // Group NirfCollegeData by year + ranking_type, count institutions per group
    const groups = await prisma.nirfCollegeData.groupBy({
      by: ["year", "ranking_type"],
      _count: { id: true },
      orderBy: [
        { year: "desc" },
        { ranking_type: "asc" },
      ],
    });

    const datasets = groups.map((g) => ({
      year:             g.year,
      ranking_type:     g.ranking_type,
      institutionCount: g._count.id,
    }));

    return res.status(200).json({
      success: true,
      total: datasets.length,
      datasets,
    });
  } catch (error) {
    console.error(`❌ Available datasets error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available datasets.",
      error: error.message,
    });
  }
};

/**
 * Controller: Delete a specific dataset (by year and ranking_type).
 * DELETE /api/nirf/dataset?year=2024&ranking_type=Overall
 */
export const deleteDataset = async (req, res) => {
  try {
    const { year, ranking_type } = req.query;

    if (!year || !ranking_type) {
      return res.status(400).json({
        success: false,
        message: "Missing 'year' or 'ranking_type' query params.",
      });
    }

    // Find all matching colleges to get their IDs
    const colleges = await prisma.nirfCollegeData.findMany({
      where: { year: Number(year), ranking_type },
      select: { id: true },
    });

    if (colleges.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No dataset found for ${year} ${ranking_type}`,
      });
    }

    const collegeIds = colleges.map(c => c.id);

    // Delete associated NirfInputData first (since no cascade on relation)
    const delInputs = await prisma.nirfInputData.deleteMany({
      where: { nirfCollegeDataId: { in: collegeIds } },
    });

    // Delete NirfCollegeData
    const delColleges = await prisma.nirfCollegeData.deleteMany({
      where: { id: { in: collegeIds } },
    });

    console.log(`🗑️ Deleted dataset ${year}/${ranking_type}: ${delColleges.count} colleges, ${delInputs.count} scores.`);

    return res.status(200).json({
      success: true,
      message: `Deleted ${delColleges.count} records for ${year} ${ranking_type}.`,
    });
  } catch (error) {
    console.error(`❌ Delete dataset error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to delete dataset.",
      error: error.message,
    });
  }
};