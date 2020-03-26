import numpy as np
import csv
import utils


def getworld(n, m):
    propstates = 2**n
    totalstates = m*propstates
    actions = np.arange(m)
    action_states = np.repeat(actions, propstates)
    props = np.arange(propstates)
    prop_states = np.tile(props, m)
    states = np.column_stack((prop_states, action_states))
    return states

def generaterules(state, n, m):
    props_list = utils.getprops(n)
    actions_list = utils.getactions(m)
    allrules = {}
    for p in range(n):
        rules = []
        istrue = np.apply_along_axis(utils.is1, axis=1, arr=state)
        relevant = state[istrue,:]
        nrelevant = relevant.shape[0]
        for i in range(nrelevant):
            r = relevant[i]
            rule = [props_list[p]]
            reqs = []
            propstate = utils.getpropstate(r[0], n)
            for j in range(n):
                if propstate[j] == '1':
                    reqs.append(props_list[j])
                else:
                    reqs.append('x' + props_list[j])
            reqs.append(actions_list[r[1]])
            rule.append(reqs)
            rules.append(rule)
        allrules[p] = rules
    return allrules

def annotate(state, m):
    nstates = state.shape[0]
    ncombos = 2**m
    acts = np.random.randint(ncombos, size=nstates)
    acts = acts.reshape((nstates, 1))
    annotated = np.append(state, acts, axis=1)
    vals = np.random.randint(2, size=nstates)
    vals = vals.reshape((nstates, 1))
    annotated = np.append(annotated, vals, axis=1)
    return annotated



def calclatches(state, n):
    latches = []
    for p in range(n):
        istrue = np.apply_along_axis(utils.isptrue, axis=1, arr=state, p=p, n=n)
        relevant = state[istrue,:]
        numprops = relevant.shape[0]
        stilltrue = np.apply_along_axis(utils.is1, axis=1, arr=relevant)
        count = np.count_nonzero(stilltrue)
        if count == numprops:
            latches.append(p)
    return latches

    


def getlatches(state, n, m):
    props_list = utils.getprops(n)
    actions_list = utils.getactions(m)
    latches = np.apply_along_axis(calclatch, axis=1, arr=state, n=n, m=m)


def main(n, m):
    # n = number of propositions
    # m = number of actions

    # generate world state (m*2^n)
    worldstate = getworld(n, m)

    # annotate action combos
    paramvals = annotate(worldstate, m)

    # calculate latch
    latches = calclatches(paramvals, n)

    # convert to rules
    rules = generaterules(paramvals, n, m)
    with open('rules.csv', 'a') as outfile:
        writer = csv.writer(outfile)
        for p in rules:
            latch = 0
            if p in latches:
                latch = 1
            writer.writerow([rules[p], latch])


for n in range(1, 5):
    for m in range(1, 4):
        for i in range(10):
            main(n, m)
