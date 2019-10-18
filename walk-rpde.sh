#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
# Uncomment the following line in order to debug
# set -o xtrace

# required commands: awk, curl, jq, tee

if [ "$#" -lt "2" -o "$#" -gt "3" ]
then
  printf 'Usage: %s <${prefix}rpde-endpoint> <output-filename-prefix> [-s]\n' "$0"
  printf '\n'
  printf ' -s  Squashes all pages into a single page, "{prefix}-rpde.json"\n'
  exit 1
fi

single_file="${3:-}"
max=1000
page=1
base=$(printf '%s' "$1" | awk -F/ '{print $1 "//" $3}')

last_next_url=
next_url="$1"
prefix="$2"
num_items=-1

echo "Filenames" > index.csv

# Stop paging if the "next" url is the same as in the last page. This is the end of the feed as defined by RPDE
while [ "${next_url}" != "${last_next_url}" ]
do
  page_padded=$(printf '%0*d\n' ${#max} ${page})
  last_next_url="${next_url}"
  # Results of $() statement are stored in next_url & num_items
  read -r next_url num_items <<< $(curl -L -sS "${next_url}" | jq '.' | tee "${prefix}rpde-${page_padded}.json" | jq -r '.next, (.items | length)')
  echo "${prefix}rpde-${page_padded}.json" >> index.csv
  printf 'got page: %s, with next url: %s, num items: %s\n' "${page}" "${next_url}" "${num_items}"
  # If "next" URL isn't an absolute URL, like /rpde?afterTimestamp=123&afterId=abc, prepend the base URL to it to create an absolute URL
  case ${next_url} in /*)
    next_url="${base}${next_url}"
  esac
  page=$((page=page+1))
done

if [ "${single_file}" == "-s" ]
then
  jq -s '[.[].items[]]' ${prefix}rpde-*.json > ${prefix}rpde.json
  rm -rf ${prefix}rpde-*.json
  rm index.csv
fi
