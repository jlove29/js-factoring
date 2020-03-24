
function complement(a, b) {
    if (a.indexOf(b) == 1) return true;
    if (b.indexOf(a) == 1) return true;
    return false;
}

function dc(o) {
    return JSON.parse(JSON.stringify(o));
}

function losdc(o) { // deep copy list of sets
    var newlist = [];
    for (var i = 0; i < o.length; i++) {
        var s = o[i];
        var reconstruct = new Set();
        for (var k of s) reconstruct.add(dc(k));
        newlist.push(reconstruct);
    }
    return newlist;
}

module.exports = {
    complement: complement,
    dc: dc,
    ldc: losdc
};
