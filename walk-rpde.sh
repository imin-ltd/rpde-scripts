#!/usr/bin/env sh

# required commands: awk, curl, jq, tee

if [ "$#" -lt "1" -o "$#" -gt "3" ]
then
  printf 'Usage: %s <rpde-endpoint> [-s] [-u]\n' "$0"
  exit 1
fi

single_file=$2
only_updated=$3
max=100
page=1
base=$(printf '%s' "$1" | awk -F/ '{print $1 "//" $3}')

if [ "$only_updated" != "" ]
then
  jq_program='.items |= map(select(.state == "updated"))'
else
  jq_program='.'
fi

# $1 = next url
# $2 = num items
set -- $1 -1
while [ "$2" -ne "0" ]
do
  page_padded=$(printf '%0*d\n' ${#max} $page)
  set -- $(curl -L -sS "$1" | jq "$jq_program" | tee rpde-$page_padded.json | jq -r '.next, (.items | length)')
  printf 'got page with next url: %s, num items: %s\n' "$1" $2
  case $1 in /*)
    set -- $base$1 $2
  esac
  page=$((page=page+1))
done

if [ "$single_file" != "" ]
then
  jq -s '[.[].items[]]' rpde-*.json > rpde.json
  rm -rf rpde-*.json
fi
