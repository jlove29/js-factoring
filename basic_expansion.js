//=============================================================================console.log(this.components);
// with_propnets.js//==============================================================================
//==============================================================================
// Initialization//==============================================================================
var matchid = '';
var role = '';
var library = [];
const {
    performance
} = require('perf_hooks');
var tree;
var ruleslib = [];
var roles = [];


/* For factoring */
var seen = new Set();
var current;
var reqs = new Set();

//==============================================================================
// Toplevel//==============================================================================
function info () {return 'ready'}


function res(p, q) {
    if (p[0] == 'not' && q[0] == 'not') return false;
    if (p[0] != 'not' && q[0] != 'not') return false;
    if (p[0] == 'not') return (JSON.stringify(p[1]) == JSON.stringify(q))
    return (JSON.stringify(p) == JSON.stringify(q[1]));
}


function calcdif(c1, c2, r, p) {
    if (r[0] == 'not') r = r[1];
    r = JSON.stringify(r);
    var result = new Set();
    for (var conjunct of c1) {
        conjunct = JSON.parse(conjunct);
        if (conjunct[0] == 'not' && JSON.stringify(conjunct[1]) != r) result.add(JSON.stringify(conjunct));
        if (conjunct[0] != 'not' && JSON.stringify(conjunct) != r) result.add(JSON.stringify(conjunct));
    }
    for (var conjunct of c2) {
        conjunct = JSON.parse(conjunct);
        if (conjunct[0] == 'not' && JSON.stringify(conjunct[1]) != r) result.add(JSON.stringify(conjunct));
        if (conjunct[0] != 'not' && JSON.stringify(conjunct) != r) result.add(JSON.stringify(conjunct));
    }
    if (result.size > 1) return result;
    for (var item of result) {
        if (item[1] == p) return true;
        if (item[0] == 'not' && item[1][1] == p) return false;
    }
    return result;
}

function setequiv(A, B) {
    if (A.size !== B.size) return false;
    for (var a of A) if (!B.has(a)) return false;
    return true;
}


function resolve(R, p) {
    var newR = [];
    for (var i = 0; i < R.length; i++) {
        var clause1 = R[i];
        for (var r1 of clause1) {
            r1 = JSON.parse(r1);
            for (var j = 0; j < i; j++) {
                var clause2 = R[j];
                for (var r2 of clause2) {
                    r2 = JSON.parse(r2);
                    var resolvable = res(r1, r2);
                    if (resolvable) newR.push(calcdif(clause1, clause2, r1, p));
                }
            }
            for (var j = i+1; j < R.length; j++) {
                var clause2 = R[j];
                for (var r2 of clause2) {
                    r2 = JSON.parse(r2);
                    var resolvable = res(r1, r2);
                    if (resolvable) newR.push(calcdif(clause1, clause2, r1, p));
                }
            }
        }
    }
    newR = removeDuplicates(newR);
    for (var l of newR) {
        for (var m of l) {
            if (m == JSON.stringify(['true', p])) return true;
        }
    }
    for (var k of R) newR.push(k);
    if (newR.length == 5) resolve(newR, p);
}

function removeDuplicates(arr) {
    for (var i = 0; i < arr.length; i++) {
        for (var j = i+1; j < arr.length; j++) {
            if (setequiv(arr[i], arr[j])) arr.splice(j, 1);
        }
    }
    return arr;
}



function expand(p, lib) {
    var nexts = lib['next'];
    var toadd = [];
    for (var rule of nexts) {
        var consequent_prop = rule[1][1];
        if (consequent_prop == p) {
            candidate = true;
            for (var i = 2; i < rule.length; i++) {
                var conjunct = rule[i];
                if (conjunct[1] == p || conjunct[1][1] == p) {
                    candidate = false;
                    break;
                }
            }
            if (candidate) toadd.push(rule);
        }
    }
    for (var rule of toadd) {
        var trule = JSON.parse(JSON.stringify(rule));
        trule.push(['true',p]);
        lib.push(trule);
        lib['next'].push(trule);
        var frule = JSON.parse(JSON.stringify(rule));
        frule.push(['not',['true',p]]);
        lib.push(frule);
        lib['next'].push(frule);
        /* not necessary, but cleaner this way - remove unexpanded rule */
        for (var i = 0; i < lib.length; i++) {
            if (JSON.stringify(lib[i]) == JSON.stringify(rule)) {
                lib.splice(i, 1);
                i--;
            }
        }
        for (var j = 0; j < lib['next'].length; j++) {
            if (JSON.stringify(lib['next'][j]) == JSON.stringify(rule)) {
                lib['next'].splice(j, 1);
                j--;
            }
        }
    }
    return lib;
}

function getActions(A) {
    var actions = new Set();
    for (var a of A) actions.add(a[2]);
    return actions;
}

function generateClauses(A) {
    var actions = new Set();
    for (var a of A) actions.add(JSON.stringify(['not', a]));
    return actions;
}


function check(A, p) {
    var rules = expand(p, library);
    var Aset = getActions(A);
    var R = [];
    for (rule of rules['next']) {
        if (rule[1][1] != p) continue;
        Ri = new Set();
        var nextR = false;
        for (var j = 1; j < rule.length; j++) {
            var conjunct = rule[j];
            if (conjunct[0] == 'true' && conjunct[1] == p) Ri.add(JSON.stringify(conjunct));
            else if (conjunct[0] == 'not' && conjunct[1][1] == p) {
                nextR = true;
                break;
            }
            else if (conjunct[0] == 'true' || conjunct[0] == 'not') Ri.add(JSON.stringify(conjunct));
            else if (conjunct[0] == 'does') {
                if (Aset.has(conjunct[2])) Ri.add(JSON.stringify(conjunct));
                else {
                    nextR = true;
                    break;
                }
            }
        }
        if (!nextR) R.push(Ri);
    }
    Ai = generateClauses(A);
    R.push(Ai);
    return resolve(R, p);
}


function start (id,r,rs,sc,pc) {
    matchid = id;
    role = 'robot';
    /* MY TOY GAME */
    rs = [
      [ 'role', 'r' ],
      [ 'base', 'a' ],
      [ 'base', 'b' ],
      [ 'input', 'r', 'i' ],
      [ 'input', 'r', 'j' ],
      [ 'legal', 'r', 'i' ],
      [ 'legal', 'r', 'j' ],
      [ 'rule', [ 'next', 'a' ], [ 'does', 'r', 'i' ] ],
      [ 'rule', [ 'next', 'a' ], [ 'does', 'r', 'j' ], [ 'true', 'a' ] ],
      [ 'rule', [ 'next', 'b' ], [ 'does', 'r', 'i' ], [ 'true', 'b' ] ],
      [ 'rule', [ 'next', 'b' ], [ 'does', 'r', 'i' ], [ 'true', 'b' ] ],
      [ 'rule', [ 'next', 'b' ], [ 'does', 'r', 'j' ], [ 'not', [ 'true', 'b' ] ] ]
    ];
    role = 'r';

    library = definemorerules(seq(),rs);

    A = new Set([ [ 'does', 'r', 'i' ], [ 'does', 'r', 'j' ] ]);
    p = 'a';
    var result = check(A, p);
    console.log(result);

    return 'ready';
}

function abort (id)  {return 'done'}

function stop (id,move)  {return 'done'}

function evaluate (form)
 {return eval(stripquotes(form)).toString()}



//==============================================================================
// grounder//==============================================================================


function groundrules (library) {
  if (!usingPropnets && performance.now() > begin + scms - sbuf) return null;
  var facts = compfacts(library);
  if (facts == null) return null;
  var rules = seq();
  for (var i=0; i<library.length; i++) {
      if (!usingPropnets && performance.now() > begin + scms - sbuf) return null;
      rules = groundrule(library[i],facts,rules);
      if (rules == null) return null;
  }
  var ready = zniquify(rules);
  return ready;
}

function groundrule (rule,facts,rules) {
  if (symbolp(rule)) {rules[rules.length] = rule; return rules};
  if (rule[0]!=='rule') {rules[rules.length] = rule; return rules};
  return groundsubgoals(2,rule,nil,facts,rules)}

function groundsubgoals (n,rule,al,facts,rules) {
  if (!usingPropnets && performance.now() > begin + scms - sbuf) return null;
  if (n>=rule.length) {rules[rules.length] = plug(rule,al); return rules};
  if (!symbolp(rule[n]) && rule[n][0]==='distinct')
     {if (equalp(plug(rule[n][1],al),plug(rule[n][2],al))) {return rules};
      return groundsubgoals(n+1,rule,al,facts,rules)};
  if (!symbolp(rule[n]) && rule[n][0]==='not')
     {return groundsubgoals(n+1,rule,al,facts,rules)};
  var data = indexees(operator(rule[n]),facts);
  for (var i=0; i<data.length; i++)
      {var bl = match(rule[n],data[i],al);
       if (bl) {rules = groundsubgoals(n+1,rule,bl,facts,rules)}};
  return rules;
}

//------------------------------------------------------------------------------

function compfacts (library) {
  if (!usingPropnets && performance.now() > begin + scms - sbuf) return null;
  var bases = compbases(library);
  if (!usingPropnets && performance.now() > begin + scms - sbuf) return null;
  var inputs = compinputs(library);
  if (!usingPropnets && performance.now() > begin + scms - sbuf) return null;
  var tables = comptables(library);
  if (!usingPropnets && performance.now() > begin + scms - sbuf) return null;
  var facts = definemorerules(seq(),bases.concat(inputs));
  if (!usingPropnets && performance.now() > begin + scms - sbuf) return null;
  for (var i=0; i<tables.length; i++) {
    compview(tables[i],facts,library);
  }
  return facts;
}

function compbases (rules)
 {return basefinds(seq('true','P'),seq('base','P'),seq(),rules)}

function compinputs (rules)
 {return basefinds(seq('does','R','A'),seq('input','R','A'),seq(),rules).sort()}

function comptables (rules)
 {return ordering(dependencies(rules))}

function dependencies (rules)
 {var ds = {};
  for (var i=0; i<rules.length; i++)
      {ds = getdependencies(rules[i],ds)};
  return ds}

function getdependencies (rule,ds)
 {if (symbolp(rule)) {return setrelation(rule,ds)};
  var rel = operator(rule);
  if (rule[0]!=='rule') {return setrelation(rel,ds)};
  for (var j=2; j<rule.length; j++) {setdepends(rel,operator(rule[j]),ds)};
  return ds}

function setrelation (r,ds)
 {var dum = ds[r];
  if (dum) {return ds};
  ds[r] = seq();
  return ds}

function setdepends (r,p,ds)
 {var dum = ds[r];
  if (dum) {return adjoin(p,dum)};
  ds[r] = seq(p);
  return ds}

function ordering (ds)
 {var rs = seq('distinct','true','does');
  var flag = true;
  while (flag)
    {flag = false;
     for (r in ds)
         {if (ds[r]!==0 && subset(ds[r],rs))
             {rs[rs.length] = r; ds[r] = 0; flag = true}}};
  return rs}

//------------------------------------------------------------------------------

function compview (r,facts,library)
 {if (r==='next') {return true};
  var data = indexees(r,library);  for (var i=0; i<data.length; i++)
      {if (operator(data[i])===r) {comprule(data[i],facts)}};
  return true}

function comprule (rule,facts)
 {if (symbolp(rule)) {compsave(rule,facts); return true};
  if (rule[0]!=='rule') {compsave(rule,facts); return true};
  return compsubgoals(2,rule,nil,facts)}

function compsubgoals (n,rule,al,facts)
 {if (n>=rule.length) {compsave(plug(rulehead(rule),al),facts); return true};
  if (!symbolp(rule[n]) && rule[n][0]==='distinct')
     {if (!equalp(plug(rule[n][1],al),plug(rule[n][2],al)))
         {compsubgoals(n+1,rule,al,facts)};
      return true};
  if (!symbolp(rule[n]) && rule[n][0]==='not')
     {compsubgoals(n+1,rule,al,facts); return true};
  var data = indexees(operator(rule[n]),facts);
  for (var i=0; i<data.length; i++)
      {var bl = match(rule[n],data[i],al);
       if (bl) {compsubgoals(n+1,rule,bl,facts)}};
  return true}

function compsave (fact,facts)
 {var rel = operator(fact);
  if (find(fact,indexees(rel,facts))) {return fact};
  facts.push(fact);
  indexsymbol(rel,fact,facts);
  return fact}

function rulehead (p)
 {if (symbolp(p)) {return p};
  if (p[0]==='rule') {return p[1]};
  return p}

//==============================================================================
// legal//==============================================================================

function playlegal (id,move)
 {if (move!=='nil') {state = simulate(doesify(roles,move),state,library)};  return findlegalx(role,state,library)}

//==============================================================================
// Basics
//==============================================================================

function findroles (rules)
 {return basefinds('R',seq('role','R'),seq(),rules)}

function findbases (rules)
 {return basefinds('P',seq('base','P'),seq(),rules)}

function findinputs (role,rules)
 {return basefinds('A',seq('input',role,'A'),seq(),rules)}

function findinits (rules)
 {return basefinds(seq('true','P'),seq('init','P'),seq(),rules)}

function findlegalp (role,ply,facts,rules)
 {return groundfindp(seq('legal',role,ply),facts,rules)}

function findlegalx (role,facts,rules)
 {return groundvalue('legal',role,facts,rules)}

function findlegals (role,facts,rules)
 {return groundvalues('legal',role,facts,rules).map(x => ['does',role,x])}

function findnexts (facts,rules)
 {return truify(grounditems('next',facts,rules)).sort()}

function findterminalp (facts,rules)
 {return groundfindp('terminal',facts,rules)}

function findreward (role,facts,rules)
 {return groundvalue('goal',role,facts,rules)}

//------------------------------------------------------------------------------

function simulate (move,state,rules)
 {return findnexts(move.concat(state),rules)}

function doesify (roles,actions)
 {var exp = seq();
  for (var i=0; i<roles.length; i++)
      {exp[i] = seq('does',roles[i],actions[i])};
  return exp}

function undoesify (move)
 {var exp = seq();
  for (var i=0; i<move.length; i++)
      {exp[i] = move[i][2]};
  return exp}

function truify (state)
 {var exp = seq();
  for (var i=0; i<state.length; i++)
      {exp[i] = seq('true',state[i])};
  return exp}

function untruify (state)
 {var exp = seq();
  for (var i=0; i<state.length; i++)
      {exp[i] = state[i][1]};
  return exp}

//------------------------------------------------------------------------------
// groundfindp
//------------------------------------------------------------------------------

function groundfindp (p,facts,rules) {inferences = inferences + 1;  if (symbolp(p)) {return groundfindatom(p,facts,rules)};
  if (p[0]==='same') {return equalp(p[1],p[2])};  if (p[0]==='distinct') {return !equalp(p[1],p[2])};  if (p[0]==='not') {return !groundfindp(p[1],facts,rules)};  if (groundfindbackground(p,facts,rules)) {return true};  return groundfindrs(p,facts,rules)}

function groundcompute (rel,facts,rules)
 {var answers = seq();
  var data = facts;
  for (var i=0; i<data.length; i++)
      {if (operator(data[i])===rel) {answers.push(data[i])}};
  data = indexees(rel,rules);  for (var i=0; i<data.length; i++)
      {if (symbolp(data[i])) {if (equalp(data[i],rel)) {answers.push(rel)}}
       else if (data[i][0]!=='rule')
               {if (equalp(operator(data[i]),rel)) {answers.push(data[i])}}
       else {if (equalp(operator(data[i]),rel) &&
                 groundfindsubs(data[i],facts,rules))
                {answers.push(data[i][1])}}};
  return uniquify(answers)}

function groundfindatom (p,facts,rules) {if (p==='true') {return true};  if (p==='false') {return false};  if (groundfindbackground(p,facts,rules)) {return true};
  return groundfindrs(p,facts,rules)}

function groundfindbackground (p,facts,rules) {//var data = factindexps(p,facts);
  data = facts;
  for (var i=0; i<data.length; i++)      {if (equalp(data[i],p)) {return true}};
  return false}function groundfindrs (p,facts,rules) {var data = viewindexps(p,rules);  for (var i=0; i<data.length; i++)      {if (symbolp(data[i])) {if (equalp(data[i],p)) {return true}}
       else if (data[i][0]!=='rule') {if (equalp(data[i],p)) {return true}}
       else {if (equalp(data[i][1],p) && groundfindsubs(data[i],facts,rules))
                {return true}}};
  return false}

function groundfindsubs (rule,facts,rules)
 {for (var j=2; j<rule.length; j++)
      {if (!groundfindp(rule[j],facts,rules)) {return false}};
  return true}

function factindexps (p,theory) {if (symbolp(p)) {return indexees(p,theory)};
  var best = indexees(p[0],theory);  for (var i=1; i<p.length; i++)      {var dum = factindexps(p[i],theory);       if (dum.length<best.length) {best = dum}};  return best}

function grounditems (rel,facts,rules)
 {var answers=seq();
  var data = facts;
  for (var i=0; i<data.length; i++)
      {if (symbolp(data[i])) {continue}
       else if (data[i][0]===rel)
               {answers.push(data[i][1])}};
  data = indexees(rel,rules);  for (var i=0; i<data.length; i++)
      {if (symbolp(data[i])) {continue}
       else if (data[i][0]!=='rule')
               {if (data[i][0]===rel)
                   {answers.push(data[i][1])}}
       else {var head=data[i][1];
             if (operator(head)===rel &&
                 groundfindsubs(data[i],facts,rules))
                {answers.push(head[1])}}};
  return uniquify(answers)}

function groundvalue (rel,obj,facts,rules)
 {var data = facts;
  for (var i=0; i<data.length; i++)
      {if (symbolp(data[i])) {continue}
       else if (data[i][0]===rel && data[i][1]===obj) {return data[i][2]}};
  data = indexees(rel,rules);  for (var i=0; i<data.length; i++)
      {if (symbolp(data[i])) {continue}
       else if (data[i][0]!=='rule')
               {if (data[i][0]===rel && data[i][1]===obj) {return data[i][2]}}
       else {var head=data[i][1];
             if (operator(head)===rel && equalp(head[1],obj) &&
                 groundfindsubs(data[i],facts,rules))
                {return data[i][1][2]}}};
  return false}

function groundvalues (rel,obj,facts,rules)
 {var answers=seq();
  var data = facts;
  for (var i=0; i<data.length; i++)
      {if (symbolp(data[i])) {continue}
       else if (data[i][0]===rel && data[i][1]===obj)
               {answers.push(data[i][2])}};
  data = indexees(rel,rules);  for (var i=0; i<data.length; i++)
      {if (symbolp(data[i])) {continue}
       else if (data[i][0]!=='rule')
               {if (data[i][0]===rel && data[i][1]===obj)
                   {answers.push(data[i][2])}}
       else {var head=data[i][1];
             if (operator(head)===rel && equalp(head[1],obj) &&
                 groundfindsubs(data[i],facts,rules))
                {answers.push(head[2])}}};
  return uniquify(answers)}

//==============================================================================
// Epilog parameters
//==============================================================================
indexing = true;
dataindexing = false;
ruleindexing = true;

//==============================================================================
// End//==============================================================================
