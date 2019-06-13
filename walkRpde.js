const util = require('util');
const fs = require('fs');
const path = require('path');
const { default: axios } = require('axios');

const writeFile = util.promisify(fs.writeFile);

function doContinueIterating({ nextUrl, prevNextUrl, endUrl }) {
  if (endUrl && endUrl === nextUrl) {
    console.log(`TERMINATING as endUrl reached: ${endUrl}`);
    return false;
  }
  if (nextUrl === prevNextUrl) {
    console.log(`TERMINATING as end of feed reached: ${nextUrl}`);
    return false;
  }
  return true;
}

/**
 * @param {string} startUrl
 * @param {object} options
 * @param {string} [options.endUrl]
 */
async function walkRpde(startUrl, options) {
  let prevNextUrl;
  let nextUrl = startUrl;
  let page = 0;
  while (doContinueIterating({ nextUrl, prevNextUrl, endUrl: options.endUrl })) {
    const { data: pageJson } = await axios.get(nextUrl);
    const filePath = path.join(__dirname, `rpde-${page}.json`);
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
    walkRpde(process.env.START_URL, { endUrl: process.env.END_URL });
  }
}