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

// ── PROMPTS ───────────────────────────────────────────────────────────────

/** PROMPT_1: Standard 5-pillar scorecard (Overall, University, Engineering, Pharmacy, Research — 2024/2025) */
const PROMPT_1 = `
You are an expert at reading NIRF (National Institutional Ranking Framework) scorecard images.

Carefully analyze the image and extract ALL visible data.

⚠️ CRITICAL INSTRUCTIONS:
1. Extract ALL sub-scores (ss, fsr, fqe, fru, etc.) accurately.
2. For each pillar (TLR, RP, GO, OI, PR):
   - If the TOTAL score is clearly visible in the image → use it.
   - If NOT clearly visible → CALCULATE it as the SUM of its sub-components.
3. NEVER leave pillar "score" as null if sub-scores are available.
4. Ensure all numeric values are numbers (not strings).
5. Double-check calculations before returning.

📌 FORMULAS (IMPORTANT):
- TLR.score = ss + fsr + fqe + fru + oe_mir 
- RP.score  = pu + qp + ipr + fppp
- GO.score  = gue + gphd
- OI.score  = rd + wd + escs + pcs
- PR.score  = pr_accr (usually same or directly visible)
{
  "institutionId": "string",
  "institutionName": "string",
  "city": "string",
  "state": "string",
  "over_all_rank": "string",
  "totalScore": number,
  "tlr": {
    "score": number,
    "ss": number,
    "fsr": number,
    "fqe": number,
    "fru": number,
    "oe_mir": number
  },
  "rp": {
    "score": number,
    "pu": number,
    "qp": number,
    "ipr": number,
    "fppp": number,
  },
  "go": {
    "score": number,
    "gue": number,
    "gphd": number
  },
  "oi": {
    "score": number,
    "rd": number,
    "wd": number,
    "escs": number,
    "pcs": number
  },
  "pr": {
    "score": number,
    "pr_accr": number
  }
}

Return ONLY valid JSON. No explanation.
`;

/** PROMPT_2: Different layout used by Management, Medical, Dental, Architecture, College, 2021-2023 etc. */
const PROMPT_2 = `
You are an expert at reading NIRF (National Institutional Ranking Framework) scorecard images.

Carefully analyze the image and extract ALL visible data.

⚠️ CRITICAL INSTRUCTIONS:
1. Extract ALL sub-scores (ss, fsr, fqe, fru, etc.) accurately.
2. For each pillar (TLR, RP, GO, OI, PR):
   - If the TOTAL score is clearly visible in the image → use it.
   - If NOT clearly visible → CALCULATE it as the SUM of its sub-components.
3. NEVER leave pillar "score" as null if sub-scores are available.
4. Ensure all numeric values are numbers (not strings).
5. Double-check calculations before returning.

📌 FORMULAS (IMPORTANT):
- TLR.score = ss + fsr + fqe + fru 
- RP.score  = pu + qp + ipr + fppp
- GO.score  = gue + gphd
- OI.score  = rd + wd + escs + pcs
- PR.score  = pr_accr (usually same or directly visible)

{
  "institutionId": "string",
  "institutionName": "string",
  "city": "string",
  "state": "string",
  "over_all_rank": "string",
  "totalScore": number,
  "tlr": {
    "score": number,
    "ss": number,
    "fsr": number,
    "fqe": number,
    "fru": number,
  },
  "rp": {
    "score": number,
    "pu": number,
    "qp": number,
    "ipr": number,
    "fppp": number,
  },
  "go": {
    "score": number,
    "gue": number,
    "gphd": number
  },
  "oi": {
    "score": number,
    "rd": number,
    "wd": number,
    "escs": number,
    "pcs": number
  },
  "pr": {
    "score": number,
    "pr_accr": number
  }
}

Return ONLY valid JSON. No explanation.
`;

/** PROMPT_3: College 2019 special format */
const PROMPT_3 = `
You are an expert at reading NIRF (National Institutional Ranking Framework) scorecard images.

Carefully analyze the image and extract ALL visible data.

⚠️ CRITICAL INSTRUCTIONS:
1. Extract ALL sub-scores (ss, fsr, fqe, fru, etc.) accurately.
2. For each pillar (TLR, RP, GO, OI, PR):
   - If the TOTAL score is clearly visible in the image → use it.
   - If NOT clearly visible → CALCULATE it as the SUM of its sub-components.
3. NEVER leave pillar "score" as null if sub-scores are available.
4. Ensure all numeric values are numbers (not strings).
5. Double-check calculations before returning.

📌 FORMULAS (IMPORTANT):
- TLR.score = ss + fsr + fqe + fru 
- RP.score  = pu + qp 
- GO.score  = gph + gue + ms
- OI.score  = rd + wd + escs + pcs
- PR.score  = pr_accr (usually same or directly visible)

{
  "institutionId": "string",
  "institutionName": "string",
  "city": "string",
  "state": "string",
  "over_all_rank": "string",
  "totalScore": number,
  "tlr": {
    "score": number,
    "ss": number,
    "fsr": number,
    "fqe": number,
    "fru": number,
  },
  "rp": {
    "score": number,
    "pu": number,
    "qp": number,
  },
  "go": {
    "score": number,
    "gph": number,
    "gue": number,
    "ms": number
  },
  "oi": {
    "score": number,
    "rd": number,
    "wd": number,
    "escs": number,
    "pcs": number
  },
  "pr": {
    "score": number,
    "pr_accr": number
  }
}


Return ONLY valid JSON. No explanation.
`;

/** PROMPT_4: Open University / Skill University / State Public University / SDG (newer categories 2024-2025) */
const PROMPT_4 = `
You are an expert at reading NIRF (National Institutional Ranking Framework) scorecard images.

Carefully analyze the image and extract ALL visible data.

⚠️ CRITICAL INSTRUCTIONS:
1. Extract ALL sub-scores (ss, fsr, fqe, fru, etc.) accurately.
2. For each pillar (TLR, RP, GO, OI, PR):
   - If the TOTAL score is clearly visible in the image → use it.
   - If NOT clearly visible → CALCULATE it as the SUM of its sub-components.
3. NEVER leave pillar "score" as null if sub-scores are available.
4. Ensure all numeric values are numbers (not strings).
5. Double-check calculations before returning.

📌 FORMULAS (IMPORTANT):
- TLR.score = ss + fsr + fqe + fru + oe_mir 
- RP.score  = pu + qp + ipr + fppp + sdg
- GO.score  = gue + gphd
- OI.score  = rd + wd + escs + pcs
- PR.score  = pr_accr (usually same or directly visible)

{
  "institutionId": "string",
  "institutionName": "string",
  "city": "string",
  "state": "string",
  "over_all_rank": "string",
  "totalScore": number,
  "tlr": {
    "score": number,
    "ss": number,
    "fsr": number,
    "fqe": number,
    "fru": number,
    "oe_mir": number
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
    "gue": number,
    "gphd": number
  },
  "oi": {
    "score": number,
    "rd": number,
    "wd": number,
    "escs": number,
    "pcs": number
  },
  "pr": {
    "score": number,
    "pr_accr": number
  }
}


Return ONLY valid JSON. No explanation.
`;

const PROMPTS = { PROMPT_1, PROMPT_2, PROMPT_3, PROMPT_4 };

// ── CORE CALL ─────────────────────────────────────────────────────────────
const callGemini = async (modelName, imagePath, promptType = "PROMPT_1") => {
  console.log(`🔑 Using GEMINI_KEY | Model: ${modelName} | Prompt: ${promptType}`);

  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = PROMPTS[promptType] || PROMPT_1;

  try {
    const result = await model.generateContent([
      prompt,
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
export const extractDataFromImage = async (imagePath, promptType = "PROMPT_1") => {
  let lastError = null;

  // 🧠 PRO MODEL — 3 attempts, each rotates key on overload
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`🧠 Pro attempt ${i + 1} [${promptType}]`);
      return await callGemini(GEMINI_PRO_MODEL, imagePath, promptType);
    } catch (err) {
      lastError = err;
      if (!isOverloadError(err)) throw err;
      console.warn(`⚠️  Pro attempt ${i + 1} overloaded, retrying...`);
    }
  }

  console.log("🛑 All Pro attempts exhausted, switching to Flash...");
  await sleep(5000); // brief pause before switching model tier

  // ⚡ FLASH MODEL — 2 attempts, same key rotation
  for (let i = 0; i < 2; i++) {
    try {
      console.log(`⚡ Flash attempt ${i + 1} [${promptType}]`);
      return await callGemini(GEMINI_FLASH_MODEL, imagePath, promptType);
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