/**
 * Defines the output availability and prompt type for each ranking category.
 *
 * PROMPT_1 — Standard TLR/RP/GO/OI/PR format (Overall, University, Engineering, Pharmacy, Research)
 * PROMPT_2 — Management/Medical/Architecture/Dental/Law/College (different output layout)
 * PROMPT_3 — Special case: College 2019 (different format again)
 * PROMPT_4 — 2024-specific new categories (OPENUNIVERSITY, SKILLUNIVERSITY, STATEPUBLICUNIVERSITY, SDGInstitutions)
 * No output — Skip entirely
 */

// Per-year overrides: If a ranking type behaves differently in a specific year,
// list it here. Falls back to BASE_CONFIG if not listed.
const YEAR_OVERRIDES = {
  // 2025 — same output format as 2024 for most
  "2025": {
    Overall:               { hasOutput: true,  prompt: "PROMPT_1" },
    University:            { hasOutput: true,  prompt: "PROMPT_1" },
    Engineering:           { hasOutput: true,  prompt: "PROMPT_1" },
    Pharmacy:              { hasOutput: true,  prompt: "PROMPT_1" },
    Research:              { hasOutput: true,  prompt: "PROMPT_1" },
    Management:            { hasOutput: true,  prompt: "PROMPT_2" },
    Medical:               { hasOutput: true,  prompt: "PROMPT_2" },
    Dental:                { hasOutput: true,  prompt: "PROMPT_2" },
    Architecture:          { hasOutput: true,  prompt: "PROMPT_2" },
    College:               { hasOutput: true,  prompt: "PROMPT_2" },
    Law:                   { hasOutput: false },
    Agriculture:           { hasOutput: false },
    Innovation:            { hasOutput: false },
    OPENUNIVERSITY:        { hasOutput: true,  prompt: "PROMPT_4" },
    SKILLUNIVERSITY:       { hasOutput: true,  prompt: "PROMPT_4" },
    STATEPUBLICUNIVERSITY: { hasOutput: true,  prompt: "PROMPT_4" },
    SDGInstitutions:       { hasOutput: true,  prompt: "PROMPT_4" },
  },
  // 2024
  "2024": {
    Overall:               { hasOutput: true,  prompt: "PROMPT_1" },
    University:            { hasOutput: true,  prompt: "PROMPT_1" },
    Engineering:           { hasOutput: true,  prompt: "PROMPT_1" },
    Pharmacy:              { hasOutput: true,  prompt: "PROMPT_1" },
    Research:              { hasOutput: true,  prompt: "PROMPT_1" },
    Management:            { hasOutput: true,  prompt: "PROMPT_2" },
    Medical:               { hasOutput: true,  prompt: "PROMPT_2" },
    Dental:                { hasOutput: true,  prompt: "PROMPT_2" },
    Architecture:          { hasOutput: true,  prompt: "PROMPT_2" },
    College:               { hasOutput: true,  prompt: "PROMPT_2" },
    Law:                   { hasOutput: false },
    Agriculture:           { hasOutput: false },
    Innovation:            { hasOutput: false },
    OPENUNIVERSITY:        { hasOutput: true,  prompt: "PROMPT_4" },
    SKILLUNIVERSITY:       { hasOutput: true,  prompt: "PROMPT_4" },
    STATEPUBLICUNIVERSITY: { hasOutput: true,  prompt: "PROMPT_4" },
  },
  // 2023
  "2023": {
    Overall:      { hasOutput: true,  prompt: "PROMPT_2" },
    University:   { hasOutput: true,  prompt: "PROMPT_2" },
    Engineering:  { hasOutput: true,  prompt: "PROMPT_2" },
    Pharmacy:     { hasOutput: true,  prompt: "PROMPT_2" },
    Research:     { hasOutput: true,  prompt: "PROMPT_2" },
    Management:   { hasOutput: true,  prompt: "PROMPT_2" },
    Medical:      { hasOutput: true,  prompt: "PROMPT_2" },
    Dental:       { hasOutput: true,  prompt: "PROMPT_2" },
    Architecture: { hasOutput: true,  prompt: "PROMPT_2" },
    College:      { hasOutput: true,  prompt: "PROMPT_2" },
    Law:          { hasOutput: false },
    Agriculture:  { hasOutput: false },
    Innovation:   { hasOutput: false },
  },
  // 2022
  "2022": {
    Overall:      { hasOutput: true,  prompt: "PROMPT_2" },
    University:   { hasOutput: true,  prompt: "PROMPT_2" },
    Engineering:  { hasOutput: true,  prompt: "PROMPT_2" },
    Pharmacy:     { hasOutput: true,  prompt: "PROMPT_2" },
    Research:     { hasOutput: true,  prompt: "PROMPT_2" },
    Management:   { hasOutput: true,  prompt: "PROMPT_2" },
    Medical:      { hasOutput: true,  prompt: "PROMPT_2" },
    Dental:       { hasOutput: true,  prompt: "PROMPT_2" },
    Architecture: { hasOutput: true,  prompt: "PROMPT_2" },
    College:      { hasOutput: true,  prompt: "PROMPT_2" },
    Law:          { hasOutput: false },
  },
  // 2021
  "2021": {
    Overall:      { hasOutput: true,  prompt: "PROMPT_2" },
    University:   { hasOutput: true,  prompt: "PROMPT_2" },
    Engineering:  { hasOutput: true,  prompt: "PROMPT_2" },
    Pharmacy:     { hasOutput: true,  prompt: "PROMPT_2" },
    Research:     { hasOutput: true,  prompt: "PROMPT_2" },
    Management:   { hasOutput: true,  prompt: "PROMPT_2" },
    Medical:      { hasOutput: true,  prompt: "PROMPT_2" },
    Dental:       { hasOutput: true,  prompt: "PROMPT_2" },
    Architecture: { hasOutput: true,  prompt: "PROMPT_2" },
    College:      { hasOutput: true,  prompt: "PROMPT_2" },
    Law:          { hasOutput: false },
  },
  // 2020
  "2020": {
    Overall:      { hasOutput: false },
    University:   { hasOutput: false },
    Engineering:  { hasOutput: false },
    Pharmacy:     { hasOutput: false },
    Management:   { hasOutput: false },
    Medical:      { hasOutput: false },
    Dental:       { hasOutput: false },
    Architecture: { hasOutput: false },
    College:      { hasOutput: false },
    Law:          { hasOutput: false },
  },
  // 2019
  "2019": {
    Overall:      { hasOutput: true,  prompt: "PROMPT_2" },
    University:   { hasOutput: true,  prompt: "PROMPT_2" },
    Engineering:  { hasOutput: true,  prompt: "PROMPT_2" },
    Pharmacy:     { hasOutput: true,  prompt: "PROMPT_2" },
    Management:   { hasOutput: true,  prompt: "PROMPT_2" },
    Medical:      { hasOutput: true,  prompt: "PROMPT_2" },
    Dental:       { hasOutput: true,  prompt: "PROMPT_2" },
    Architecture: { hasOutput: true,  prompt: "PROMPT_2" },
    College:      { hasOutput: true,  prompt: "PROMPT_3" }, // special format
    Law:          { hasOutput: false },
  },
  // 2018
  "2018": {
    Overall:      { hasOutput: false },
    University:   { hasOutput: false },
    Engineering:  { hasOutput: false },
    Pharmacy:     { hasOutput: true,  prompt: "PROMPT_2" },
    Management:   { hasOutput: true,  prompt: "PROMPT_2" },
    Medical:      { hasOutput: false },
    Architecture: { hasOutput: false },
    College:      { hasOutput: false },
    Law:          { hasOutput: false },
  },
  // 2017
  "2017": {
    Overall:      { hasOutput: false },
    University:   { hasOutput: false },
    Engineering:  { hasOutput: false },
    Pharmacy:     { hasOutput: false },
    Management:   { hasOutput: false },
    College:      { hasOutput: false },
  },
  // 2016
  "2016": {
    University:   { hasOutput: false },
    Engineering:  { hasOutput: false },
    Management:   { hasOutput: false },
    Pharmacy:     { hasOutput: false },
  },
};

/**
 * Get the prompt config for a given year + ranking_type combination.
 * @param {string} year
 * @param {string} rankingType
 * @returns {{ hasOutput: boolean, prompt?: string }}
 */
export const getPromptForRanking = (year, rankingType) => {
  const yearConfig = YEAR_OVERRIDES[String(year)];
  if (!yearConfig) return { hasOutput: false };
  const entry = yearConfig[rankingType];
  if (!entry) return { hasOutput: false };
  return entry;
};

// Legacy named export kept for backwards compatibility
export const RANKING_CONFIG = YEAR_OVERRIDES;