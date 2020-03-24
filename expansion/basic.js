var utils = require('./utils.js');
var resolve = require('./resolve.js');
var rbases = new Set(['a', 'b', 'c', 'd', 'e']);
var bases = new Set([...rbases]);
for (var b of rbases) bases.add('x' + b);
var ractions = new Set(['i', 'j', 'k', 'l']);
var actions = new Set([...ractions]);
for (var a of ractions) actions.add('x' + a);


function getrules(R, p) {
    var rules = new Set();
    for (var i = 0; i < rs.length; i++) {
        if (rs[i][0] == p) {
            if (rs[i][1].includes(p)) rules.add(new Set(rs[i][1]));
            else {
                var newRuleA = utils.dc(rs[i][1]);
                newRuleA.push(p);
                rules.add(new Set(newRuleA));
                var newRuleB = utils.dc(rs[i][1]);
                newRuleB.push('x' + p);
                rules.add(new Set(newRuleB));
            }
        }
    }
    return rules;
}

function istype(p, t) {
    if (t == 'action') return actions.has(p);
    if (t == 'base') return bases.has(p);
    return false; // should only trigger on error
}


function negActions(A) {
    var Ap = new Set();
    for (var a of A) {
        if (a.length == 1) Ap.add('x' + a);
        if (a.length == 2) Ap.add(a.slice(1));
    }
    return Ap;
}



function run(rs, p, A) {
    var R = [];
    var rules = getrules(rs, p);
    //console.log(rules);
    for (var rule of rules) {
        //console.log("rule", rule);
        var Rp = new Set();
        var toContinue = false;
        for (var c of rule) {
            //console.log("c", c);
            if (c == p) Rp.add(c);          // c = (true p)
            else if (utils.complement(c, p)) {   // c = (not true p)
                toContinue = true;
                break;
            }
            else if (istype(c, 'base')) {        // c = (true q)
                //console.log('fail 2', c);
                toContinue = true;
                break;
            }
            else if (istype(c, 'action')) {      // c = (does i)
                if (A.has(c)) Rp.add(c);
                else {
                    //console.log('fail 3', c);
                    toContinue = true;
                    break;
                }
            }
        }
        //console.log("RP", Rp);
        if (toContinue) continue;
        //console.log("RP after", Rp);
        R.push(Rp);
    }
    //console.log(R);
    var Ap = negActions(A);
    R.push(Ap);
    //console.log(R);
    var result = resolve.resolve(R, p);
    return result;
}



var rs = [
      [ 'a', ['i'] ],           // (next a) :- (does i)
      [ 'a', ['j', 'a'] ],      // (next a) :- (does j) (true a)
      [ 'b', ['i', 'b'] ],      // (next b) :- (does i) (true b)
      [ 'b', ['j', 'xb'] ]      // (next b) :- (does j) (not true b)
    ];

var p = 'a';
var A = new Set(['i', 'j']);
var result = run(rs, p, A);
//console.log(result);
