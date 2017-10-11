#!/usr/bin/env sh

# required commands: awk, curl, jq, tee

if [ "$#" -ne "1" ]
then
  printf 'Usage: %s <rpde-endpoint>\n' "$0"
  exit 1
fi

max=100
page=1
base=$(printf '%s' "$1" | awk -F/ '{print $1 "//" $3}')
# $1 = next url
# $2 = num items
set -- $1 -1
while [ "$2" -ne "0" ]
do
  page_padded=$(printf '%0*d\n' ${#max} $page)
  set -- $(curl -L -sS "$1" | jq '.' | tee rpde-$page_padded.json | jq -r '.next, (.items | length)')
  printf 'got page with next url: %s, num items: %s\n' "$1" $2
  case $1 in /*)
    set -- $base$1 $2
  esac
  page=$((page=page+1))
done
