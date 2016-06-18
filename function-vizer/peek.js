function peek() {
  // I'm in a function somewhere on the stack.
  // My job: document the values of all the variables I can find!

  var myself = arguments.callee.caller,
      myname = myself.name,
      mycode = myself.toString(),
      myrec = registry[mycode],
      myvars = myrec.vars;
      //pairs = myvars.map(it=>({name:"'"+it+"'",val:it}));
      //myvals = myvars.map(it=>eval(it))
  //console.log(pairs);
  return 'console.log('+myvars.join()+')';
  //return 'console.log('+myvars.join()+'.map(it=>it+':'+))';
  //console.log( '['+pairs+']'+'.forEach(label)');
}

function label(pair) {
  console.log(pair.name+':',pair.val);
}

function test(x,y,z,whatevs) {
  whatevs++;
  eval(peek());
  //peek();
}

var registry = {};

var knownFunctions = [peek,test];
var knownVars = [[],['x','y','z','whatevs']];

knownFunctions.forEach((fn,i)=>{
  var code = fn.toString();
  registry[code] = {
    fn: fn,
    vars: knownVars[i]
  };
});

test('foo','bar','blerg',123);
