/**
 * Should we continue paging through the RPDE feed?
 *
 * @param {object} args 
 * @param {string} args.nextUrl
 * @param {string} args.prevNextUrl
 * @param {string} args.endUrl
 * @param {number} args.maxPages
 * @param {number} args.page
 * @returns {boolean} If true, continue paging. If false, the end has been reached.
 */
function doContinueIterating({ nextUrl, prevNextUrl, endUrl, maxPages, page }) {
  if (endUrl && endUrl === nextUrl) {
    console.log(`TERMINATING as endUrl reached: ${endUrl}`);
    return false;
  }
  if (nextUrl === prevNextUrl) {
    console.log(`TERMINATING as end of feed reached: ${nextUrl}`);
    return false;
  }
  if (page >= maxPages) {
    console.log(`TERMINATING as maxPages reached: ${maxPages}`);
    return false;
  }
  return true;
}

module.exports = {
  doContinueIterating,
};
