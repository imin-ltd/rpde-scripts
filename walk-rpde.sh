#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
# set -o xtrace

# required commands: awk, curl, jq, tee

if [ "$#" -lt "1" -o "$#" -gt "2" ]
then
  printf 'Usage: %s <rpde-endpoint> [-s]\n' "$0"
  exit 1
fi

single_file=$2
max=100
page=1
base=$(printf '%s' "$1" | awk -F/ '{print $1 "//" $3}')

last_next_url=
next_url="$1"
num_items=-1

while [ "${next_url}" != "${last_next_url}" ]
do
  page_padded=$(printf '%0*d\n' ${#max} ${page})
  read -r next_url num_items <<< $(curl -L -sS "${next_url}" | jq '.' | tee "rpde-${page_padded}.json" | jq -r '.next, (.items | length)')
  printf 'got page: %s, with next url: %s, num items: %s\n' "${page}" "${next_url}" "${num_items}"
  case ${next_url} in /*)
    next_url="${base}${next_url}"
  esac
  page=$((page=page+1))
done

if [ "${single_file}" != "" ]
then
  jq -s '[.[].items[]]' rpde-*.json > rpde.json
  rm -rf rpde-*.json
fi
