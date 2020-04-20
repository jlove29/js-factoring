//=============================================================================console.log(this.components);
// with_propnets.js//==============================================================================
//==============================================================================
// Initialization//==============================================================================
var matchid = '';
var role = '';
var library = [];

//==============================================================================
// Toplevel//==============================================================================
function info () {return 'ready'}




/* PLAYER CODE implementing basic MCTS utilizing PropNet-based functions */

function start (id,r,rs,sc,pc) {
    console.log('Starting program.');
    matchid = id;
    rs = rs;
    /* Grounding */
    library = definemorerules(seq(),rs);
    var library = definemorerules(seq(),groundrules(library));
    console.log('Grounded rules.');

    /* Game info */
    role = r;
    roles = findroles(library);
    gamestate = findinits(library);

    return 'ready';
}

function play(id, move) {
    if (!usingPropnets) return regularplay(move);
    propnet.clear();
    var currentstate = propnext(move, gamestate, propnet);
    gamestate = currentstate;
    var legals = proplegals(role, gamestate, propnet);
    if (legals.length == 1) return legals[0];

    /* for MCTS */
    chargesrun = 0;
    var root = new Node(currentstate, null, null);
    var action = bestmove(root, role, currentstate);
    return action;
}

function bestmove(root, role, state) {
    begin = performance.now();
    while (performance.now() < begin + pcms - buf) {
        var selected = select(root);
        var score;
        if (isterminal(selected.state, propnet)) {
            score = getreward(role, selected.state, propnet);
        } else {
            expand(selected, role);
            score = runcharges(role, selected.state);
        }
        backpropagate(selected, score);
    }
    var bestaction;
    var bestscore = -1;
    var visits = 0; // for printing only
    for (var c = 0; c < root.children.length; c++) {
        var opt = root.children[c];
        if (opt.utility > bestscore) {
            bestscore = opt.utility;
            bestaction = opt.action[roles.indexOf(role)];
            visits = opt.visits;
        }
    }
    console.log("Expected Utility: ", bestscore/visits);
    console.log("Charges run: ", chargesrun);
    return bestaction;
}

function select(root) {
    if (root.visits == 0 || isterminal(root.state, propnet)) return root;
    for (var i = 0; i < root.children.length; i++) {
        if (root.children[i].visits == 0) return root.children[i];
    }
    var score = 0;
    var result = null;
    for (var j = 0; j < root.children.length; j++) {
        var newscore = selectfn(root.children[j]);
        if (newscore > score) {
            score = newscore;
            result = root.children[j];
        }
    }
    return select(result);
}
function selectfn(node) {
    return node.utility / node.visits + Math.sqrt(C * Math.log(node.parent.visits) / node.visits);
}
function expand(node, role) {
    var actions = proplegals(role, node.state, propnet);
    for (var i = 0; i < actions.length; i++) {
        var jointActions = groupresponses(role, node.state, actions[i], propnet);
        for (var j = 0; j < jointActions.length; j++) {
            var newstate = propnext(jointActions[j], node.state, propnet);
            var newnode = new Node(newstate, node, jointActions[j]);
            node.children.push(newnode);
        }
    }
}
function runcharges(role, state) {
    var total = 0;
    for (var i = 0; i < numcharges; i++) {
        total += depthcharge(role, state);
    }
    return total/numcharges;
}
function depthcharge(role, state) {
    if (isterminal(state, propnet)) {
        chargesrun += 1;
        return getreward(role, state, propnet);
    }
    /* if time is up, return */
    var moves = groupactions(state, propnet);
    var randommove = moves[Math.floor(Math.random() * moves.length)];
    var newstate = propnext(randommove, state, propnet);
    return depthcharge(role, newstate);
}
function backpropagate(node, score) {
    node.visits += 1;
    node.utility += parseFloat(score);
    if (node.parent) {
        backpropagate(node.parent, parseFloat(score));
    }
}

class Node {
    constructor(state, parent, action) {
        this.state = state;
        this.parent = parent;
        this.action = action;
        this.children = [];
        this.utility = 0;
        this.visits = 0;
        /* cache here? */
    }
}





/* This is mostly duplicated code that runs basic MCTS if you cannot ground the game in time
 * It relies on additional methods in the epilog.js file */
function regularplay(move) {
    if (move != 'nil') gamestate = regsimulate(doesify(roles, move), gamestate, library);
    var legals = findreglegals(role, gamestate, library);
    if (legals.length == 1) return legals[0][2];
    chargesrun = 0;
    var root = new Node(JSON.parse(JSON.stringify(gamestate)), null, null);
    var begin = performance.now();
    var action = regularbestmove(root, role, gamestate);
    return action;
}
function regularbestmove(root, role, state) {
    begin = performance.now();
    while (performance.now() < begin + pcms - buf) {
        var selected = regularselect(root);
        var score;
        if (findregterminal(state, library)) { score = findregreward(role, state, library); }
        else {
            regularexpand(selected, role);
            score = regularruncharges(role, selected.state);
        }
        backpropagate(selected, score); //here
    }
    var bestaction;
    var bestscore = -1;
    var visits = 0; // for printing only
    for (var c = 0; c < root.children.length; c++) {
        var opt = root.children[c];
        if (opt.utility > bestscore) {
            bestscore = opt.utility;
            bestaction = opt.action[roles.indexOf(role)];
            visits = opt.visits;
        }
    }
    console.log("Expected Utility: ", bestscore/visits);
    console.log("Charges run: ", chargesrun);
    return bestaction[2];
}
function regularruncharges(role,state) {
    var total = 0;
    for (var i = 0; i < numcharges; i++) total += regulardepthcharge(role, state);
    return total/numcharges;
}
function regulardepthcharge(role, state) {
    if (findregterminal(state, library)) {
        chargesrun += 1;
        return findregreward(role, state, library);
    }
    var moves = groupactions(state, propnet);
    var randommove = moves[Math.floor(Math.random() * moves.length)];
    var newstate = regsimulate(randommove, state, library);
    return regulardepthcharge(role, newstate);
}
function regularexpand(node, role) {
    var actions = findreglegals(role, node.state, library);
    for (var i = 0; i < actions.length; i++) {
        var jointActions = groupresponses(role, node.state, actions[i], propnet);
        for (var j = 0; j < jointActions.length; j++) {
            var newstate = regsimulate(jointActions[j], node.state, library);
            var newnode = new Node(newstate, node, jointActions[j]);
            node.children.push(newnode);
        }
    }
}
function regularselect(root) {
    if (root.visits == 0 || findregterminal(root.state, library)) return root;
    for (var i = 0; i < root.children.length; i++) { if (root.children[i].visits == 0) return root.children[i]; }
    var score = 0;
    var result = null;
    for (var j = 0; j < root.children.length; j++) {
        var newscore = selectfn(root.children[j]);
        if (newscore > score) {
            score = newscore;
            result = root.children[j];
        }
    }
    return regularselect(result);
}
function regsimulate (move,state,rules) {return regfindnexts(move.concat(state),rules)}
function regfindnexts (facts,rules) {return regbasefinds(seq('true','P'),seq('next','P'),facts,rules).sort()}
function findreglegals(r,s,l) {return regbasefinds(seq('does',r,'X'),seq('legal',r,'X'),s,l)}
function findregterminal(s,l) { return regbasefindp('terminal',s,l); }
function findregreward(r,s,l) { return basefindx('R',seq('goal',r,'R'),s,l); }


/* A legal player using PropNet */
function legalplay (id,move) {
    propnet.clear();
    var nextstate = propnext(move, gamestate, propnet);
    gamestate = nextstate;
    var actions = proplegals(role, gamestate, propnet);
    var legal = actions[0];
    return legal;
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
