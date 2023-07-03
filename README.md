# rpde-scripts

## Set-up

```sh
npm install
```

## Running

```sh
export START_URL=<e.g. https://opensessions.io/api/rpde/session-series>
export END_URL=<e.g. http://opensessions.io/API/rpde/session-series?afterTimestamp=1537456685&afterId=2566> # Optional. If omitted, the script will just walk the RPDE feed to the very end
node walkRpde.js
```

This will start outputting a list of files `rpde-*.json` e.g. `rpde-1.json`, `rpde-2.json`, etc until `END_URL` or the end of the feed has been reached by the script.

You can then run queries like (you will need to install `jq`):

```sh
cat rpde-*.json | jq --slurp '[.[].items[]] | length'
```

Which will return how many total items there are

### Options

Options are set using environment variables. They are:

- `START_URL` - (REQUIRED) The URL to start walking the RPDE feed from
- `END_URL` - (OPTIONAL) The URL to stop walking the RPDE feed at. If omitted, the script will walk to the very end of the feed
- `MAX_PAGES` - (OPTIONAL) The maximum number of pages to walk. If omitted, the script will walk to the very end of the feed
  - e.g. `export MAX_PAGES=10`
- `API_KEY` - (OPTIONAL) API key used to make RPDE requests. It will be set as the `X-Api-Key` HTTP header
- `BEARER_TOKEN` - (OPTIONAL) Bearer token used to make RPDE requests. It will be set as the `Authorization` HTTP header
- `REL_OUTPUT_DIR` - (OPTIONAL) Relative Output Directory. If included, RPDE feed pages will be outputted to this directory. This directory is relative to the current working directory.
  - e.g. `export REL_OUTPUT_DIR=slots` will output to `./slots/rpde-1.json`, `./slots/rpde-2.json`, etc

#### Some other example queries:

_How many items in the feed have state: 'updated'_:

```sh
cat rpde-*.json | jq -s '[.[].items[] | select(.state == "updated")] | length'
```

_Latest `startDate` for items in this ScheduledSession/Slot feed_:

```sh
cat rpde-*.json | jq --slurp '[.[].items[].data.startDate] | max'
```

_Get item with ID X_


```sh
cat rpde-*.json | jq -s '[.[].items[] | select(.data["@id"] == "X")]'
```

_Get the first item with state=updated_

```sh
cat rpde-*.json | jq -s '[.[].items[] | select(.state == "updated")][0]'
```

_Get the first 10 items with state=updated_

```sh
cat rpde-*.json | jq -s '[.[].items[] | select(.state == "updated")][0:10]'
```

## Running a performance test

You can get performance stats about an RPDE feed with `perfTestRpde.js`. Its interface is the same as `walkRpde.js`. e.g.:

```sh
export START_URL=<e.g. https://opensessions.io/api/rpde/session-series>
export END_URL=<e.g. http://opensessions.io/API/rpde/session-series?afterTimestamp=1537456685&afterId=2566> # Optional. If omitted, the script will just walk the RPDE feed to the very end
node perfTestRpde.js
```

This will not download the pages, but will instead walk to the end of the feed and then output stats about request times and total time taken. An example output:

```
Performance stats:

- Total time taken: 105711.00003899634
- Average request time: 600.5119533183223
- p90: 657.3589110001922
- p95: 808.9024389982224
- p99: 986.9369449988008
```

## License

Copyright © 2017 Imin Ltd.

Released under the MIT license.

