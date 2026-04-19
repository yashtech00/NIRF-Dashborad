import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

// ── CONFIG ────────────────────────────────────────────────────────────────
const GEMINI_PRO_MODEL = "gemini-2.5-pro";
const GEMINI_FLASH_MODEL = "gemini-2.5-flash";

const GEMINI_KEY = process.env.GEMINI_API_KEY_1;

if (!GEMINI_KEY) {
  throw new Error("❌ GEMINI_API_KEY_1 not found in env");
}

// ── HELPERS ───────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const isOverloadError = (err) => {
  const msg = err?.message || "";
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("SERVICE_UNAVAILABLE")
  );
};

// ── IMAGE BUILDER ─────────────────────────────────────────────────────────
const buildImagePart = (imagePath) => {
  const imageData = fs.readFileSync(imagePath);
  return {
    inlineData: {
      mimeType: imagePath.endsWith(".png")
        ? "image/png"
        : "image/jpeg",
      data: imageData.toString("base64"),
    },
  };
};

// ── RESPONSE PARSER ───────────────────────────────────────────────────────
const parseGeminiResponse = (text, imagePath) => {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      `❌ Invalid JSON from Gemini for ${imagePath}: ${cleaned.slice(
        0,
        200
      )}`
    );
  }
};

// ── UNIFIED PROMPT ────────────────────────────────────────────────────────
// Single comprehensive prompt covering all NIRF ranking categories and formats
// If a field is not visible in the image, set its value to null
const UNIFIED_PROMPT = `
You are an expert at reading NIRF (National Institutional Ranking Framework) scorecard images.

Carefully analyze the image and extract ALL visible data. For any field NOT found in the image, use null.

⚠️ CRITICAL INSTRUCTIONS:
1. Extract ALL sub-scores accurately from the image.
2. For MISSING fields (not visible in image) → use null (not 0).
3. For each pillar (TLR, RP, GO, OI, PR):
   - If the TOTAL score is clearly visible in the image → use it.
   - If NOT clearly visible → CALCULATE it as the SUM of its non-null sub-components.
   - If ALL sub-components are null or missing → pillar score is also null.
4. Ensure all numeric values are numbers (not strings). Use null (not 0) when a field is absent.
5. Double-check calculations before returning.

📌 IMPORTANT FORMULAS (include all available fields):
- TLR.score = ss + fsr + fqe + fru + oe_mir + oe (sum only the visible/non-null fields)
- RP.score  = pu + qp + ipr + fppp + sdg (sum only the visible/non-null fields)
- GO.score  = gph + gue + ms + gphd + gpg + gss + gphe (sum only visible fields)
- OI.score  = rd + wd + escs + pcs + sctc (include sctc if visible)
- PR.score  = pr_accr + premp (include premp if visible)

Return this JSON structure (use null for any missing/unavailable values — NEVER use 0 for a field that is not present in the image):
{
  "institutionId": "string",
  "institutionName": "string",
  "city": "string",
  "state": "string",
  "over_all_rank": "string or number",
  "totalScore": number,
  "tlr": {
    "score": number,
    "ss": number,
    "fsr": number,
    "fqe": number,
    "fru": number,
    "oe_mir": number,
    "oe": number
  },
  "rp": {
    "score": number,
    "pu": number,
    "qp": number,
    "ipr": number,
    "fppp": number,
    "sdg": number
  },
  "go": {
    "score": number,
    "gph": number,
    "gue": number,
    "ms": number,
    "gphd": number,
    "gpg": number,
    "gss": number,
    "gphe": number
  },
  "oi": {
    "score": number,
    "rd": number,
    "wd": number,
    "escs": number,
    "pcs": number,
    "sctc": number,
  },
  "pr": {
    "score": number,
    "pr_accr": number,
    "premp": number,

  }
}

Return ONLY valid JSON. No explanation.
`;

// ── CORE CALL ─────────────────────────────────────────────────────────────
const callGemini = async (modelName, imagePath) => {
  console.log(`🔑 Using GEMINI_KEY | Model: ${modelName}`);

  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent([
      UNIFIED_PROMPT,
      buildImagePart(imagePath),
    ]);

    // ── Token usage logging ────────────────────────────────────────────────
    const usage = result.response.usageMetadata;
    if (usage) {
      const inputTokens  = usage.promptTokenCount      ?? "?";
      const outputTokens = usage.candidatesTokenCount  ?? "?";
      const totalTokens  = usage.totalTokenCount       ?? "?";
      console.log(
        `📊 Tokens — Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens} | Model: ${modelName}`
      );
    }
    // ──────────────────────────────────────────────────────────────────────

    return parseGeminiResponse(result.response.text(), imagePath);
  } catch (err) {
    if (isOverloadError(err)) {
      console.warn(`⚠️ Gemini Overload detected for ${modelName}`);
    } else {
      console.warn("⚠️ Non-overload error");
    }
    throw err;
  }
};

// ── MAIN FUNCTION ─────────────────────────────────────────────────────────
export const extractDataFromImage = async (imagePath) => {
  let lastError = null;

  // 🧠 PRO MODEL — 3 attempts
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`🧠 Pro attempt ${i + 1}`);
      return await callGemini(GEMINI_PRO_MODEL, imagePath);
    } catch (err) {
      lastError = err;
      if (!isOverloadError(err)) throw err;
      console.warn(`⚠️  Pro attempt ${i + 1} overloaded, retrying...`);
    }
  }

  console.log("🛑 All Pro attempts exhausted, switching to Flash...");
  await sleep(5000); // brief pause before switching model tier

  // ⚡ FLASH MODEL — 2 attempts
  for (let i = 0; i < 2; i++) {
    try {
      console.log(`⚡ Flash attempt ${i + 1}`);
      return await callGemini(GEMINI_FLASH_MODEL, imagePath);
    } catch (err) {
      lastError = err;
      if (!isOverloadError(err)) throw err;
      console.warn(`⚠️  Flash attempt ${i + 1} overloaded, retrying...`);
    }
  }

  throw new Error(
    `❌ Both AI models failed after all retries: ${lastError?.message}`
  );
};