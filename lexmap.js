/* A lexical map is a tree structure representing the lexical nesting of all functions in the input code
Each node corresponds to the context of one function, with the following info:
* the node of the parent context (i.e. enclosing function)
* an array of children
* an list of names of local variables or parameters
*the functions' source code and its position range within full code
* if discovered, a reference to the function itself
* an array of known execution contexts (scopes), one for each (detectable) time the function has run.
*/

var LexicalContext = (function() {
  function pruneDeeper(vars,newDepth){
  	return function(tree){
  		return pruneTree(tree,vars,newDepth);
  	}
  }
  function pruneTree(tree,vars,depth,alias) {
    // given an esprima parse tree, prune it to include only function declarations and expressions

  	if (!tree) return null;
  	if (!depth) depth=0;
  	var deeper = depth+1;
  	if (tree instanceof Array) {
  		if (!tree.length)
  			return null;
  		if (tree.length===1)
  			return pruneTree(tree[0],vars,deeper);
  		var list = tree.map(pruneDeeper(vars,deeper)).filter(x=>x);
  		if (!list)
  			return null;
  		if (list.length===0)
  			return null;
  		if (list.length===1)
  			return list[0];
  		return list;
  	}
  	//write(depth,tree.type);
  	switch (tree.type) {
  		case undefined:
  		case 'Literal':
  			return null;
  		case 'Program':
  			vars=[];
  			return makeNode(null,vars,pruneTree(tree.body,vars,deeper,alias));
  		case 'FunctionDeclaration':
  			vars.push(tree.id.name);
  		case 'FunctionExpression':
  		case 'ArrowFunctionExpression':
  			vars=[];
  			return makeNode(tree,vars,pruneTree(tree.body,vars,deeper,alias),alias);
  		case 'BlockStatement':
  			return pruneTree(tree.body,vars,deeper,alias);
  		case 'ReturnStatement':
  			return pruneTree(tree.argument,vars,deeper,alias);
  		case 'ExpressionStatement':
  			return pruneTree(tree.expression,vars,deeper,alias);
  		case 'CallExpression':
        //return pruneTree(tree.arguments,vars,deeper,alias);
        //BUG: also need to explore tree.callee, which may be an IIFE
  			// what about...
        return pruneTree([tree.callee].concat(tree.arguments), vars,deeper,alias);
  		case 'VariableDeclaration':
  			return pruneTree(tree.declarations,vars,deeper,alias);
  		case 'AssignmentExpression':
  			return pruneTree(tree.right,vars,deeper,alias);
      case 'ObjectExpression':// may need debugging...
        return pruneTree(tree.properties.map(prop=>prop.value),vars,deeper,alias);
  		case 'VariableDeclarator':
  			if (!vars) vars=[];
  			vars.push(tree.id.name);
  			return pruneTree(tree.init,vars,deeper,tree.id.name);
  		case 'IfStatement':
  			return pruneTree([
  				tree.consequent,
  				tree.alternate
  			],vars)
  		default:
  			return null;
  	}
  }
  function indexChildren(children) {
  	var index = {};
  	children.forEach(function(child){
  		if (child.alias)
  			index[child.alias]=child;
  		else if (child.name==='') {
  			if (!index[''])
  				index[''] = [];
  			index[''].push(child);
  		} else
  			index[child.name]=child;
  	});
  	return index;
  }
  function findName(childFn) {
  	return childFn.alias || childFn.name || ''
  }
  function pluckName(obj) {
  	return obj.name;
  }
  var globalScopeName = ' ';
  function makeNode(tree,vars,body,alias) {
  	var name;
  	if (!tree) {
  		name=globalScopeName
  	} else if (!tree.id) {
  		name=''
  	} else {
  		name=tree.id.name;
  	}
  	var obj = {name:name};
  	if (body) {
  		if (!(body instanceof Array))
  			body = [body];
  		obj.children = body;
  		//obj.index = indexChildren(body);
  		obj.names = body.map(findName);
  	}
  	if (tree && tree.params)
  		obj.params = tree.params.map(pluckName);
  	if (tree && tree.range)
  		obj.source = code.slice(tree.range[0],tree.range[1]);
  	if (alias)
  		obj.alias = alias;
  	if (vars && vars.length)
  		obj.vars = vars;
  	//return {name:name, children:body};
  	return new LexicalContext(obj);
  }

  function LexicalContext(configObj) {
    _.assign(this,configObj);
    this.instances = new Set();
    if (this.children instanceof Array)
      this.children.forEach(child=>child.parent=this);
    Function.registerContext(this);
  }
  LexicalContext.prototype.isGlobal = function() {
    return this.name === globalScopeName;
  }
  LexicalContext.prototype.localVars = function() {
    return (this.vars || []).concat(this.params || []);
  }
  LexicalContext.prototype.visibleVars = function() {
    var inherited = this.parent && this.parent.visibleVars();
    return this.localVars().concat(inherited || []);
  }
  LexicalContext.prototype.above = function() {
    return (!this.parent)? [] : [this.parent].concat(this.parent.above());
  }

  var code = '';
  LexicalContext.makeMapFromCode = function(usecode) {
    code = usecode;
    var tree = esprima.parse(code,{range:true});
    var fns = pruneTree(tree);
    window.tree = tree;
    return fns;
  }

  function normalizeSource(str) {
    return str && str.replace(/^function\s*\(/,'function \(');
  }
  var hashFn = x=>normalizeSource(x);//md5?

  Function.registry = {};

  Function.registerContext = function(ctx) {
  	Function.registry[hashFn(ctx.source)]=ctx;
  }


  Function.prototype.register = function() {
    var source = this.toString(),
        ctx = Function.registry[hashFn(source)];
    ctx.instances.add(this);
  }
  // This deeply-embedded function is currently undetectable as a LexicalContext itself.
  // Need to modify pruneTree to explore branches like this monster:
  // tree.body[0].declarations[0].init.callee.body.body[19].expression.arguments[2].properties[0].value
  // FIXED?
  Object.defineProperty(Function.prototype,'context', {
    get: function context() {
      var hash = hashFn(this.toString()),
          obj = Function.registry[hash];
      return this.context = obj;//cache unchanging result
    }
  });
  /*
  Function.prototype.context = function() {
  	var hash = hashFn(this.toString());
  	return Function.registry[hash];
  }*/


  return LexicalContext;
}())

if (typeof module !== 'object') {
  var module = {};
  module.exports = LexicalContext;
}


function testFn(arg) {
  var out = arg+arg;
  return out;
}

var testObj = {
  method: function testMethod() {return 7}
}
