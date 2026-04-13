"use client";

import { useState, useEffect, useRef } from "react";
import { nirfQueueStatus, nirfScrape, nirfClearQueue, nirfDeleteDataset } from "../app/api/nirf_api";
import { nirf } from "../constant/constant";



export default function ScrapePanel() {
  const [year, setYear] = useState("2024");
  const [rankingType, setRankingType] = useState("Overall");

  const YEARS = nirf.map((n) => n.year);
  const currentYearData = nirf.find((n) => n.year === year) || nirf[0];
  const RANKING_TYPES = currentYearData.ranking_type;

  useEffect(() => {
    if (RANKING_TYPES && !RANKING_TYPES.some((t) => t.value === rankingType)) {
      setRankingType(RANKING_TYPES[0].value);
    }
  }, [year, RANKING_TYPES, rankingType]);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueStats, setQueueStats] = useState({ waiting: 0, active: 0, completed: 0, failed: 0 });
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const pollerRef = useRef(null);
  const logBoxRef = useRef(null);

  const addLog = (msg, type = "") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, msg, type }]);
  };

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  const stopPoller = () => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    pollerRef.current = null;
  };

  const fetchQueueStats = async () => {
    try {
      const data = await nirfQueueStatus();
      if (data?.success) {
        setQueueStats({
          waiting: parseInt(data.queue.waiting) || 0,
          active: parseInt(data.queue.active) || 0,
          completed: parseInt(data.queue.completed) || 0,
          failed: parseInt(data.queue.failed) || 0,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQueueStats();
  }, []);

  const startPoller = () => {
    stopPoller();
    pollerRef.current = setInterval(async () => {
      try {
        const data = await nirfQueueStatus();
        if (data?.success) {
          const waiting = parseInt(data.queue.waiting) || 0;
          const active = parseInt(data.queue.active) || 0;
          const failed = parseInt(data.queue.failed) || 0;
          setQueueStats({ waiting, active, completed, failed });
          
          if (waiting === 0 && active === 0) {
            stopPoller();
            setIsProcessing(false);
            setProgress(100);
            setProgressMsg(`✅ Completed ${completed} jobs!`);
            addLog(`🏁 All jobs completed! Ready to export.`);
          } else {
            const total = waiting + active + completed + failed;
            const progressValue = total > 0 ? Math.round((completed / total) * 100) : 0;
            setProgress(progressValue);
            setProgressMsg(`Processing... ${completed} of ${total} jobs done (${failed} failed)`);
          }
        }
      } catch { /* silent */ }
    }, 5000);
  };

  const handleClearQueue = async () => {
    if (!confirm("Are you sure you want to clear all jobs from the queue? This will stop any active background scraping.")) return;
    setIsClearing(true);
    try {
      const res = await nirfClearQueue();
      addLog(`🗑️ ${res.message || "Queue cleared"}`, "warn");
      fetchQueueStats();
    } catch (err) {
      addLog(`❌ Failed to clear queue: ${err.message}`, "err");
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteDataset = async () => {
    if (!confirm(`Are you sure you want to permanently delete the dataset for ${year} - ${rankingType}? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const res = await nirfDeleteDataset(year, rankingType);
      addLog(`🗑️ ${res.message || "Dataset deleted"}`, "warn");
    } catch (err) {
      addLog(`❌ Failed to delete dataset: ${err.message}`, "err");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleScrape = async () => {
    setLoading(true);
    setIsProcessing(true);
    setProgress(20);
    setProgressMsg("Fetching institute IDs from NIRF...");
    addLog(`🚀 Starting scrape for ${year} – ${rankingType}`);

    try {
      const data = await nirfScrape(year, rankingType);
      if (!data?.success) throw new Error(data?.message || "Scrape failed");

      setProgress(30);
      setProgressMsg(`✅ ${data.data?.totalJobs ?? "?"} jobs enqueued. Processing...`);
      addLog(`✅ Enqueued ${data.data?.totalJobs ?? "?"} jobs`);
      startPoller();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Scrape failed";
      setProgress(100);
      setProgressMsg("❌ Failed");
      setIsProcessing(false);
      addLog(`❌ ${message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-base">📡</div>
          <h2 className="text-base font-semibold text-gray-900">Download &amp; Process Images</h2>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Fetches institute IDs from NIRF, downloads scorecard images, feeds each to Gemini AI, and saves scores to PostgreSQL via the Redis queue.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg text-sm text-gray-900 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Ranking Type</label>
            <select
              value={rankingType}
              onChange={(e) => setRankingType(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg text-sm text-gray-900 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {RANKING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleScrape}
            disabled={loading || isProcessing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {loading
              ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</>
              : isProcessing
              ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
              : <><span>🚀</span> Start Processing</>
            }
          </button>
        </div>

        {/* Progress bar */}
        {progressMsg && (
          <div className="mt-4">
            <p className="text-xs text-gray-600 mb-1.5">{progressMsg}</p>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Processing Status & Queue Stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-base">📊</div>
            <h2 className="text-base font-semibold text-gray-900">Queue Status</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchQueueStats}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleClearQueue}
              disabled={isClearing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              ⛔ {isClearing ? "Clearing..." : "Clear Queue"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-700 mb-1">{queueStats.waiting}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Waiting</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700 mb-1">{queueStats.active}</div>
            <div className="text-xs font-medium text-blue-500 uppercase tracking-wider">Active</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700 mb-1">{queueStats.completed}</div>
            <div className="text-xs font-medium text-green-500 uppercase tracking-wider">Completed</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-700 mb-1">{queueStats.failed}</div>
            <div className="text-xs font-medium text-red-500 uppercase tracking-wider">Failed</div>
          </div>
        </div>

        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center mt-2">
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium text-blue-900">{progressMsg}</p>
          </div>
        )}
      </div>

      {/* Log */}
      {logs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <label className="block text-xs text-gray-600 font-medium uppercase tracking-wider mb-2">Activity Log</label>
          <div ref={logBoxRef} className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-xs leading-relaxed max-h-44 overflow-y-auto">
            {logs.map((l, i) => (
              <div key={i} className={l.type === "err" ? "text-red-600" : "text-green-600"}>
                [{l.time}] {l.msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
