
function complement(a, b) {
    if (a.indexOf(b) != -1) return true;
    if (b.indexOf(a) != -1) return true;
    return false;
}

function convert(R) {
    var rs = [];
    for (var s of R) {
        var pSet = new Set();
        for (var rule of s) {
            var strrule = '';
            if (rule[0] == 'not') {
                strrule += '!';
                rule = rule[1];
            }
            if (rule[0] == 'does') strrule += JSON.stringify(rule.slice(1));
            if (rule[0] == 'true') strrule += rule[1];
            pSet.add(strrule);
        }
        rs.push(pSet);
    }
    return rs;
}

function distinct(c) { return (c[0] == 'distinct' && c[1] != c[2]); }



module.exports = function () {
    this.comp = complement;
    this.conv = convert;
    this.dist = distinct;
};
