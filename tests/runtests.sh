#!/bin/sh

cd "$(dirname "$0")"

if [ ! -f regtest.py ]; then
    wget https://github.com/erkyrath/plotex/raw/master/regtest.py
fi

echo 'ZVM'
python regtest.py -i "./zvm.js" praxix.z5.regtest
echo 'ZVM in RemGlk mode'
python regtest.py -i "./zvm.js --rem=1" -r praxix.z5.regtest
python regtest.py -i "./zvm.js --rem=1" -r -t 10 advent.z5.regtest
rm adventtest