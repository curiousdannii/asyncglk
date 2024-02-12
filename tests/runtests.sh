#!/bin/bash

cd "$(dirname "$0")"

if [ ! -f regtest.py ]; then
    wget -q https://github.com/erkyrath/plotex/raw/master/regtest.py
fi

# The default 1 second timeout is just on the threshhold of being too short, so just bump them up to a standard 10 seconds to be safe

FAILURES=0

run_test() {
    python regtest.py -i "./quixe.js --rem=1" -r -t ${2:-10} $1 || ((FAILURES++))
}

echo 'Quixe tests'
echo ' glulxercise'
run_test glulxercise.ulx.regtest
# TODO: fix save
#echo ' advent'
#run_test advent.ulx.regtest
#rm adventtest
echo 'ZVM tests'
echo ' praxix'
python regtest.py -i "./zvm.js" -t 10 praxix.z5.regtest || ((FAILURES++))
echo ' advent'
python regtest.py -i "./zvm.js --rem=1" -r -t 10 advent.z5.regtest || ((FAILURES++))
rm adventtest

echo 'Glk tests'
echo ' datetimetest'
run_test datetimetest.ulx.regtest
echo ' extbinaryfile'
run_test extbinaryfile.ulx.regtest
echo ' externalfile'
run_test externalfile.ulx.regtest
echo ' graphwintest'
# TODO: support refresh
run_test graphwintest.gblorb.regtest
echo ' imagetest'
# TODO: support refresh
run_test imagetest.gblorb.regtest
echo ' inputeventtest'
run_test inputeventtest.ulx.regtest
echo ' inputfeaturetest'
run_test inputfeaturetest.ulx.regtest
echo ' memstreamtest'
run_test memstreamtest.ulx.regtest
echo ' resstreamtest'
run_test resstreamtest.gblorb.regtest
echo ' startsavetest'
run_test startsavetest.gblorb.regtest
echo ' unicasetest'
run_test unicasetest.ulx.regtest
echo ' unicodetest'
run_test unicodetest.ulx.regtest
echo ' windowtest'
run_test windowtest.ulx.regtest

exit $FAILURES