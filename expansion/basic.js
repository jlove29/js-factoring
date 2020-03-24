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
      [ 'rule', [ 'next', 'b' ], [ 'does', 'r', 'j' ], [ 'not', [ 'true', 'b' ] ] ]
    ];


