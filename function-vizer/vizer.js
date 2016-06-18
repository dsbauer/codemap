
var code = `
	var x,y,z=2;
	function Fun1() {
		function Fun2() {
			if (false) blahblah;
			else return;
		}
		var a,b,c= a+b;
		return function Fun3() {
			return 2;
		}
	}
	if (false) {
		nevermind;
	}
`;

var self = function(val) {
	return val;
}
function pluckName(obj) {
	return obj.name;
}
function write(depth,str){
	var space = '                              ';
	console.log(space.substr(0,depth)+str);
}
function pruneDeeper(vars,newDepth){
	return function(tree){
		return pruneTree(tree,vars,newDepth);
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
	return obj;
}
function pruneTree(tree,vars,depth,alias) {
	if (!tree) return null;
	if (!depth) depth=0;
	var deeper = depth+1;
	if (tree instanceof Array) {
		if (!tree.length)
			return null;
		if (tree.length===1)
			return pruneTree(tree[0],vars,deeper);
		var list = tree.map(pruneDeeper(vars,deeper)).filter(self);
		if (!list)
			return null;
		if (list.length===0)
			return null;
		if (list.length===1)
			return list[0];
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
			vars=[];
			return makeNode(tree,vars,pruneTree(tree.body,vars,deeper,alias),alias);
		case 'BlockStatement':
			return pruneTree(tree.body,vars,deeper,alias);
		case 'ReturnStatement':
			return pruneTree(tree.argument,vars,deeper,alias);
		case 'ExpressionStatement':
			return pruneTree(tree.expression,vars,deeper,alias);
		case 'CallExpression':
			return pruneTree(tree.arguments,vars,deeper,alias);
		case 'VariableDeclaration':
			return pruneTree(tree.declarations,vars,deeper,alias);
		case 'AssignmentExpression':
			return pruneTree(tree.right,vars,deeper,alias);
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

function renderMap(fns,$container,label) {
	//var fnNames = fns.names;
	var vars = _.difference(fns.vars,fns.names);
		//fns.vars? fns.vars: [];

	var isGlobal = fns.name===globalScopeName,
			paramList = fns.params? fns.params.join(): '',
			paramStr = isGlobal? '': '('+paramList+')',
			varStr = vars.join(', ');
	if (varStr)
			varStr = '<b>'+varStr+'</b>';
	var content = _.compact([fns.name+paramStr,varStr]).join('<br>');

	var $outer = $('<div>')
				.addClass('compartment');
	if (label) {
		$outer.append($('<b>').html(label+':'));//perhaps use fns.name instead?
	}
	var $inner = $('<div>')
				.addClass('scope')
				.addClass(isGlobal? 'global':'function')
				.html(content)
				.attr('code',fns.source)
				.appendTo($outer);

	// Register function so that its rendering can be found when it runs
	Function.register(fns);

	$outer.appendTo($container);

	var children = fns.children || [];
	if (!(children instanceof Array))
		children = [children];
	children.forEach(function (child,i){
		renderMap(child,$inner,fns.names[i]);
	})
}
function renderOuter(fns) {
	var $container = $('#diagram').html('');
	renderMap(fns,$container,'global');
}

var hashFn = x=>x;//md5

Function.registry = {};
Function.register = function(rec,fn) {
	var source = (fn? fn.toString(): rec.source);
	Function.registry[hashFn(source)]={fn:fn,rec:rec};
}
Function.prototype.meta = function() {
	var hash = hashFn(this.toString());
	return Function.registry[hash].rec;
}

function go1() {
	code = document.getElementById('code').value;
	tree = esprima.parse(code,{range:true});
	fns = pruneTree(tree);
	console.log(JSON.stringify(fns,null,2));
	renderOuter(fns);
}

function go() {
	var code = document.getElementById('code').value,
			lexmap = LexicalContext.makeMapFromCode(code);
	renderOuter(lexmap);
}

var tree, fns;
window.onload = function() {
	var btn = document.getElementById('goBtn');
	btn.onclick = go;
}



//===========
/*

function Scope(bodyObj){
	//this.children = [];
	replaceFnsWithScopes(bodyObj,this);
}

function convertTreeToScope(treeObj) {
	switch (treeObj.type) {
		case 'FunctionExpression':
		case 'FunctionDeclaration':
			return new Scope(treeObj.body);
		case 'BlockStatement':
			return null;
		default:
			return null;
	}
}

function replaceFnsWithScopes(treeObj,parentScope) {
	//treeObj has a property type and possibly an array type including:
	// declarations
	// body
	var rawTree = treeObj.body || [];
	var prunedList = rawTree.filter(convertTreeToScope);
	parentScope.children = prunedList;
}
*/
