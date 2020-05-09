

function negate(rule) {
    var neg = new Set();
    for (var conj of rule) {
        if (conj[0] == 'x') neg.add(conj.slice(1));
        if (conj[0] != 'x') neg.add('x' + conj);
    }
    return neg;
}


function dist1(l) {
    var todist = l[0];
    var rest = l.slice(1);
    for (var elem in rest) {
        
    }
}


function distribute(rules) {
    var negs = [];
    for (var rule of rules) negs.push(negate(rule));
    while (negs.length > 1) {
        negs = dist1(negs);
        break;
    }
}


var rules = [
    new Set([ 'a', 'b' ]),
    new Set([ 'xa', 'b' ]),
];


distribute(rules);
