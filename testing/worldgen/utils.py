def getactions(m):
    actions = ['i', 'j', 'k', 'l', 'm']
    return actions[:m]

def getprops(n):
    props = ['a', 'b', 'c', 'd', 'e']
    return props[:n]

def getpropstate(i, n):
    propstate = str(bin(i))[2:]
    propstate = propstate.zfill(n)
    return propstate

def isptrue(code, p, n):
    propstate = getpropstate(code[0], n)
    return (propstate[p] == '1')

def is1(val):
    return (val[-1] == 1)

def islegal(row, a):
    return (row[1] in a)
