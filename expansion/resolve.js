var utils = require('./utils.js')

function equal(A, B) {
    for (var a of A) {
        if (!B.has(a)) return false;
    }
    for (var b of B) {
        if (!A.has(b)) return false;
    }
    return true;
}

function contains(A, b) {
    for (var a of A) {
        if (equal(a, b)) return true;
    }
    return false;
}

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
            if (utils.complement(a, b)) {
                var newSet = new Set([...A, ...B]);
                newSet.delete(a);
                newSet.delete(b);
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
                if (!contains(A, s)) newClauses.add(s);
            }
        }
    }
    newClauses = [...newClauses];
    return newClauses;
}



function resolve(S, p) {
    var O = utils.ldc(S);
    var pA = resolvePairs(O);
    while (true) {
        /*console.log(O);
        console.log(pA);
        console.log("---");*/
        if (stopCond(pA, p)) return true;
        if (pA.length == 0) return false;
        var A = resolveOldNew(O, pA);
        var pO = utils.ldc(O);
        O = new Set(pO);
        for (var e of pA) O.add(e);
        O = [...O];
        var pA = A;
    }
}

module.exports = {
    resolve: resolve
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

var result = resolve(origClauses, p);
console.log(result);

*/
