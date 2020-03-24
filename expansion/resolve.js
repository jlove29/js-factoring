
function complement(a, b) {
    if (a.indexOf(b) == 1) return true;
    if (b.indexOf(a) == 1) return true;
    return false;
}

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


function resolve(A, B) {
    if (B.size == 0) return A;
    var oldClauses = new Set([A, B]);
    var newClauses = new Set();
    for (var a of A) {
        for (var b of B) {
            if (complement(a, b)) {
                var newSet = new Set([...A, ...B]);
                newSet.delete(a);
                newSet.delete(b);
                if (newSet.size > 0 && !contains(oldClauses, newSet)) newClauses.add(newSet);
            }
        }
    }
    return [oldClauses, newClauses];
}


var A = new Set([ 'a', 'b' ]);
var B = new Set([ 'xa' ]);

resolve(A, B);
