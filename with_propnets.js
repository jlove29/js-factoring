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
var gamestate = [];


/* For factoring */
var seen = new Set();
var current;
var reqs = new Set();

//==============================================================================
// Toplevel//==============================================================================
function info () {return 'ready'}



/* PROPNET CODE */

var propnet;

/* Methods for marking the PropNet */

/* Mark base propositions according to state */
function markbases(state, propnet) {
    if (propnet.roles.length == 0) return;
    var stateset = new Set();
    for (var j = 0; j < state.length; j++) stateset.add(JSON.stringify(state[j]));
    for (var b of propnet.bases) {
        var name = b.name;
        var prop = propnet.props.get(name);
        prop.value = (stateset.has(name));
    }
}
/* Mark input propositions according to actions */
function markactions(actions, propnet) {
    if (propnet.roles.length == 0) return;
    if (actions == 'nil') return;
    var actionset = new Set();
    for (var j = 0; j < actions.length; j++) actionset.add(JSON.stringify(todoes(actions[j], j)));
    for (var p of propnet.props.keys()) {
        if (JSON.parse(p)[0] != 'does') continue;
        propnet.props.get(p).value = (actionset.has(p));
    }
}
/* Helper method for converting action, role index to ['does', role, [...action...]] */
function todoes(action, i) {
    var newaction = ['does', roles[i]];
    newaction.push(action);
    return newaction;
}


/* Methods for reading PropNet */
function propmarkp(p) {
    if (p.type == 'const') return true;
    if (p.type == 'base') return p.value;
    if (p.type == 'input') return p.value;
    if (p.type == 'view') return propmarkp(p.getsingleinput());
    if (p.type == 'not') return propmarknot(p.getsingleinput());
    if (p.type == 'and') return propmarkand(p);
    if (p.type == 'or') return propmarkor(p);
}
function propmarknot(p) {
    if (propmarkp(p)) return false;
    return true;
}
function propmarkand(p) {
    for (var src of p.inputs) if (!propmarkp(src)) return false;
    return true;
}
function propmarkor(p) {
    for (var src of p.inputs) if (propmarkp(src)) return true;
    return false;
}


/* Methods for using in a player that utilize an initialized and set-up PropNet */

/* Finds legal moves for role in state
 * equivalent to findlegals(role, state, library) */
function proplegals(role, state, propnet) {
    markbases(state, propnet);
    var roles = propnet.roles;
    var legals = propnet.legals.get(role);
    /* Compile list of propositions representing possible actions */
    var actions = [];
    for (var j of legals) {
        var prop = propnet.props.get(JSON.stringify(j));
        if (propmarkp(prop)) actions.push(j);
    }
    /* Derive list of possible moves that can be sent to game manager */
    var moves = [];
    for (var a = 0; a < actions.length; a++) moves.push(actions[a][2]);
    return moves;
}
/* Simulates next state given move and current state
 * equivalent to simulate(state, action, library) */
function propnext(move, state, propnet) {
    if (move == 'nil') return state;
    /* Mark bases and actions according to state and move */
    markactions(move, propnet);
    markbases(state, propnet);
    var bases = propnet.bases;
    var nexts = [];
    /* Compile list of propositions that are true given marked bases and actions */
    for (var b of bases) {
        if (b.inputs.size == 0 && propmarkp(b)) { nexts.push(JSON.parse(b.name)); }
        else if (propmarkp(b.getsingleinput())) { nexts.push(JSON.parse(b.name)); }
    }
    return nexts;
}
/* Returns true if state is terminal.
 * equivalent to findterminalp(state, library) */
function isterminal(state, propnet) {
    markbases(state, propnet);
    var terminals = [];
    var input = propnet.terminals;
    for (var p of input) {
        if (propmarkp(p.getsingleinput())) return true;
    }
    return false;
}
/* Returns reward for role in state.
 * equivalent to findreward(role, state, library) */
function getreward(role, state, propnet) {
    markbases(state, propnet);
    var goals = propnet.goals.get(role);
    for (var g of goals) {
        var input = g.getsingleinput();
        if (propmarkp(input)) {
            return JSON.parse(g.name)[JSON.parse(g.name).length - 1];
        }
    }
}
/* Compiles list of all possible actions in the state across all roles. */
function groupactions(state, propnet) {
    var apartActions = [];
    /* Find actions for each role individually */
    for (var r = 0; r < roles.length; r++) {
        var individualActions;
        if (usingPropnets) { individualActions = proplegals(roles[r], state, propnet); }
        else { individualActions = findreglegals(roles[r], state, library); }
        for (var i = 0; i < individualActions.length; i++) {
            individualActions[i] = [individualActions[i]];
        }
        apartActions.push(individualActions);
    }
    /* Get all possible combinations of those actions */
    var crossproduct = cartesianProduct(apartActions);
    return crossproduct;
}
/* Compiles list of possible actions in state across all roles assuming that role will take
 * action */
function groupresponses(role, state, action, propnet) {
    var relevant = [];
    var roleindex = roles.indexOf(role);
    /* Compile list of all possible moves */
    var allactions = groupactions(state, propnet);
    /* Only get moves where role takes action */
    for (var a = 0; a < allactions.length; a++) {
        if (JSON.stringify(allactions[a][roleindex]) == JSON.stringify(action)) {
            relevant.push(allactions[a]);
        }
    }
    return relevant;
}


/* PropNet class */
class PropNet {
    constructor() {}
    setup() {
        this.roles = findroles(library);
        var rules = compfacts(library);
        if (rules.length == 0) return;

        /* Save components, propositions for later access */
        this.comps = new Set();
        this.props = new Map();
        this.nots = new Set();

        /* Construct propositions from rule set */
        this.constants = this.calcConstants(library);
        this.legals = this.calcLegals(rules.legal);
        this.inits = this.calcInits(rules.init);
        this.inputs = this.calcInputs(rules.input);
        this.bases = this.calcBases(rules.base);
        this.views = new Set();
        this.calcViews(library);
        this.terminals = this.calcTerminals();
        this.goals = this.calcGoals();
        this.calcOrs();
    }
    /* Compiles set of constants, with value = true */
    calcConstants(raw) {
        var constants = new Set();
        for (var i = 0; i < raw.length; i++) {
            var head = raw[i][0];
            if (head == 'role' || head == 'rule') continue;
            var rule = raw[i];
            var c = new Constant(JSON.stringify(rule));
            constants.add(c);
            this.props.set(JSON.stringify(rule), c);
        }
        return constants;
    }
    /* Compiles map from role to legal propositions */
    calcLegals(raw) {
        var legals = new Map();
        for (var i = 0; i < raw.length; i++) {
            var role = raw[i][1];
            if (!legals.has(role)) {
                var rolemap = new Set();
                legals.set(role, rolemap);
            }
            legals.get(role).add(raw[i]);
        }
        return legals;
    }
    /* Compiles set of init propositions */
    calcInits(raw) {
        var inits = new Set();
        if (!raw) return inits;
        for (var i = 0; i < raw.length; i++) {
            var init = new InitProposition(JSON.stringify(raw[i]));
            inits.add(init);
            this.comps.add(init);
            this.props.set(init.name, init);
        }
        return inits;
    }
    /* Compiles set of terminal propositions */
    calcTerminals() {
        var terminals = new Set();
        for (var i of this.props.keys()) {
            if (i == JSON.stringify('terminal')) {
                terminals.add(this.props.get(i));
            }
        }
        return terminals;
    }
    /* Compiles map from GDL rules to goal propositions */
    calcGoals() {
        var goals = new Map();
        for (var i of this.props.keys()) {
            var k = JSON.parse(i);
            if (k[0] == 'goal') {
                if (!goals.has(k[1])) {
                    var forrole = new Set();
                    goals.set(k[1], forrole);
                }
                goals.get(k[1]).add(this.props.get(i));
            }
        }
        return goals;
    }
    /* Compiles map from role to input propositions */
    calcInputs(raw) {
        var inputs = new Map();
        var raw = compinputs(library);
        for (var i = 0; i < raw.length; i++) {
            var input = new InputProposition(JSON.stringify(raw[i]));
            if (!inputs.has(raw[i][1])) inputs.set(raw[i][1], new Set());
            inputs.get(raw[i][1]).add(input);
            this.comps.add(input);
            this.props.set(input.name, input);
        }
        return inputs;
    }
    /* Compiles set of base propositions */
    calcBases(raw) {
        var bases = new Set();
        for (var i = 0; i < raw.length; i++) {
            var r = raw[i];
            r[0] = 'true';
            var base = new BaseProposition(JSON.stringify(r));
            bases.add(base);
            this.comps.add(base);
            this.props.set(base.name, base);
        }
        return bases;
    }
    /* Populates set of view propositions */
    calcViews(raw) {
        for (var i = 0; i < raw.length; i++) {
            if (raw[i][0] != 'rule') continue;
            var rule = raw[i].slice(1, raw[i].length);
            var head = rule[0];
            if (head[0] == 'base' || head[0] == 'input') continue;
            if (head[0] == 'next') head[0] = 'true';
            var prop = this.findProposition(head);
            var body = [];
            for (var k = 1; k < rule.length; k++) if (rule[k][0] != 'distinct' && rule[k][0] != 'role') body.push(rule[k]);
            /* Join multiple propositions in body with an AND gate */
            if (body.length > 1) {
                var and = new And();
                for (var j = 0; j < body.length; j++) {
                      var req = this.findProposition(body[j]);
                      link(req, and);
                }
                link(and, prop);
             } else if (body.length == 1) {
                 var req = this.findProposition(body[0]);
                 link(req, prop);
            }
        }
    }
    /* Returns the proposition if it exists in the PropNet.
     * Otherwise, creates new View proposition, adds to PropNet, and returns it.
     * Should only need to create View propositions because other propositions will
     * already have been created. */
    findProposition(rule) {
        var key = JSON.stringify(rule);
        if (this.props.has(key)) {
            return this.props.get(key);
        }
        if (JSON.parse(key)[0] == 'not') return this.createNot(key);
        var prop = new ViewProposition(key);
        this.views.add(prop);
        this.props.set(key, prop);
        return prop;

    }
    /* Given a negated rule of the form ['not', [...rule...]], finds or creates a
     * proposition in the PropNet, creates and links a NOT connective, and returns the NOT */
    createNot(key) {
        var not = new Not();
        var rule = JSON.parse(key)[1];
        var p = this.findProposition(rule);
        link(p, not);
        this.nots.add(not);
        return not;
    }
    /* For view propositions with multiple inputs, combines them through an OR gate. */
    calcOrs() {
        for (var p of this.props.keys()) {
            if (this.props.get(p).inputs.size <= 1) continue;
            var or = new Or();
            for (var i of this.props.get(p).inputs) {
                i.outputs.clear();
                link(i, or);
            }
            this.props.get(p).inputs.clear();
            this.comps.add(or);
            link(or, this.props.get(p));
        }
    }
    /* Sets value of all propositions to false */
    clear() { for (var p of this.props.keys()) this.props.get(p).value = false; }
}

/* Links source and target propositions by adding to their output or input fields */
function link(source, target) {
    source.outputs.add(target);
    target.inputs.add(source);
}

/* General class for all components in the PropNet. Contains a set of input and output
 * propositions and connectives, and the value of the proposition. */
class Component {
    constructor() {
        this.inputs = new Set();
        this.outputs = new Set();
        this.value = false;
    }
    /* Convenience method for retrieving single input (i.e. of View propositions) */
    getsingleinput() {
        return [...this.inputs][0];
    }
}
class Proposition extends Component {
    constructor(n) {
        super();
        this.name = n;  // JSON.stringified [does, role, x]
    }
}
class Constant extends Proposition {
    constructor(n) {
        super();
        this.name = n;
        this.type = 'const';
        this.value = true; // override value for constants
    }
}
class InputProposition extends Proposition {
    constructor(n) {
        super(n);
        this.type = 'input';
    }
}
class BaseProposition extends Proposition {
    constructor(n) {
        super(n);
        this.type = 'base';
    }
}
class ViewProposition extends Proposition {
    constructor(n) {
        super(n);
        this.type = 'view';
    }
}
class InitProposition extends Proposition {
    constructor(n) {
        super(n);
        this.type = 'init';
        this.value = 'true'; // override value for inits
    }
}
class And extends Component {
    constructor() {
        super();
        this.type = 'and';
    }
}
class Not extends Component {
    constructor() {
        super();
        this.type = 'not';
    }
}
class Or extends Component {
    constructor() {
        super();
        this.type = 'or';
    }
}


function getORreqs(p, s) {
    //console.log("OR", p);
    if (p == current) return [true, null];
    if (seen.has(p)) return [false, null];
    seen.add(p);
    var lreqs = new Set();
    var foundone = false;
    for (var i of p.inputs) {
        if (i.type == 'or') {
            var ret = getORreqs(i, s);
            if (ret[0] == true) {
                if (ret[1] != null) lreqs = new Set([...lreqs, ...ret[1]]);
                foundone = true;
            }
        }
        else if (i.type == 'and') {
            var ret = getANDreqs(i, s);
            if (ret[0] == true) {
                if (ret[1] != null) lreqs = new Set([...lreqs, ...ret[1]]);
                foundone = true;
            }
        }
        else if (i.type == 'input') {
            lreqs.add(JSON.parse(i.name)[2]);
            foundone = true;
        }
        else if (i.type == 'view') { return [false, null]; } /* FIX LATER */
        else if (i.type == 'base') {
            var ret = getBASEreqs(i, s);
            if (ret[0] == true) {
                if (ret[1] != null) lreqs = new Set([...lreqs, ...ret[1]]);
                foundone = true;
            }
        }
        else if (i.type == 'not') {
            var ret = getNOTreqs(i, s);
            if (ret[0] == true) {
                if (ret[1] != null) lreqs = new Set([...lreqs, ...ret[1]]);
                foundone = true;
            }
        }
        else { console.log('i', i); }
        //console.log("REQS FOR PROP", i, "ARE", lreqs);
    }
    if (!foundone) return [false, null];
    var actions = proplegals(role, s, propnet);
    var dependent = false;
    for (var a = 0; a < actions.length; a++) {
        if (!lreqs.has(actions[a])) dependent = true;
    }
    if (!dependent) return [true, null];
    if (dependent) return [true, lreqs];
}

function getBASEreqs(p, s) {
    //console.log("BASE", p);
    if (current == p && first == false) return [true, null];
    first = false;
    if (seen.has(p)) return [false, null];
    seen.add(p);
    var i = p.getsingleinput();
    if (i.type == 'or') return getORreqs(i, s);
    else if (i.type == 'and') return getANDreqs(i, s);
    else if (i.type == 'base') return getBASEreqs(i, s);
    else if (i.type == 'input') return [true, i];
    else if (i.type == 'not') return getNOTreqs(i, s);
    else if (i.type == 'view') return getBASEreqs(i, s);
    else { console.log("ERROR", i); }
    return [true, null];
}

function getNOTreqs(p, s) {
    //console.log("NOT", p);
    if (current == p) return [false, null]; // one of these may be wrong
    if (seen.has(p)) return [false, null];
    seen.add(p);
    var i = p.getsingleinput();
    var actions = proplegals(role, s, propnet);
    var res;
    if (i.type == 'input') {
        var possible = new Set();
        for (var a = 0; a < actions.length; a++) {
            if (actions[a] != JSON.parse(i.name)[2]) possible.add(actions[a]);
        }
        if (possible.size > 0) return [true, possible];
        return [false, null];
    }
    else if (i.type == 'or') { res = getORreqs(i, s); }
    else if (i.type == 'and') { res = getANDreqs(i, s); }
    else if (i.type == 'not') { res = getNOTreqs(i, s); }
    else if (i.type == 'base') { res = getBASEreqs(i, s); }
    if (!res[0]) return [true, null]; // always false
    if (res[1]) {                     // contingently true
        var possible = new Set();
        for (var a = 0; a < actions.length; a++) {
            if (!res[1].has(actions[a])) possible.add(actions[a]);
        }
        if (possible.size == 0) return [false, null]; // contingent on all actions
        return [true, possible];                      // contingent on some actions
    }                                 // always true
    return [false, null];
}

function getANDreqs(p, s) {
    //console.log("AND", p);
    if (current == p) return [true, null];
    if (seen.has(p)) return [false, null];
    seen.add(p);
    var actions = proplegals(role, s, propnet);
    var lreqs = new Set();
    for (var i of p.inputs) {
        if (i.type == 'or') {
            var res = getORreqs(i, s);
            if (!res[0]) return [false, null];
            if (res[1].size > 0) lreqs.add(res[1]);
        }
        else if (i.type == 'and') {
            var res = getANDreqs(i, s);
            if (!res[0]) return [false, null];
            if (res[1].size > 0) lreqs.add(res[1]);
        }
        else if (i.type == 'input') {
            if (!actions.includes(JSON.parse(i.name)[2])) return [false, null];
            var req = new Set();
            req.add(i);
            lreqs.add(req);
        }
        else if (i.type == 'view') { return [false, null]; }
        else if (i.type == 'base') {
            var res = getBASEreqs(i, s);
            if (!res[0]) return [false, null];
            if (res[1] && res[1].size > 0) lreqs.add(res[1]);
        }
        else if (i.type == 'not') {
            var res = getNOTreqs(i, s);
            if (!res[0]) return [false, null];
            if (res[1] && res[1].size > 0) lreqs.add(res[1]);
        }
        else { console.log('i', i); }
        //console.log("REQS FOR PROP", i, "ARE", lreqs);
    }
    var validactions = new Set();
    // check if there is 1 action that is in every dependent set
    for (var a = 0; a < actions.length; a++) {
        var foundaction = true;   // is this action in every set
        for (var j of lreqs) {    // for every set
            var isin = false;     // is this action in this set
            for (var k of j) {    // for every element in that set
                var name;
                if (typeof k == 'string') { name = k; }
                else { name = JSON.parse(k.name)[2]; }
                if (name == actions[a]) {  // does it match the action
                    isin = true;  // this action is in this set
                    break;
                }
            }
            if (!isin) {
                foundaction = false; // this action is not in every set
                break;
            }
        }
        if (foundaction) validactions.add(actions[a]); // if this action is in every set, add to list
    }
    if (validactions.size == 0) return [false, null];
    return [true, validactions];
}



/* PLAYER CODE implementing basic MCTS utilizing PropNet-based functions */

function start (id,r,rs,sc,pc) {
    matchid = id;
    role = 'robot';
    /* MY TOY GAME */
    rs = [
      [ 'role', 'r' ],
      [ 'base', 'a' ],
      [ 'base', 'b' ],
      [ 'base', 'c' ],
      [ 'input', 'r', 'i' ],
      [ 'input', 'r', 'j' ],
      [ 'input', 'r', 'k' ],
      [ 'legal', 'r', 'i' ],
      [ 'legal', 'r', 'j' ],
      [ 'legal', 'r', 'k' ],
      [ 'rule', [ 'next', 'a' ], [ 'does', 'r', 'i' ] ],
      [ 'rule', [ 'next', 'a' ], [ 'does', 'r', 'j' ], [ 'true', 'a' ] ],
      [ 'rule', [ 'next', 'a' ], [ 'does', 'r', 'k' ], [ 'true', 'a' ] ],
      [ 'rule', [ 'next', 'b' ], [ 'does', 'r', 'j' ], [ 'not', ['true', 'b'] ] ],
      [ 'rule', [ 'next', 'b' ], [ 'does', 'r', 'i' ], [ 'true', 'b' ] ],
      [ 'rule', [ 'next', 'b' ], [ 'does', 'r', 'k' ], [ 'true', 'b' ] ],
      [ 'rule', [ 'next', 'c' ], [ 'does', 'r', 'k' ], [ 'not', ['true', 'c'] ] ],
      [ 'rule', [ 'next', 'c' ], [ 'does', 'r', 'i' ], [ 'true', 'c' ] ],
      [ 'rule', [ 'next', 'c' ], [ 'does', 'r', 'j' ], [ 'true', 'c' ] ],
      [ 'rule', [ 'goal', 'r', '100' ], [ 'true', 'a' ], [ 'true', 'b' ] ],
      [ 'rule', [ 'goal', 'r', '100' ], [ 'true', 'a' ], [ 'true', 'c' ] ],
      [ 'rule', [ 'goal', 'r', '0' ], [ 'not', [Array] ] ],
      [ 'rule', [ 'goal', 'r', '0' ], [ 'not', [Array] ], [ 'not', [Array] ]],
      [ 'rule', 'terminal', [ 'true', 'a' ], [ 'true', 'b' ] ],
      [ 'rule', 'terminal', [ 'true', 'a' ], [ 'true', 'c' ] ]
    ];
    role = 'r';



    library = definemorerules(seq(),rs);
    begin = performance.now();
    usingPropnets = true;

    /* Game info */
    gamestate = findinits(library);

    propnet = new PropNet();
    propnet.setup();
    console.log("Propnet built.");

    /* Find nodes for factoring */
    if (!propnet.bases) return 'ready';
    for (var b of propnet.bases) {
        //console.log("starting", b);
        if (b.inputs.size == 0) continue;
        state = [JSON.parse(b.name)];
        markbases(state, propnet);
        current = b;
        first = true;
        var guess = getBASEreqs(b, state);
        //console.log(b.name, guess);
        if (guess[0] && (!guess[1])) { // candidate for factoring!
            console.log(b.name, true);
        }
        else { console.log(b.name, false) }
    }
    for (var v of propnet.views) {
        if (v.inputs.size == 0) continue;
        name = JSON.parse(v.name);
        if (name[0] != 'true') continue;
        state = [name];
        markbases(state, propnet);
        current = v;
        first = true;
        var guess = getBASEreqs(v, state);
        //console.log(v.name, guess);
        if (guess[0] && (!guess[1])) { // candidate for factoring!
            console.log(v.name, true);
        }
        else { console.log(v.name, false) }
    }
    propnet.clear();

    markbases(gamestate, propnet);
    return 'ready';
}

function play(id, move) {
    return legalplay(id, move);
}

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
