
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

function parselist(l) {
    var newlist = [];
    l = l.slice(1,-1);
    l = l.split('], [');
    l[0] = l[0].slice(1);
    l[l.length-1] = l[l.length-1].slice(0,-1);
    for (var r of l) {
        var rule = r.split(', [');
        var prop = rule[0].slice(1,-1);
        rule = rule[1].slice(0,-1);
        rule = rule.replace(/\'/g, "");
        var reqs = rule.split(', ');
        var next = [prop];
        next.push(reqs);
        newlist.push(next);
    }
    return newlist;
}


module.exports = function() {
    this.complement = complement;
    this.dc = dc;
    this.ldc = losdc;
    this.parselist = parselist;
};
