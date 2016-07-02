/* A lexical map is a tree structure representing the lexical nesting of all functions in the input code.
Each tree node corresponds to the context of one function, with the following info:
-- the parent node (i.e. context of the enclosing function)
-- an array of children
-- a list of names of local variables or parameters
-- the functions' source code and its position range within full code
-- if discovered, a reference to the function itself
-- an array of known execution contexts (scopes), one for each (detectable) time the function has run.
*/

var LexicalContext = (function() {
  function write(depth,str){
  	var space = '                              ';
  	console.log(space.substr(0,depth)+str);
  }

  function pruneDeeper(vars,newDepth){
  	return function(tree){
  		return pruneTree(tree,vars,newDepth);
  	}
  }

  function pruneTree(tree,vars,depth,alias) {
    // given an esprima parse tree, prune it to include only function declarations and expressions

//console.log(tree);
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
      // BUG: if list.length>1, list must be merged with next sibling
  		return list;
  	}
  	write(depth,tree.type);
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
  			vars=[];//WTF?
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
    if (tree && tree.type)
      obj.type = tree.type;
  	if (body) {
  		if (!(body instanceof Array))
  			body = [body];
  		obj.children = body;
  		//obj.index = indexChildren(body);
  		obj.names = body.map(findName);
  	}
  	if (tree && tree.params)
  		obj.params = tree.params.map(pluckName);
  	if (tree && tree.range) {
  		obj.source = code.slice(tree.range[0],tree.range[1]);
      obj.range = tree.range;
    }
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
    //Function.registerContext(this);
  }
  LexicalContext.prototype.isGlobal = function() {
    return this.name === globalScopeName;
  }
  LexicalContext.prototype.isDeclaration = function() {
    return this.type === 'FunctionDeclaration';
  }
  LexicalContext.prototype.localVars = function() {
    return _.compact(
      (this.vars || [])
      .concat(this.params || [])
      .concat(this.names || [])
    )
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
  var hashFn = normalizeSource;//md5?

  Function.registry = {};  // a collection of all known LexicalContexts,
  // indexed by (more or less) their source code
  // This allows any function instance to find its context
  // BUG: identical functions cannot tell their contexts apart

  Function.registerContext = function(ctx) {
    var source = ctx.newSource; // the modified code, which matches the function actually built
               //ctx.source;  // the original code from user input
  	Function.registry[hashFn(source)]=ctx;
  }


  Function.prototype.register = function() {
    // add this function instance to its context object
    var source = this.toString(),// should match ctx.newSource
        ctx = Function.registry[hashFn(source)];
    ctx.instances.add(this);
  }

  Function.prototype.peek = function() {
    // if this function has a .currentFrame (a view of its current exec context),
    //  update that view to show the values in arguments
    //  as the current values of its local variables
    console.log('peeking at: ',this);
    var view = this.currentFrame,
        ctx = this.context;
    if (!view) return;
    var ids = ctx.localVars();
    view.render(_.zipObject(ids,arguments));
  }

  // This deeply-embedded function is currently undetectable as a LexicalContext itself.
  // Need to modify pruneTree to explore branches like this monster:
  // tree.body[0].declarations[0].init.callee.body.body[19].expression.arguments[2].properties[0].value
  // FIXED?
  Object.defineProperty(Function.prototype,'context', {
    get: function context() {
      var obj = Function.registry[hashFn(this.toString())] ||
                this.inner &&
                Function.registry[hashFn(this.inner.toString())];
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
