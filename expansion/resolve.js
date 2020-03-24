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
        if (s.size == 1 && s.has('p')) return true;
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
    var A1 = resolvePairs(S);
    if (stopCond(A1, p)) return true;
    var O = S;
    var A2 = resolveOldNew(O, A1);
    var O1 = [...new Set([...O, A1])];
    while (true) {
        if (stopCond(A2, p)) return true;
        if (A2.length == 0) return false;
        A3 = resolveOldNew(O1, A2);
        O2 = [...new Set([...O1, ...A2])];
        return;
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
*/

var A = new Set([ 'a', 'b' ]);
var B = new Set([ 'xa', 'xb' ]);
var origClauses = [A, B];

var result = resolve(origClauses);
console.log(result);

