//=============================================================================console.log(this.components);
// with_propnets.js//==============================================================================
//==============================================================================
require('./utils.js')();
require('./../resolve.js')();
const fs = require('fs');
// Initialization//==============================================================================
var matchid = '';
var role = '';
var library = [];
const {
    performance
} = require('perf_hooks');
var ruleslib = [];
var roles = [];
var gamestate = [];


//==============================================================================
// Toplevel//==============================================================================
function info () {return 'ready'}


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
                pos.push(['true',p]);
                rules_a.add(pos);
                var neg = JSON.parse(total);
                neg.push(['not',['true',p]]);
                rules_a.add(neg);
            }
        }
    }
    var rules = new Set();
    for (var r of rules_a) {
        var toContinue = false;
        for (var p of r) {
            if (p.indexOf('does') != -1) {
                rules.push(r);
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



function start (id,r,rs,sc,pc) {
    matchid = id;
    role = r;
    library = definemorerules(seq(),rs);
    if (library.length == 0) return;
    library = definemorerules(seq(),groundrules(library));

    /* expand bases and actions to include not true */
    var rbases = findbases(library);
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
    var negactions = new Set();
    for (var a of ractions) {
        /* TODO: fix to generalize - just meant to catch 1p games */
        if (a[1] != 'robot') a = a[1];
        actions.add(['does',a[1], a[2]]);
        stractions.add(JSON.stringify(['does',a[1],a[2]]));
        negactions.add(['not',['does',a[1],a[2]]]);
    }

    var R = [];

    for (var b of stprops) {
        console.log("PROP:", b);
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
        R.push(negactions);
        R = conv(R);
        console.log(R);
        console.log(b);
        var result = resolve(R, b, verbose=true);
        console.log(result);
        console.log('----------');
        return;
    }



    //gamestate = findinits(library);

    return; //'ready';
}

function play(id, move) {
}


function abort (id)  {return 'done'}

function stop (id,move)  {return 'done'}

function evaluate (form)
 {return eval(stripquotes(form)).toString()}



//==============================================================================
// grounder//==============================================================================


function groundrules (library) {
  var facts = compfacts(library);
  if (facts == null) return null;
  var rules = seq();
  for (var i=0; i<library.length; i++) {
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
  var bases = compbases(library);
  var inputs = compinputs(library);
  var tables = comptables(library);
  var facts = definemorerules(seq(),bases.concat(inputs));
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
