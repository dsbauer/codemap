
var code = '\
	var x,y,z=2;\
	function Fun1() {\
		function Fun2() {\
			if (false) blahblah;\
			else return;\
		}\
		var a,b,c= a+b;\
		return function Fun3() {\
			return 2;\
		}\
	}\
	if (false) {\
		nevermind;\
	}\
';

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
function makeNode(tree,vars,body,alias) {
	var name;
	if (!tree) {
		name='global'
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

function renderMap(fns,$container) {
	var paramStr = fns.params? fns.params.join(): '';
	var varStr = fns.vars? fns.vars.join(): '';
	var $el = $('<div>')
				.addClass('scope')
				.html(fns.name +
					'(' +paramStr+ ')<br>'+
					'[' +varStr+ ']<br>')
				.appendTo($container);

	var children = fns.children || [];
	if (!(children instanceof Array))
		children = [children];
	children.forEach(function (child,i){
		if (fns.names[i])
			$('<b>').html(fns.names[i]+':').appendTo($el);
		renderMap(child,$el);
	})
}
function renderOuter(fns) {
	var $container = $('#diagram').html('');
	renderMap(fns,$container);
}

function go() {
	code = document.getElementById('code').value;
	tree = esprima.parse(code);
	fns = pruneTree(tree);
	console.log(JSON.stringify(fns,null,2));
	renderOuter(fns);
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

