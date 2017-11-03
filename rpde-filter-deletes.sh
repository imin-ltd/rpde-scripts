#!/usr/bin/env sh

# required commands: jq

jq 'group_by(.id) | map(select(.[-1].state == "updated")) | flatten(1)' rpde-walk.json > rpde-filter-deletes.json
