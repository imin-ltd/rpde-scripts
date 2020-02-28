#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
# Uncomment the following line in order to debug
# set -o xtrace

# required commands: awk, curl, jq, sleep

if [ "$#" -lt "4" ] || [ "$#" -gt "5" ]
then
  printf 'Usage: %s <rpde-endpoint> <api-key> <output-filename-prefix> <request-delay-seconds> [--add-timestamp]\n' "$0"
  exit 1
fi

page=1
base=$(printf '%s' "$1" | awk -F/ '{print $1 "//" $3}')

last_next_url=
next_url="$1"
api_key="$2"
prefix="$3"
request_delay_seconds="$4"
add_timestamp_flag=""
if [ "$#" == "5" ]
  then
    add_timestamp_flag="$5"
fi
num_items=-1

index_filename="${prefix}index.csv"

echo "Filenames" > "${index_filename}"

# Stop paging if the "next" url is the same as in the last page. This is the end of the feed as defined by RPDE
while [ "${next_url}" != "${last_next_url}" ]
do
  last_next_url="${next_url}"
  # Download the page
  page_json=$(curl -L -sS "${next_url}" --header "X-API-KEY: ${api_key}")
  # Split the page into files - one file for each item
  for i in $(echo ${page_json} | jq --raw-output '(.items | keys)[]'); do
    filename="${prefix}rpde-${page}-${i}.json"
    item_json=$(echo ${page_json} | jq ".items[${i}]")
    if [ "${add_timestamp_flag}" == "--add-timestamp" ]
      then
        printf "HEYHEY\n\n"
        item_json=$(echo ${item_json} | jq ". + {\"_timestamp\": $(date +%s)}")
    fi
    # echo ${page_json} | jq ".items[${i}]" > "${filename}"
    echo "${item_json}" > "${filename}"
    echo "${filename}" >> "${index_filename}"
  done
  # Get meta information from the page
  next_url="$(echo "${page_json}" | jq -r '.next')"
  num_items="$(echo "${page_json}" | jq -r '.items | length')"
  printf 'got page: %s, with next url: %s, num items: %s\n' "${page}" "${next_url}" "${num_items}"
  # If "next" URL isn't an absolute URL, like /rpde?afterTimestamp=123&afterId=abc, prepend the base URL to it to create an absolute URL
  case ${next_url} in /*)
    next_url="${base}${next_url}"
  esac
  page=$((page=page+1))
  # Wait for a bit between requests in case there is a rate limit
  if [ "${next_url}" != "${last_next_url}" ]
    then
      sleep "${request_delay_seconds}"
  fi
done
