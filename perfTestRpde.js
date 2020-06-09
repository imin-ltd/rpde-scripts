/**
 * Run a performance test on downloading an entire RPDE feed.
 * This is similar to walkRpde.js, but it doesn't save the feed items and records times for downloading each item.
 */
const { default: axios } = require('axios');
const { performance } = require('perf_hooks');
const { doContinueIterating } = require('./utils/doContinueIterating');

/**
 * @param {number[]} sortedList Sorted in ascending order
 * @param {number} p Between 0 and 1 e.g. 0.9 for a p90
 */
function calculatePValue(sortedList, p) {
  return sortedList[Math.floor(sortedList.length * p)];
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
  const startTime = performance.now();
  /** @type {number[]} */
  const requestTimes = [];
  while (doContinueIterating({ nextUrl, prevNextUrl, endUrl: options.endUrl })) {
    // Get the next page. We don't do anything with the result.
    const beforeHttpGetTime = performance.now();
    const { data: pageJson } = await axios.get(nextUrl);
    const afterHttpGetTime = performance.now();
    const requestTime = afterHttpGetTime - beforeHttpGetTime;
    requestTimes.push(requestTime);
    prevNextUrl = nextUrl;
    nextUrl = pageJson.next;
    const numItems = pageJson.items.length;
    console.log(`got page: ${page}, with next URL: ${nextUrl}, num items: ${numItems}; time taken: ${requestTime} ms`);
    page = page + 1;
  }
  // ## Calculate end-of-harvest performance stats
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const totalTimeOfRequests = requestTimes.reduce((accum, time) => accum + time, 0);
  const averageRequestTime = totalTimeOfRequests / requestTimes.length;
  const sortedRequestTimes = [...requestTimes].sort();
  const p90 = calculatePValue(sortedRequestTimes, 0.9);
  const p95 = calculatePValue(sortedRequestTimes, 0.95);
  const p99 = calculatePValue(sortedRequestTimes, 0.99);
  console.log();
  console.log('Performance stats:');
  console.log();
  console.log(`- Total time taken: ${totalTime}`);
  console.log(`- Average request time: ${averageRequestTime}`)
  console.log(`- p90: ${p90}`);
  console.log(`- p95: ${p95}`);
  console.log(`- p99: ${p99}`);
}

if (require.main === module) {
  if (!process.env.START_URL) {
    console.log('Usage: START_URL=<e.g. https://opensessions.io/api/rpde/session-series> [END_URL=<e.g. http://opensessions.io/API/rpde/session-series?afterTimestamp=1537456685&afterId=2566>] node walkRpde.js');
    process.exit(1);
  } else {
    walkRpde(process.env.START_URL, { endUrl: process.env.END_URL });
  }
}
