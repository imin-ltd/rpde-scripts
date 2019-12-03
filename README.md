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

#### Some other example queries:

_How many items in the feed have state: 'updated'_:

```sh
cat rpde-*.json | jq -s '[.[].items[] | select(.state == "updated")] | length'
```


## License

Copyright © 2017 Imin Ltd.

Released under the MIT license.

