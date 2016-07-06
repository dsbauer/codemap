function spy() {
  // Appears in phrase `eval(spy())` embedded in various functions.
  // Returns code which displays the values of all variables in scope
  //   at that position and moment.
  var myself = arguments.callee // spy() itself
                        .caller,// function to spy on
      ctx = myself && myself.context,
      // myname = myself.name,
      // mycode = myself.toString(),
      myvars = ctx && ctx.localVars() || [],
      code = 'arguments.callee.peek('+myvars.join()+')';
  // BUG: Won't work in arrow functions, which have no 'arguments' var

  //console.log('spying on ',myself,myvars);
  console.log(code);
  return code;
}

// Make SPY an auto-called function, as in `eval(SPY)`:
Object.defineProperty(typeof window==='object'? window: global,
    'SPY', {get: spy});

/*
function spyout() {
  // spy on local vars and all variables above...
  var me = arguments.callee.caller,
      ctx = me && me.context,
      stack = ctx && ctx.above() || [];
  stack.push(me);
  return stack.map(ctx=> //??????????      )
              .join(';')
}
*/

/* Experiment failing as expected: local vars are out of scope :

function evalSpy() {
  var myself = arguments.callee.caller,
      ctx = myself.context,
      myvars = ctx.localVars();
  eval('arguments.callee.caller.peek('+myvars.join()+')');
}
*/
