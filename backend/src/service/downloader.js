import axios from "axios";
import fs from "fs";
import path from "path";
import https from "https";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export const downloadImage = async (url, destDir, fileName) => {
  try {
    if (!fs.existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, fileName);

    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
      httpsAgent,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    await writeFile(destPath, Buffer.from(response.data));

    return { success: true, path: destPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteImage = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error("Delete failed:", error.message);
  }
};