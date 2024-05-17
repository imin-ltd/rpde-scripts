const util = require('util');
const fs = require('fs');
const path = require('path');
const { default: axios } = require('axios');
const { doContinueIterating } = require('./utils/doContinueIterating');

const writeFile = util.promisify(fs.writeFile);
const RETRY_HTTP_CODES = new Set([403, 429, 500]);
const RPDE_FILE_BASE_NAME_REGEX = /^rpde-(\d+)\.json$/;

if (require.main === module) {
  const continuePreviousRun = process.env.CONTINUE_PREVIOUS_RUN === 'true';
  if (process.env.START_URL && continuePreviousRun) {
    console.error('ERROR: START_URL and CONTINUE_PREVIOUS_RUN cannot be used together. Use one or the other');
    process.exit(1);
  }
  if ((!process.env.START_URL && !continuePreviousRun) || !process.env.REL_OUTPUT_DIR) {
    console.error('ERROR: START_URL (or CONTINUE_PREVIOUS_RUN) and REL_OUTPUT_DIR must be provided');
    console.log();
    console.log('Please check README.md for an example of how to use this script');
    process.exit(1);
  }
  const outputDirPath = path.join(__dirname, process.env.REL_OUTPUT_DIR);
  // Make REL_OUTPUT_DIR if it doesn't exist
  fs.mkdirSync(outputDirPath, { recursive: true });
  // Check on any existing RPDE files and derive the start URL from them if CONTINUE_PREVIOUS_RUN is true
  const fileBaseNames = fs.readdirSync(outputDirPath);
  const { startUrl, startPageNum } = checkExistingRpdeFilesAndGetStartUrlAndPageNum({
    continuePreviousRun,
    envStartUrl: process.env.START_URL,
    outputDir: outputDirPath,
    fileBaseNames,
  });
  walkRpde(outputDirPath, startUrl, startPageNum, {
    endUrl: process.env.END_URL,
    maxPages: process.env.MAX_PAGES ? Number(process.env.MAX_PAGES) : Infinity,
    apiKey: process.env.API_KEY,
    bearerToken: process.env.BEARER_TOKEN,
    pollingIntervalMs: process.env.POLLING_INTERVAL_MS ? Number(process.env.POLLING_INTERVAL_MS) : 0,
  });
}

/**
 * @param {string} outputDirPath
 * @param {string} startUrl
 * @param {number} startPageNum
 * @param {object} options
 * @param {string} [options.endUrl]
 * @param {number} [options.maxPages]
 * @param {number} options.pollingIntervalMs
 * @param {string} [options.apiKey]
 * @param {string} [options.bearerToken]
 */
async function walkRpde(outputDirPath, startUrl, startPageNum, options) {
  const { apiKey, bearerToken } = options;
  const pageRequestAuthOptions = { apiKey, bearerToken };
  let prevNextUrl;
  let nextUrl = startUrl;
  let page = startPageNum;
  while (doContinueIterating({
    nextUrl,
    prevNextUrl,
    endUrl: options.endUrl,
    maxPages: options.maxPages,
    page,
  })) {
    const { data: pageJson } = await doPageRequest(nextUrl, pageRequestAuthOptions);
    const filePath = path.join(outputDirPath, `rpde-${page}.json`);
    await writeFile(filePath, JSON.stringify(pageJson, null, 2));
    prevNextUrl = nextUrl;
    nextUrl = pageJson.next;
    const numItems = pageJson.items.length;
    console.log(`got page: ${page}, with next URL: ${nextUrl}, num items: ${numItems}`);
    page = page + 1;
    await wait(options.pollingIntervalMs);
  }
}

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

/**
 * @param {object} options
 * @param {boolean} options.continuePreviousRun
 * @param {string} options.envStartUrl
 * @param {string} options.outputDir
 * @param {string[]} options.fileBaseNames
 * @returns {{ startUrl: string, startPageNum: number }}
 */
function checkExistingRpdeFilesAndGetStartUrlAndPageNum({
  continuePreviousRun,
  envStartUrl,
  outputDir,
  fileBaseNames,
}) {
  if (continuePreviousRun) {
    const existingRpdeFilePageNums = fileBaseNames
      .filter(fileBaseName => RPDE_FILE_BASE_NAME_REGEX.test(fileBaseName))
      .map(fileBaseName => Number(RPDE_FILE_BASE_NAME_REGEX.exec(fileBaseName)[1]))
      .sort((a, b) => a - b);
    if (existingRpdeFilePageNums.length === 0) {
      console.error(`ERROR: There are no RPDE files matching rpde-*.json in the output directory, ${process.env.REL_OUTPUT_DIR}/, which means that there is no previous run to continue from. Please either choose a different REL_OUTPUT_DIR or provide a START_URL instead of CONTINUE_PREVIOUS_RUN`);
      process.exit(1);
    }
    const lastRpdeFilePageNum = existingRpdeFilePageNums[existingRpdeFilePageNums.length - 1];
    const lastRpdeFilePath = path.join(outputDir, `rpde-${lastRpdeFilePageNum}.json`);
    const lastRpdeFile = JSON.parse(fs.readFileSync(lastRpdeFilePath, 'utf8'));
    if (!lastRpdeFile.next) {
      console.error(`ERROR: The last RPDE file, ${lastRpdeFilePath}, does not have a \`next\` URL, which means that there is no next page to continue from. Please either choose a different REL_OUTPUT_DIR or provide a START_URL instead of CONTINUE_PREVIOUS_RUN`);
      process.exit(1);
    }
    return { startUrl: lastRpdeFile.next, startPageNum: lastRpdeFilePageNum + 1 };
  }
  const anyExistingRpdeFiles = fileBaseNames
    .some(fileBaseName => RPDE_FILE_BASE_NAME_REGEX.test(fileBaseName));
  if (anyExistingRpdeFiles) {
    console.error(`ERROR: There are already RPDE files matching rpde-*.json in the output directory, ${process.env.REL_OUTPUT_DIR}/. If you want to continue that run, please use CONTINUE_PREVIOUS_RUN rather than START_URL. Otherwise, please remove the items in this directory first.`);
    process.exit(1);
  }
  return { startUrl: envStartUrl, startPageNum: 0 };
}