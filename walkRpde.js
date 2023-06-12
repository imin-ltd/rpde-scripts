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
 * @param {string} [options.apiKey]
 */
async function walkRpde(startUrl, options) {
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
    const { data: pageJson } = await axios.get(nextUrl, {
      headers: {
        ...(options.apiKey ? { 'X-Api-Key': options.apiKey } : {}),
      },
    });
    const filePath = options.relOutputDir
      ? path.join(__dirname, options.relOutputDir, `rpde-${page}.json`)
      : path.join(__dirname, `rpde-${page}.json`);
    await writeFile(filePath, JSON.stringify(pageJson, null, 2));
    prevNextUrl = nextUrl;
    nextUrl = pageJson.next;
    const numItems = pageJson.items.length;
    console.log(`got page: ${page}, with next URL: ${nextUrl}, num items: ${numItems}`);
    page = page + 1;
  }
}

if (require.main === module) {
  if (!process.env.START_URL) {
    console.log('Usage: START_URL=<e.g. https://opensessions.io/api/rpde/session-series> [END_URL=<e.g. http://opensessions.io/API/rpde/session-series?afterTimestamp=1537456685&afterId=2566>] node walkRpde.js');
    process.exit(1);
  } else {
    walkRpde(process.env.START_URL, {
      endUrl: process.env.END_URL,
      maxPages: process.env.MAX_PAGES ? Number(process.env.MAX_PAGES) : Infinity,
      relOutputDir: process.env.REL_OUTPUT_DIR,
      apiKey: process.env.API_KEY,
    });
  }
}