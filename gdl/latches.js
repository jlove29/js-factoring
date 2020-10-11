const fs = require('fs');


function exprules(rs,p,actions) {
    var rules_a = new Set();
    for (var r of rs) {
        var head = r[1][1];
        if (JSON.stringify(head) == p) {
            var body = r.slice(2);
            var strrules = [];
            for (var i of body) strrules.push(JSON.stringify(i));
            if (strrules.indexOf(JSON.stringify(['true',JSON.parse(p)])) != -1 ||
                strrules.indexOf(JSON.stringify(['not',['true',JSON.parse(p)]])) != -1) {
                rules_a.add(new Set(body));
            } else {
                var total = JSON.stringify(body);
                var pos = JSON.parse(total);
                pos.push(['true',JSON.parse(p)]);
                rules_a.add(pos);
                var neg = JSON.parse(total);
                neg.push(['not',['true',JSON.parse(p)]]);
                rules_a.add(neg);
            }
        }
    }
    var rules = new Set();
    for (var r of rules_a) {
        var toContinue = false;
        for (var p of r) {
            if (p.indexOf('does') != -1) {
                rules.add(r);
                toContinue = true;
                break;
            }
        }
        if (toContinue) continue;
        for (var a of actions) {
            var aSet = new Set([...r]);
            aSet.add(a);
            rules.add(aSet);
        }
    }
    return rules;
}

function run(library, rbases) {
    var stprops = [];
    var bases = new Set();
    var strbases = new Set();
    for (var b of rbases) {
        stprops.push(JSON.stringify(b));
        var posrule = ['true', b];
        var negrule = ['not', ['true', b]];
        bases.add(posrule);
        bases.add(negrule);
        strbases.add(JSON.stringify(posrule));
        strbases.add(JSON.stringify(negrule));
    }
    var ractions = library['legal'];
    var actions = new Set();
    var stractions = new Set();
    var negactions = [];
    for (var a of ractions) {
        /* TODO: fix to generalize - just meant to catch 1p games */
        if (a[1] != 'robot') a = a[1];
        actions.add(['does',a[1], a[2]]);
        stractions.add(JSON.stringify(['does',a[1],a[2]]));
        negactions.push(new Set(['not',['does',a[1],a[2]]]));
    }

    console.log('finding latches...');
    console.log('----------');
    var latches = [];
    for (var b of stprops) {
        var R = [];
        var strb = JSON.stringify(['true',JSON.parse(b)]);
        var rules = exprules(library['next'],b,actions);
        for (var rule of rules) {
            var Rp = new Set();
            var toContinue = false;
            for (var c of rule) {
                var strc = JSON.stringify(c);
                if (strc == strb) { Rp.add(c); }
                else if (comp(strc,strb)) { toContinue = true; break; }
                else if (strbases.has(strc)) { Rp.add(c); }
                else if (dist(c)) {}
                else {
                    if (stractions.has(strc)) { Rp.add(c); }
                    else { toContinue = true; break; }
                }
            }
            if (toContinue) continue;
            R.push(Rp);
        }
        R = R.concat(negactions);
        R = conv(R);
        b = convp(b);
        var result = resolve(R, b, verbose=true);
        if (result) latches.push(b);
        console.log(result);
        console.log('----------');
    }
    return latches;
}

module.exports = function () {
    this.findlatches = run;
};




