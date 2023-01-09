#!/bin/sh

cd "$(dirname "$0")"

if [ ! -f regtest.py ]; then
    wget -q https://github.com/erkyrath/plotex/raw/master/regtest.py
fi

echo 'Quixe'
python regtest.py -i "./quixe.js" -t 10 glulxercise.ulx.regtest
echo 'ZVM'
python regtest.py -i "./zvm.js" praxix.z5.regtest
python regtest.py -i "./zvm.js --rem=1" -r -t 10 advent.z5.regtest
rm adventtest
echo 'Glk tests'
echo ' datetimetest'
python regtest.py -i "./quixe.js --rem=1" datetimetest.ulx.regtest
echo ' extbinaryfile'
python regtest.py -i "./quixe.js --rem=1" extbinaryfile.ulx.regtest
echo ' externalfile'
python regtest.py -i "./quixe.js --rem=1" externalfile.ulx.regtest