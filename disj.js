require('./utils.js')();
require('./resolve.js')();
const fs = require('fs');
var rbases = new Set(['a', 'b', 'c', 'd', 'e']);
var bases = new Set([...rbases]);
for (var b of rbases) bases.add('x' + b);
var ractions = new Set(['i', 'j', 'k', 'l']);
var actions = new Set([...ractions]);
for (var a of ractions) actions.add('x' + a);


function getrules(R, pl) {
    var Rp = R;
    for (var p of pl) {
        var rules = [];
        for (var i = 0; i < Rp.length; i++) {
            if (pl.indexOf(Rp[i][0]) != -1) {
                if (Rp[i][1].includes(p)) rules.push(Rp[i]);
                else if (Rp[i][1].includes('x'+p)) rules.push(Rp[i]);
                else {
                    var newRuleA = dc(Rp[i]);
                    newRuleA[1].push(p);
                    rules.push(newRuleA);
                    var newRuleB = dc(Rp[i]);
                    newRuleB[1].push('x' + p);
                    rules.push(newRuleB);
                }
            }
        }
        Rp = rules;
    }
    rules = new Set();
    for (var r of Rp) rules.add(r[1])
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
    for (var rule of rules) {
        var Rp = new Set();
        var toContinue = false;
        for (var c of rule) {
            /* no longer need this
            if (p.indexOf(c) != -1) Rp.add(c);
            else if (complement(c, p)) {
                toContinue = true;
                break;
            }*/
            if (istype(c, 'base')) Rp.add(c);
            else if (istype(c, 'action')) {      // c = (does i)
                if (A.has(c)) Rp.add(c);
                else {
                    toContinue = true;
                    break;
                }
            }
        }
        if (toContinue) continue;
        R.push(Rp);
    }
    var Ap = negActions(A);
    R.push(Ap);
    for (var c of p) {
        var result = resolve(R, c);
        if (!result) return false;
    }
    return true;
}


/* Dealing with pVq */
var rs = [
    [ 'a', ['b', 'xa', 'i'] ],
    [ 'b', ['a', 'xb', 'i'] ],
    [ 'a', ['j'] ],
    [ 'b', ['b', 'j'] ],
    [ 'a', ['b', 'a', 'i'] ],
    [ 'b', ['b', 'a', 'i'] ],
];
var p = ['a', 'b'];
var A = new Set(['i', 'j']);


console.log('Rules:', rs);
console.log('p:', p);
console.log('A:', A);


var result = run(rs, p, A);
console.log(result);







/* ------- For running testing code only ------- */

/*

// get rules
var rs = process.argv[2];
var p;
if (rs.length > 2) {
    rs = parserules(rs);
    p = rs[0][0];
} else {
    rs = [];
    p = 'a';
};

// get A
var A = process.argv[3];
A = parseactions(A, [...ractions]);

// is it a latch?
var result = run(rs, p, A);
result = (result == false) ? '0' : '1';

// true value
var islatch = process.argv[4];

// do they match
var match = (islatch == result) ? '1\n' : '0\n';

fs.appendFile('out.txt', match, (err) => {});

*/

