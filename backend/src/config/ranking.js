/**
 * Defines the output availability for each ranking category.
 * 
 * Since we now use a unified prompt (UNIFIED_PROMPT) that covers all formats,
 * we only need to track which year/rankingType combinations have scorecards.
 * 
 * hasOutput: true  — scraped and send to AI extraction
 * hasOutput: false — skip entirely (no scorecards published)
 */

// Per-year configuration: hasOutput indicates if scorecards exist for that year/rankingType
const YEAR_OVERRIDES = {
  // 2025
  "2025": {
    Overall:               { hasOutput: true },
    University:            { hasOutput: true },
    Engineering:           { hasOutput: true },
    Pharmacy:              { hasOutput: true },
    Research:              { hasOutput: true },
    Management:            { hasOutput: true },
    Medical:               { hasOutput: true },
    Dental:                { hasOutput: true },
    Architecture:          { hasOutput: true },
    College:               { hasOutput: true },
    Law:                   { hasOutput: false },
    Agriculture:           { hasOutput: false },
    Innovation:            { hasOutput: false },
    OPENUNIVERSITY:        { hasOutput: true },
    SKILLUNIVERSITY:       { hasOutput: true },
    STATEPUBLICUNIVERSITY: { hasOutput: true },
    SDGInstitutions:       { hasOutput: true },
  },
  // 2024
  "2024": {
    Overall:               { hasOutput: true },
    University:            { hasOutput: true },
    Engineering:           { hasOutput: true },
    Pharmacy:              { hasOutput: true },
    Research:              { hasOutput: true },
    Management:            { hasOutput: true },
    Medical:               { hasOutput: true },
    Dental:                { hasOutput: true },
    Architecture:          { hasOutput: true },
    College:               { hasOutput: true },
    Law:                   { hasOutput: false },
    Agriculture:           { hasOutput: false },
    Innovation:            { hasOutput: false },
    OPENUNIVERSITY:        { hasOutput: true },
    SKILLUNIVERSITY:       { hasOutput: true },
    STATEPUBLICUNIVERSITY: { hasOutput: true },
  },
  // 2023
  "2023": {
    Overall:      { hasOutput: true },
    University:   { hasOutput: true },
    Engineering:  { hasOutput: true },
    Pharmacy:     { hasOutput: true },
    Research:     { hasOutput: true },
    Management:   { hasOutput: true },
    Medical:      { hasOutput: true },
    Dental:       { hasOutput: true },
    Architecture: { hasOutput: true },
    College:      { hasOutput: true },
    Law:          { hasOutput: false },
    Agriculture:  { hasOutput: false },
    Innovation:   { hasOutput: false },
  },
  // 2022
  "2022": {
    Overall:      { hasOutput: true },
    University:   { hasOutput: true },
    Engineering:  { hasOutput: true },
    Pharmacy:     { hasOutput: true },
    Research:     { hasOutput: true },
    Management:   { hasOutput: true },
    Medical:      { hasOutput: true },
    Dental:       { hasOutput: true },
    Architecture: { hasOutput: true },
    College:      { hasOutput: true },
    Law:          { hasOutput: false },
  },
  // 2021
  "2021": {
    Overall:      { hasOutput: true },
    University:   { hasOutput: true },
    Engineering:  { hasOutput: true },
    Pharmacy:     { hasOutput: true },
    Research:     { hasOutput: true },
    Management:   { hasOutput: true },
    Medical:      { hasOutput: true },
    Dental:       { hasOutput: true },
    Architecture: { hasOutput: true },
    College:      { hasOutput: true },
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
    Overall:      { hasOutput: true },
    University:   { hasOutput: true },
    Engineering:  { hasOutput: true },
    Pharmacy:     { hasOutput: true },
    Management:   { hasOutput: true },
    Medical:      { hasOutput: true },
    Dental:       { hasOutput: true },
    Architecture: { hasOutput: true },
    College:      { hasOutput: true },
    Law:          { hasOutput: false },
  },
  // 2018
  "2018": {
    Overall:      { hasOutput: false },
    University:   { hasOutput: false },
    Engineering:  { hasOutput: false },
    Pharmacy:     { hasOutput: true },
    Management:   { hasOutput: true },
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
 * Get the output config for a given year + ranking_type combination.
 * @param {string} year
 * @param {string} rankingType
 * @returns {{ hasOutput: boolean }}
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