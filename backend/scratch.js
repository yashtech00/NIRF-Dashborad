import axios from "axios";
import https from "https";
import * as cheerio from "cheerio";

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  headers: {
    "User-Agent": "Mozilla/5.0",
  },
  timeout: 15000,
});

const getInstitutesData = async (year, rankingType) => {
  const url = `https://www.nirfindia.org/Rankings/${year}/${rankingType}Ranking.html`;

  try {
    const { data } = await axiosInstance.get(url);
    const $ = cheerio.load(data);
    const institutes = [];

    $("table tbody tr").each((_, el) => {
      const tds = $(el).children("td");

      if (tds.length >= 6) {
        const id = $(tds[0]).text().trim();

        if (id.match(/IR-[-a-zA-Z0-9]+/)) {
          const nameHtml = $(tds[1]).text().trim();
          const name = nameHtml.split("More Details")[0].trim();

          const scoreStr = $(tds[4]).text().trim();
          const score = isNaN(parseFloat(scoreStr))
            ? 0
            : parseFloat(scoreStr);

          institutes.push({
            institutionId: id,
            institutionName: name,
            ranking_type: rankingType,
            year: Number(year),
            city: $(tds[2]).text().trim(),
            state: $(tds[3]).text().trim(),
            score,
            over_all_rank: $(tds[5]).text().trim(),
          });
        }
      }
    });

    const uniqueMap = new Map();
    institutes.forEach((inst) => {
      uniqueMap.set(inst.institutionId, inst);
    });

    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error(`❌ Failed to fetch ranking page: ${url}`);
    console.error("Error:", error.message);
    throw error;
  }
};

getInstitutesData("2024", "College").then(console.log).catch(console.error);
