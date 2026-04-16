import ExcelJS from "exceljs";
import prisma from "../lib/prisma.js";

/**
 * Column definitions matching the required Excel structure.
 * key: path into the DB doc (dot-notation), header: Excel column header.
 */
const CORE_COLUMNS = [
  { header: "institutionID", key: "institutionId" },
  { header: "institution name", key: "institutionName" },
  { header: "city", key: "city" },
  { header: "state", key: "state" },
  { header: "rank", key: "over_all_rank" },
  { header: "score", key: "totalScore" },
];

const SCORE_COLUMNS = [
  { header: "TLR Score", key: "score.tlr.score" },
  { header: "RP Score", key: "score.rp.score" },
  { header: "GO Score", key: "score.go.score" },
  { header: "OI Score", key: "score.oi.score" },
  { header: "PR Score", key: "score.pr.score" },
  { header: "SS Score", key: "score.tlr.ss" },
  { header: "FSR Score", key: "score.tlr.fsr" },
  { header: "FQE Score", key: "score.tlr.fqe" },
  { header: "FRU Score", key: "score.tlr.fru" },
  { header: "OE+ MIR Score", key: "score.tlr.oe_mir" },
  { header: "OE Score", key: "score.tlr.oe" },
  { header: "PU Score", key: "score.rp.pu" },
  { header: "QP Score", key: "score.rp.qp" },
  { header: "IPR Score", key: "score.rp.ipr" },
  { header: "FPPP Score", key: "score.rp.fppp" },
  { header: "SDG Score", key: "score.rp.sdg" },
  { header: "GUE Score", key: "score.go.gue" },
  { header: "GPHD Score", key: "score.go.gphd" },
  { header: "GPH Score", key: "score.go.gph" },
  { header: "GPG Score", key: "score.go.gpg" },
  { header: "GSS Score", key: "score.go.gss" },
  { header: "GPHE Score", key: "score.go.gphe" },
  { header: "MS Score", key: "score.go.ms" },
  { header: "RD Score", key: "score.oi.rd" },
  { header: "WD Score", key: "score.oi.wd" },
  { header: "ESCS Score", key: "score.oi.escs" },
  { header: "PCS Score", key: "score.oi.pcs" },
  { header: "SCTC Score", key: "score.oi.sctc" },
  { header: "PR Score", key: "score.pr.pr_accr" },
  { header: "PREMP Score", key: "score.pr.premp" },
  { header: "QNR Score", key: "score.qnr.score" },
  { header: "QNR PU", key: "score.qnr.pu" },
  { header: "QNR CI", key: "score.qnr.ci" },
  { header: "QNR FPPP", key: "score.qnr.fppp" },
  { header: "QLR Score", key: "score.qlr.score" },
  { header: "QLR JCR", key: "score.qlr.jcr" },
  { header: "QLR Top25", key: "score.qlr.top25" },
  { header: "QLR IPR", key: "score.qlr.ipr" },
  { header: "QLR H_INDEX", key: "score.qlr.h_index" },
  { header: "SFC FQE", key: "score.sfc.fqe" },
  { header: "SFC SS", key: "score.sfc.ss" },
  { header: "SFC GPHD", key: "score.sfc.gphd" },
];

/**
 * Resolve a dot-notation path from an object.
 * e.g. getNestedValue(doc, "score.tlr.ss") → doc.score.tlr.ss
 */
const getNestedValue = (obj, path) => {
  return path.split(".").reduce((acc, part) => (acc != null ? acc[part] : null), obj);
};

/**
 * Generate an Excel workbook buffer from all NirfInputData records via Prisma.
 * @param {Object} filter - Optional filter (e.g. { year, rankingType })
 * @returns {Promise<Buffer>}
 */
export const generateExcelBuffer = async (filter = {}) => {
  // Map incoming filter to Prisma query
  const prismaFilter = {};
  if (filter.year || filter.rankingType) {
    prismaFilter.nirfCollegeData = {};
    if (filter.year) prismaFilter.nirfCollegeData.year = filter.year;
    if (filter.rankingType) prismaFilter.nirfCollegeData.ranking_type = filter.rankingType;
  }

  const records = await prisma.nirfInputData.findMany({
    where: prismaFilter,
    include: {
      nirfCollegeData: true,
    },
  });

  if (records.length === 0) {
    throw new Error("No NIRF input records found in the database.");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NIRF Dashboard";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("NIRF Rankings", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // Combine data from InputData and CollegeData
  const formattedRecords = records.map((inputDoc) => ({
    ...inputDoc,
    institutionName: inputDoc.nirfCollegeData.institutionName,
    city: inputDoc.nirfCollegeData.city,
    state: inputDoc.nirfCollegeData.state,
    totalScore: inputDoc.nirfCollegeData.score,
    over_all_rank: inputDoc.nirfCollegeData.over_all_rank,
  }));

  // Dynamically filter SCORE_COLUMNS to only include ones that have meaningful data
  const validScoreColumns = SCORE_COLUMNS.filter((col) => {
    // Keep column if AT LEAST ONE record has a value that is NOT null, NOT 0, and NOT empty
    return formattedRecords.some((doc) => {
      const val = getNestedValue(doc, col.key);
      return val != null && val !== 0 && val !== "0" && val !== "";
    });
  });

  const finalColumns = [...CORE_COLUMNS, ...validScoreColumns];

  // Define columns in Excel
  sheet.columns = finalColumns.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.max(col.header.length + 4, 18),
  }));

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },  // dark KPMG blue
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFAAAAAA" } },
    };
  });
  headerRow.height = 30;

  // Add data rows
  formattedRecords.forEach((doc, idx) => {
    const rowData = {};
    finalColumns.forEach((col) => {
      rowData[col.key] = getNestedValue(doc, col.key);
    });

    const row = sheet.addRow(rowData);

    // Alternate row shading
    if (idx % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF2F7FD" },
        };
      });
    }

    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } },
      };
    });
  });

  // Return as buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};
