# js-factoring

#### UPDATE (10/11): GDL-compatible version ALMOST working with reading GDL directly from file.

There is still an issue with the game grounding.

#### UPDATE: GDL-compatible version in the gdl folder. 

To run on port 9147:

    cd gdl
    node loader.js

Note: the latches.js file in the gdl folder runs the latch detection code. Call it with

    library = ... /* grounded rules of the game */
    bases = findbases(library); /* list of base propositions to evaluate */
    latches = findlatches(library, bases);


#### UPDATE: compatible with disjunctions (p V q)

To run the disjunction code:

    node disj.js

You can change the propositions in the disjunction in the variable `p` - (`p = ['a','b']` &rarr; a &#8744; b).
It also works with a single proposition in the disjunction, i.e. `p=['a']`.


------

To run basic version:

    node basic.js
    
change the rules `rs`, proposition `p`, and action set `A` in basic.js


#### Goal: check if proposition state is unchanged once set

\* Updated using the view rewritings method.

First you must expand the rules. For initial set of rules `R0` and proposition `p`:

    rules = {}
    for each rule r in R0 of the form (next p):
        if r includes (true p) or (not true p):
            add r to rules
        else:
            r1 = r + (true p)
            r2 = r + (not true p)
            add r1 and r2 to rules
    return rules

Then, for proposition `p` and set of actions `A`:

    R = []
    for each rule r of the form (next p):
        R' = {}
        for each conjunct c in r:
            if c = (true p):
                add c to R'
            if c = (not true p):
                continue to next rule r
            if c is a base proposition of the form (true q):
                add c to R'
            if c is an action in A:
                add c to R'
            if c is an action not in A:
                continue to next rule r
        add R' to R
    A' = { (not does a) for each action in A }
    Resolve R, A' to { (true p) }:
        p is inertial under A.

