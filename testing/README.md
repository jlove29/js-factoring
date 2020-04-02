# testing pipeline


    python worldgen/worldgen.py
    python runtests.py
    python analyze.py


Generate possible inputs with `worldgen` - change parameters in that file

Compare output of algorithm with exhaustive search using `runtests` - assumes you have used `worldgen` to generate a `rules.csv` file

Filter to mismatches between two methods using `analyze`
