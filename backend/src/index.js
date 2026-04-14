import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ConnectionDb } from "./config/db.js";
import NirfDataRoute from "./routes/nirf_data_route.js";
import { startWorker } from "./workers/image_processor.worker.js";
import auth_routes from "./routes/auth_route.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "https://frontend-production-8496.up.railway.app",
    // origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
    credentials: true
}));
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.options(/.*/, cors());
// Routes
app.use("/api/nirf", NirfDataRoute);
app.use("/api/auth", auth_routes);

// Health check
app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});
// Connect to Database then start server + worker
ConnectionDb().then(() => {
    // Start BullMQ worker after DB is ready
    startWorker();

    app.listen(process.env.PORT || 8000, () => {
        console.log(`🚀 Server running on port ${process.env.PORT || 8000}`);
    });
}).catch((err) => {
    console.error("❌ Failed to connect to Database:", err.message);
    process.exit(1);
});
