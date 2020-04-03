require('./utils.js')();
require('./resolve.js')();
const fs = require('fs');
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
                var newRuleA = dc(rs[i][1]);
                newRuleA.push(p);
                rules.add(new Set(newRuleA));
                var newRuleB = dc(rs[i][1]);
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
    for (var rule of rules) {
        var Rp = new Set();
        var toContinue = false;
        for (var c of rule) {
            if (c == p) Rp.add(c);          // c = (true p)
            else if (complement(c, p)) {   // c = (not true p)
                toContinue = true;
                break;
            }
            else if (istype(c, 'base')) {        // c = (true q)
                /*
                toContinue = true;
                break;
                */
                Rp.add(c);
            }
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
    var result = resolve(R, p);
    return result;
}


/*
var rs = [
      [ 'a', ['i'] ],           // (next a) :- (does i)
      [ 'a', ['j', 'a'] ],      // (next a) :- (does j) (true a)
      [ 'b', ['i', 'b'] ],      // (next b) :- (does i) (true b)
      [ 'b', ['j', 'xb'] ]      // (next b) :- (does j) (not true b)
    ];
*/

/* Example where p is inertial under A */
/*
var p = 'a';
var A = new Set(['i', 'j']);
*/

/* Example where p is not inertial under A */
/*
var p = 'b';
var A = new Set(['i', 'j']);
*/

/* Test example */
/*
var rs = [
    [ 'a', [ 'a', 'xb', 'xc', 'i' ] ],
    [ 'a', [ 'a', 'xb', 'c', 'i' ] ],
    [ 'a', [ 'a', 'b', 'xc', 'i' ] ]
];
var p = 'a';
var A = new Set(['i']);
*/

/* New test example */
var rs = [
    [ 'a', [ 'a', 'b', 'i' ]],
    [ 'a', [ 'a', 'xb', 'i' ]]
];
var p = 'a';
var A = new Set(['i']);


var result = run(rs, p, A);
console.log(result);


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

