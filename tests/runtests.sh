#!/bin/sh

cd "$(dirname "$0")"

if [ ! -f regtest.py ]; then
    wget -q https://github.com/erkyrath/plotex/raw/master/regtest.py
fi

# The default 1 second timeout is just on the threshhold of being too short, so just bump them up to a standard 10 seconds to be safe

echo 'Quixe'
python regtest.py -i "./quixe.js" -t 10 glulxercise.ulx.regtest
echo 'ZVM'
python regtest.py -i "./zvm.js" -t 10 praxix.z5.regtest
python regtest.py -i "./zvm.js --rem=1" -r -t 10 advent.z5.regtest
rm adventtest

echo 'Glk tests'
echo ' datetimetest'
python regtest.py -i "./quixe.js --rem=1" -t 10 datetimetest.ulx.regtest
echo ' extbinaryfile'
python regtest.py -i "./quixe.js --rem=1" -t 10 extbinaryfile.ulx.regtest
echo ' externalfile'
python regtest.py -i "./quixe.js --rem=1" -t 10 externalfile.ulx.regtest
echo ' graphwintest'
python regtest.py -i "./quixe.js --rem=1" -t 10 graphwintest.gblorb.regtest
echo ' imagetest'
python regtest.py -i "./quixe.js --rem=1" -t 10 imagetest.gblorb.regtest
echo ' inputeventtest'
python regtest.py -i "./quixe.js --rem=1" -t 10 inputeventtest.ulx.regtest