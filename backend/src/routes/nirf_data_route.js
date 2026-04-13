import express from "express";
import {
  nirf_data_controller,
  exportExcel,
  getQueueStatus,
  getAvailableDatasets,
  clearQueue,
  deleteDataset,
} from "../controller/nirf_data_controller.js";

const router = express.Router();

// POST /scrape — trigger image scraping + Redis job enqueue
router.post("/scrape", nirf_data_controller);

// GET /queue-status — check Redis queue stats
router.get("/queue-status", getQueueStatus);

// GET /export-excel — download all NIRF data as .xlsx
// Optional query params: ?year=2024&ranking_type=Overall
router.get("/export-excel", exportExcel);

// GET /available-datasets — list all (year, ranking_type) groups with record counts
router.get("/available-datasets", getAvailableDatasets);

// POST /clear-queue — Stop and clear all jobs
router.post("/clear-queue", clearQueue);

// DELETE /dataset?year=2024&ranking_type=Overall — Delete specific dataset
router.delete("/dataset", deleteDataset);

export default router;