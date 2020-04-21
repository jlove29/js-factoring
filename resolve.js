require('./utils.js')();

function stopCond(S, p) {
    for (var s of S) {
        if (s.size == 1 && s.has(p)) return true;
    }
    return false;
}


function resolve2(A, B) {
    if (B.size == 0) return A;
    var oldClauses = new Set([A, B]);
    var newClauses = new Set();
    for (var a of A) {
        for (var b of B) {
            if (complement(a, b)) {
                var newA = new Set([...A]);
                newA.delete(a);
                var newB = new Set([...B]);
                newB.delete(b);
                var newSet = new Set([...newA, ...newB]);
                if (newSet.size > 0 && !contains(oldClauses, newSet)) newClauses.add(newSet);
            }
        }
    }
    return newClauses;
}

function resolvePairs(S) {
    var newClauses = new Set();
    for (var i = 0; i < S.length; i++) {
        for (var j = i+1; j < S.length; j++) {
            var newSet = resolve2(S[i], S[j]);
            for (var s of newSet) {
                newClauses.add(s);
            }
        }
    }
    newClauses = [...newClauses];
    return newClauses;
}

function resolveOldNew(A, B) {
    var newClauses = new Set();
    for (var a of A) {
        for (var b of B) {
            var newSet = resolve2(a, b);
            for (var s of newSet) {
                if (!contains(newClauses, s)) {
                    if (!contains(A, s)) newClauses.add(s);
                }
            }
        }
    }
    newClauses = [...newClauses];
    return newClauses;
}



function resolve(S, p, verbose=false) {
    var O = ldc(S);
    var pA = resolvePairs(O);
    //console.log(pA);
    var layer = 0;
    while (true) {
        /*
        console.log("O", O);
        console.log("P", pA);
        console.log("---");
        */
        if (stopCond(pA, p)) return true;
        if (pA.length == 0) return false;
        var A = resolveOldNew(O, pA);
        var pO = ldc(O);
        O = new Set(pO);
        for (var e of pA) {
            if (!contains(O, e)) O.add(e);
        }
        O = [...O];
        layer += 1;
        if (verbose) console.log("Layer", layer, "size", O.length);
        var pA = A;
    }
}

module.exports = function() {
    this.resolve = resolve;
};

/*
var A = new Set([ 'a', 'b', 'c' ]);
var B = new Set([ 'xa', 'xb' ]);
var C = new Set([ 'xc' ]);
var origClauses = [A, B, C];

var A = new Set([ 'a', 'b' ]);
var B = new Set([ 'xa', 'xb' ]);
var origClauses = [A, B];
var p = 'a';
*/

/*
var origClauses = [
    new Set ([ 'a', 'xb', 'xc', 'i' ]),
    new Set ([ 'a', 'xb', 'c', 'i' ]),
    new Set ([ 'a', 'b', 'xc', 'i' ]),
    new Set ([ 'xi' ])
];
*/
var origClauses = [
    new Set ([ 'a', 'xb', 'c', 'i' ]),
    new Set ([ 'a', 'xb', 'i', 'b' ])
];
var p = 'a';

var result = resolve(origClauses, p);

