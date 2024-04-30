const util = require('util');
const fs = require('fs');
const path = require('path');
const { default: axios } = require('axios');
const { doContinueIterating } = require('./utils/doContinueIterating');

const writeFile = util.promisify(fs.writeFile);

/**
 * @param {string} startUrl
 * @param {object} options
 * @param {string} [options.endUrl]
 * @param {number} [options.maxPages]
 * @param {number} [options.relOutputDir]
 * @param {number} options.pollingIntervalMs
 * @param {string} [options.apiKey]
 * @param {string} [options.bearerToken]
 */
async function walkRpde(startUrl, options) {
  const { apiKey, bearerToken } = options;
  const pageRequestAuthOptions = { apiKey, bearerToken };
  let prevNextUrl;
  let nextUrl = startUrl;
  let page = 0;
  while (doContinueIterating({
    nextUrl,
    prevNextUrl,
    endUrl: options.endUrl,
    maxPages: options.maxPages,
    page,
  })) {
    const { data: pageJson } = await doPageRequest(nextUrl, pageRequestAuthOptions);
    const filePath = options.relOutputDir
      ? path.join(__dirname, options.relOutputDir, `rpde-${page}.json`)
      : path.join(__dirname, `rpde-${page}.json`);
    await writeFile(filePath, JSON.stringify(pageJson, null, 2));
    prevNextUrl = nextUrl;
    nextUrl = pageJson.next;
    const numItems = pageJson.items.length;
    console.log(`got page: ${page}, with next URL: ${nextUrl}, num items: ${numItems}`);
    page = page + 1;
    await wait(options.pollingIntervalMs);
  }
}

const RETRY_HTTP_CODES = new Set([403, 429, 500]);

/**
 * @param {string} nextUrl
 * @param {object} authOptions
 * @param {string} [authOptions.apiKey]
 * @param {string} [authOptions.bearerToken]
 * @param {number} numRetries
 */
async function doPageRequest(nextUrl, { apiKey, bearerToken }, numRetries = 3) {
  try {
    const result = await axios.get(nextUrl, {
      headers: {
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
    });
    return result;
  } catch (error) {
    if (error.response && RETRY_HTTP_CODES.has(error.response.status) && numRetries > 0) {
      console.log(`retrying after error (${error.response.status}) in 5s...`);
      await wait(5000);
      return doPageRequest(nextUrl, { apiKey, bearerToken }, numRetries - 1);
    }
    throw error;
  }
}

/**
 * @param {number} ms
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  if (!process.env.START_URL) {
    console.log('Usage: START_URL=<e.g. https://opensessions.io/api/rpde/session-series> [END_URL=<e.g. http://opensessions.io/API/rpde/session-series?afterTimestamp=1537456685&afterId=2566>] node walkRpde.js');
    process.exit(1);
  } else {
    if (process.env.REL_OUTPUT_DIR) {
      // Make REL_OUTPUT_DIR if it doesn't exist
      fs.mkdirSync(path.join(__dirname, process.env.REL_OUTPUT_DIR), { recursive: true });
    }
    walkRpde(process.env.START_URL, {
      endUrl: process.env.END_URL,
      maxPages: process.env.MAX_PAGES ? Number(process.env.MAX_PAGES) : Infinity,
      relOutputDir: process.env.REL_OUTPUT_DIR,
      apiKey: process.env.API_KEY,
      bearerToken: process.env.BEARER_TOKEN,
      pollingIntervalMs: process.env.POLLING_INTERVAL_MS ? Number(process.env.POLLING_INTERVAL_MS) : 0,
    });
  }
}