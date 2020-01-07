# js-factoring

#### Goal: check if proposition state is unchanged once set

Top-level globals
`seen {}`	set of props in current recursive call
`first = true` when checking base prop, know if you are in a top-level call
`current` current top-level base prop

Top-level wrapper

```
for each base prop b
	set current to b
	checkbaseprop(b) 	// initialize recursive calls
```

Component-level checkers

#### 1.  Propositions (base)

```
checkprop(b)
	if current = b and first = false
		return true, null
```
> if we've arrived at it from somewhere else, we've already assumed it's locked at true
```
	first = false
	if b in seen
		return false, null
	add b to seen
```

> If inside recursive call already, state can't be seen? **check this**
```
	i = input to b
	if i is input prop
		return true, i
```
> If the truth value of b reduces to the truth value of an input prop ``i``, it is a latch possibility contingent on the truth value of ``i``
```
	return recursion on i
```
> recurse on ``i`` depending on its component type

#### 2. OR components

```
checkor(p, s)
	if current = p				// ** MAY NEVER BE CALLED?
		return true, null
	if p in seen				// ** same q as prop checker
		return false, null
	add p to seen
	allreqs = {}
```
> create a set to store the set of actions that can make it true
```
	foundone = false
```
> create a variable to store if you found an input disjunct that is true
```
	for input disjunct i
		if i is an OR, AND, or NOT comp, or a base prop
			value, reqs = recurse(i, s)
			if value = true
				foundone = true
				add each element in reqs to allreqs
```
> iterate through the disjuncts ``i`` and deal with each case separately (the ``recurse`` function is actually ``checkor``, etc). If ``i``  can be true, recurse and add contingencies to set.
```
		else if i is an input prop
			foundone = true
			add i to allreqs
```
> if ``i`` is an input prop, we know it will be true contingent on that input so we can simply add it to the set of actions that can make ``p`` true
```
		else if i is a view prop
			return false, null
```
> **deal with this later** - currently the example doesn't contain any view props
```
	if foundone = false
		return false, null
```
> if none of the disjuncts can possibly make it true, return false
```
	dependent = false
```
> create a variable to store if it's true contingent on some action
```
	actions = proplegals(role, state, propnet)
	for a in actions
		if allreqs does not have that action
			dependent = true
```
> only if all possible legal actions make it true is it not dependent on the action taken
```
	if dependent = false
		return true, null
	return true, allreqs
```

#### 3. AND components

```
checkand(p, s)
	if current = p
		return true, null
	if p in seen
		return false, null
	add p to seen
	actions = proplegals(role, state, propnet)
	allreqs = {}
```
> this time, the set will store a set of subsets, each corresponding to a conjunct. Each subset contains a set of actions, one of which must be true in order for the conjunct to be true. Conjuncts that are always true have no associated subset
```
	for input conjunct i
		if i is an OR, AND, or NOT comp, or a base prop
			value, reqs = recurse(i, s)
			if value = false
				return false, null
			add reqs to allreqs
```
> iterate through the conjuncts ``i`` and deal with each case separately (the ``recurse`` function is actually ``checkor``, etc). If ``i``  is false, we know immediately that ``p`` is false, so we return. Otherwise, add the set of possible inputs that make ``i`` true to the set of overall requirement sets for ``p``

```
		else if i is an input prop
			if i is not in actions
				return false, null
			add {i} to allreqs
```
> if ``i`` is an input prop, ``p`` is contingent on ``i`` being true. If ``i`` is not one of the possible actions, ``p`` is never true and we can return false. Otherwise, we add a set containing ``i`` to the overall set
```
		else if i is a view prop
			return false, null
	validactions = {}
```
> create a new set to store the valid actions that make ``p`` true
> Now we are going to iterate through each legal action and check if it is in every dependent set - if so, then taking that action will make ``p`` true
```
	for a in actions
		foundaction = true
```
> assume ``a`` is in every subset (i.e., a is a valid action that makes ``p`` true)
```
		for j in allreqs
```
> iterate through the set
```
			var isin = false
```
> assume that ``a`` is not in that subset
```
			for k in j
```
> iterate through the elements of that subset
```
				if k matches a
					isin = true
					break
```
> we can stop looking through that subset once we find a match
```
			if isin = false
				foundaction = false
				break
```
> the action ``a`` is not in every set, so it's not a valid action (taking `a` will not make `p` true)
```
		if foundaction = true
			add a to validactions
```
> if we never set ``foundaction`` to false, ``a`` is a valid action
```
	if validactions.size = 0
		return false, null
```
> if we never found any valid actions, there's nothing we can do to make `p` true
```
	return true, validactions
```
> if there are valid actions, return true and the set of actions that could make `p` true

#### 4. NOT components

```
checknot(p)
	if current = p
		return false, null
	if p in seen
		return false, null
	add p to seen
	actions = proplegals(role, state, propnet)
	i = input to p
```
> similar to the base checker, we only need to consider a single input to ``p``
```
	if i is input prop
```
> if `i` is an input prop, `p` will be true when the action `i` is NOT taken
```
		possible = {}
		for a in actions
```
> iterate through the legal actions
```
			if a is not i
				add a to possible
```
> if the action `a` is not in the input action `i`, add it to the list of possible actions that make `p` true.
```
		if possible.size > 0
			return true, possible
		return false, null
```
> if there are legal actions other than `i`, then `p` is true given one of those actions is true
```
	value, reqs = recurse(i, s)
```
> if `i` is not an input prop, we can simply recurse to see if `i` can be true, and if so get the list of actions that can make it true (in practice, use cases again to call the right recursive function for each type of `i`)
```
	if value = false
		return true, null
```
> if `i` is always false, then `p` is always true
```
	if reqs is empty
		return false, null
```
> if `i` is always true, `p` is always false
```
	possible = {}
	for a in actions
		if a not in reqs
			add a to possible
```
> iterate through the possible actions; for each one that does NOT make `i` true, add it to list of possible actions that makes `p` true
```
	if possible is empty
		return false, null
```
> if no actions make `p` true, return false
```
	return true, possible
```
