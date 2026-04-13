"use client";

import { useState, useEffect, useCallback } from "react";
import { nirfExportExcel, nirfGetAvailableDatasets, nirfDeleteDataset } from "../app/api/nirf_api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const downloadBlob = async (year: string, rankingType: string) => {
  const blob = await nirfExportExcel(year, rankingType);
  const fileName = `NIRF_${rankingType}_${year}.xlsx`;
  const url = URL.createObjectURL(new Blob([blob]));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return fileName;
};

// Color badges per ranking type
const TYPE_COLORS: Record<string, string> = {
  Overall:               "bg-indigo-100 text-indigo-700",
  University:            "bg-blue-100 text-blue-700",
  Engineering:           "bg-orange-100 text-orange-700",
  Pharmacy:              "bg-green-100 text-green-700",
  Research:              "bg-purple-100 text-purple-700",
  Management:            "bg-yellow-100 text-yellow-700",
  Medical:               "bg-red-100 text-red-700",
  Dental:                "bg-pink-100 text-pink-700",
  Architecture:          "bg-teal-100 text-teal-700",
  College:               "bg-cyan-100 text-cyan-700",
  Law:                   "bg-slate-100 text-slate-700",
  Agriculture:           "bg-lime-100 text-lime-700",
  Innovation:            "bg-violet-100 text-violet-700",
  OPENUNIVERSITY:        "bg-sky-100 text-sky-700",
  SKILLUNIVERSITY:       "bg-emerald-100 text-emerald-700",
  STATEPUBLICUNIVERSITY: "bg-amber-100 text-amber-700",
  SDGInstitutions:       "bg-fuchsia-100 text-fuchsia-700",
};

const badgeClass = (type: string) =>
  TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Dataset {
  year: number;
  ranking_type: string;
  institutionCount: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExportPanel() {
  const [datasets, setDatasets]         = useState<Dataset[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [downloading, setDownloading]   = useState<string | null>(null); // "year-type"
  const [deleting, setDeleting]         = useState<string | null>(null); // "year-type"
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch]             = useState("");
  const [filterYear, setFilterYear]     = useState("all");
  const [downloadingAll, setDownloadingAll] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch available datasets on mount ──────────────────────────────────────
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await nirfGetAvailableDatasets();
      setDatasets(res?.datasets ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  // ── Individual download ────────────────────────────────────────────────────
  const handleDownload = async (year: number, ranking_type: string) => {
    const key = `${year}-${ranking_type}`;
    setDownloading(key);
    try {
      const name = await downloadBlob(String(year), ranking_type);
      showToast(`✅ Downloaded ${name}`, true);
    } catch (e: any) {
      showToast(`❌ ${e?.response?.data?.message || e?.message || "Export failed"}`, false);
    } finally {
      setDownloading(null);
    }
  };

  // ── Individual delete ──────────────────────────────────────────────────────
  const handleDelete = async (year: number, ranking_type: string) => {
    if (!confirm(`Are you sure you want to permanently delete the dataset for ${year} - ${ranking_type}? This cannot be undone.`)) return;
    
    const key = `${year}-${ranking_type}`;
    setDeleting(key);
    try {
      const res = await nirfDeleteDataset(String(year), ranking_type);
      showToast(`🗑️ ${res.message || "Dataset deleted"}`, true);
      fetchDatasets(); // Refresh list automatically
    } catch (e: any) {
      showToast(`❌ ${e?.response?.data?.message || e?.message || "Delete failed"}`, false);
    } finally {
      setDeleting(null);
    }
  };

  // ── Download all visible ───────────────────────────────────────────────────
  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    for (const ds of filtered) {
      try {
        await downloadBlob(String(ds.year), ds.ranking_type);
        await new Promise(r => setTimeout(r, 600)); // small gap between downloads
      } catch {}
    }
    setDownloadingAll(false);
    showToast(`✅ Downloaded ${filtered.length} files`, true);
  };

  // ── Filter / search ───────────────────────────────────────────────────────
  const years = [...new Set(datasets.map(d => String(d.year)))].sort((a, b) => +b - +a);

  const filtered = datasets.filter(d => {
    const matchYear = filterYear === "all" || String(d.year) === filterYear;
    const matchSearch = d.ranking_type.toLowerCase().includes(search.toLowerCase());
    return matchYear && matchSearch;
  });

  // ── Group by year for display ──────────────────────────────────────────────
  const grouped = filtered.reduce<Record<string, Dataset[]>>((acc, d) => {
    const k = String(d.year);
    if (!acc[k]) acc[k] = [];
    acc[k].push(d);
    return acc;
  }, {});
  const sortedYears = Object.keys(grouped).sort((a, b) => +b - +a);

  const totalInstitutions = filtered.reduce((s, d) => s + d.institutionCount, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📊</span>
              <h2 className="text-lg font-bold text-gray-900">Available Datasets</h2>
            </div>
            <p className="text-sm text-gray-500">
              All processed NIRF ranking data ready for Excel download.
            </p>
          </div>
          <button
            onClick={fetchDatasets}
            disabled={loading}
            title="Refresh list"
            className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 transition-all"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Stats strip */}
        {!loading && !error && (
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full">
              <span>📁</span> {filtered.length} datasets
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
              <span>🏛</span> {totalInstitutions.toLocaleString()} institutions
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
              <span>📅</span> {years.length} years
            </div>
          </div>
        )}
      </div>

      {/* ── Filters + Download All ─────────────────────────────────────────── */}
      <div className="px-6 py-4 bg-gray-50/60 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search ranking type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] bg-white border border-gray-300 rounded-lg text-sm px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 shadow-sm"
        />
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg text-sm px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 shadow-sm cursor-pointer"
        >
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {filtered.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-sm font-semibold text-white transition-all shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:scale-95"
          >
            {downloadingAll
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Downloading…</>
              : <><span>⬇️</span> Download All ({filtered.length})</>}
          </button>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-h-[520px] overflow-y-auto">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <span className="inline-block w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading datasets…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="m-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            ❌ {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            <span className="text-4xl block mb-3">🗂</span>
            No datasets found.{datasets.length > 0 ? " Try clearing the search filter." : " Run the batch scraper to generate data."}
          </div>
        )}

        {/* Dataset list grouped by year */}
        {!loading && !error && sortedYears.map(year => (
          <div key={year}>
            {/* Year header */}
            <div className="sticky top-0 z-10 px-6 py-2 bg-gray-100/90 backdrop-blur-sm border-y border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{year}</span>
              <span className="ml-2 text-xs text-gray-400">({grouped[year].length} categories)</span>
            </div>

            {/* Category rows */}
            {grouped[year].map(ds => {
              const key = `${ds.year}-${ds.ranking_type}`;
              const isDownloading = downloading === key;
              const isDeleting = deleting === key;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 hover:bg-indigo-50/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badgeClass(ds.ranking_type)}`}>
                      {ds.ranking_type}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {ds.institutionCount} institutions
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(ds.year, ds.ranking_type)}
                      disabled={isDownloading || downloadingAll || isDeleting}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-600 border border-green-200 hover:border-green-600 text-green-700 hover:text-white disabled:opacity-50 text-xs font-semibold transition-all group-hover:shadow-sm"
                    >
                      {isDownloading
                        ? <><span className="inline-block w-3 h-3 border-2 border-green-400/40 border-t-green-600 rounded-full animate-spin" /> Preparing…</>
                        : <><span>⬇</span> Download Excel</>}
                    </button>
                    <button
                      onClick={() => handleDelete(ds.year, ds.ranking_type)}
                      disabled={isDownloading || downloadingAll || isDeleting}
                      title="Delete Dataset"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-white hover:bg-red-50 border border-transparent hover:border-red-200 text-gray-400 hover:text-red-600 disabled:opacity-50 text-xs transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      {isDeleting
                        ? <span className="inline-block w-3 h-3 border-2 border-red-400/40 border-t-red-600 rounded-full animate-spin" />
                        : <span>🗑️</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border transition-all ${
          toast.ok
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
