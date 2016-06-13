function assert(cond) {
	if (!cond) throw 'tantrum';
}

function findFunctionEnd(code) {
//	console.log('searching code:');
//	console.log(code);
	//given a string, find the offset of the first }
	// which balances the first {
	var depth =0;
	for (var i=0; i<code.length; ++i) {
		var chr = code[i];
		if (chr==='{')
			++depth;
		else if (chr==='}') {
			--depth;
			if (!depth) return i;
			if (depth<0) return -1;// missing {
		}
	}
	// reached end, missing }
	return -2;
}

function extractNextFunction(code,fnList) {
	var start = code.search(/function[ \t(]/);
//	console.log("start = " + start);
	if (start<0) {
		return "";
	}
	var end = findFunctionEnd(code.slice(start));
//	console.log('end = '+end);
	if (end>0) {
		var fragment = code.slice(start,end);
//		console.log(fragment);
		fnList.push(fragment);
		return code.slice(end);
	} //else
	return "";
}

function extractAllFunctions(code) {
	var fnList = [];
	while (code) {
		code = extractNextFunction(code,fnList);
	}
	return fnList;
}

/*
function FunctionMap(outerFn) {
	assert(outerFn instanceof Function);
	var code = outerFn.toString();

}*/
function extractFunctionTrees(code, parent) {
	var nextFun = code.search(/function[ \t(]/),
		nextOpen= code.search(/{/),
		nextClose= code.search(/}/);
	if (nextFun){}
}

function extractSymbols(code) {
	var symbols = code.match(/function[ \t\n(]|{|}/g);
	return symbols;
}

function FunctionTree(code, symbols, parent) {
	this.code = code;
	this.children = [];
	var nextSymb = symbols.shift();
	code = code.slice(code.find(nextSymb));
	if (nextSymb==='{')
	//extractFunctionTrees(code,this);
}


function isModuleItself(fn) {
	var code = fn.toString();
	return code.match(/^function \(exports, require, module, __filename, __dirname/);
}

function namedParams(fn) {
	var code = fn.toString();
	var segments = code.match(/^function[^(]+\(([^)]*)\)/);
	var paramstr = segments[1];
	//console.log(segments);
	if (paramstr===undefined) throw 'ooopsy';
	var params = paramstr.split(',');
	var vals = fn.arguments;
	var paramObj = {};
	params.forEach(function (param,i) {
		paramObj[param]=vals[i];
	})
	return paramObj;
}

function snapshot() {
	var fn = arguments.callee.caller;
	//console.log(fn.caller.toString());	

	//return;
	while(fn &&
		(typeof fn === 'function') &&
		fn !== global &&
		!isModuleItself(fn)) {
			console.log(fn.name,namedParams(fn));
			console.log(Object.keys(fn.arguments));
			fn = fn.caller;
	}
}

function inner(a,b) {
	snapshot();
}

function plus(a,b) {
	inner(a*2,b*2);
	return a+b;
}

//plus(4,5);


var code = '{\
 function plus(a,b) {\
 	var obj = {a:{b:{}}};\
 	function alpha() {\
 		var thing;\
 		blah blah;\
 		do(thing,function (c) {\
 			inner d = function (){\
 				nothing;\
 				if (thing){\
 					whatevs;\
 					while (false) {\
 						if (raining) {\
 							getwet;\
 						}\
 					}\
 				}\
 			}\
 		});\
 	}\
 	function beta(d) {}\
 	var thing.gamma = function(e) {\
 		nothing;\
 	}\
 }\
}\
'
//var fns = extractAllFunctions(code);
//console.log(fns.join('\n\n'));
console.log(extractSymbols(code));