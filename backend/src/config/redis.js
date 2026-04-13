import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// ── ENV CONFIG ──
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// ── Guard: fail early if config missing ──
if (!REDIS_HOST) {
  console.error(`
❌ REDIS_HOST is not configured!

   Example:
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=
  `);
  process.exit(1);
}

/**
 * Valkey / Redis connection for BullMQ
 */
export const redisConnection = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,

  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: false,

  retryStrategy: (times) => {
    if (times > 5) {
      console.error("❌ Could not connect to Redis after 5 retries.");
      return null;
    }
    return Math.min(times * 500, 3000);
  },
});

// ── Events ──
redisConnection.on("connect", () =>
  console.log("✅ Valkey (Redis) connected")
);

redisConnection.on("ready", () =>
  console.log("⚡ Valkey ready")
);

redisConnection.on("error", (err) =>
  console.error("❌ Redis error:", err.message)
);

redisConnection.on("close", () =>
  console.warn("⚠️ Redis connection closed")
);

// ───────────────────────────────────────────

export const NIRF_QUEUE_NAME = "nirf-image-processing";

/**
 * Queue Config
 */
export const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 10000, // 10s → 20s → 40s → 80s → 160s
  },
  removeOnComplete: 50,
  removeOnFail: 100,
};

/**
 * Queue Instance
 */
export const nirfQueue = new Queue(NIRF_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions,
});

/**
 * Queue Events
 */
export const nirfQueueEvents = new QueueEvents(NIRF_QUEUE_NAME, {
  connection: redisConnection,
});

nirfQueueEvents.on("completed", ({ jobId }) => {
  console.log(`🎯 [Queue Global] Job ${jobId} completed successfully.`);
});

nirfQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`💥 [Queue Global] Job ${jobId} failed:`, failedReason);
});

/**
 * Worker Config
 */
export const defaultWorkerOptions = {
  connection: redisConnection,
  concurrency: 2,
  limiter: {
    max: 2,
    duration: 30000,
  },
};