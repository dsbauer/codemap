//if (typeof require==='function')
//  var ScopeView = require('./viewer-bb.js');

var runIt = (function (){

function _$(fn) {
  //do prebuild admin...
  console.log('building funct: ',fn.name);
  var proxy = function() {
    console.log('calling funct: ',fn.name);
    if (typeof ScopeView === 'function')// if GUI...
      new ScopeView({fn:fn,args:arguments});
    //fn;// && fn.apply &&
    return fn.apply(fn,arguments);
  }
  proxy.inner = fn;
  proxy.context = fn.context;
  proxy.parentFrame = arguments.callee.caller.currentFrame;//???
  //do postbuild admin...
  return proxy;
}

const lmark = '_$(';
const rmark = ')';

function modifyLmark(tree) {
  if (tree.isDeclaration())
    return tree.name+'='+lmark;
  return lmark;
}

function wrapIntervals(text,tree,origin,skipEnd) {
  // text is the original string containing various segments
  // tree is set of nested intervals:
  // tree0= {range:[b,e],children:[ tree1, tree2... ]}
  // origin and skipEnd are omitted at outermost call
  // returns text with all substrings corresponding to interval [b,e] wrapped
  var myrange = tree.range || [0,text.length],
      left = myrange[0],
      right = myrange[1],
      preamble = text.slice(origin||0,left),
      coda = skipEnd? '': text.slice(right),
      interior = '',
      children = tree.children || [];
  children.forEach(child=>{
    var start = child.range[0],
        stop = child.range[1];
    interior += wrapIntervals(text,child,left,true);//may include preamble left..start
    left = stop;
  });
  interior += text.slice(left,right);
  if (tree.isGlobal()) //HACK: don't wrap outermost
    return preamble + interior + coda;
  tree.newSource = interior;
  Function.registerContext(tree,interior);
  return preamble + modifyLmark(tree) + interior + rmark + coda;
}

return function runIt(code,tree) {
  var newcode = wrapIntervals(code,tree);
  console.log(newcode);
  if (typeof $==='function') {
    $('<textarea>')
      //.appendTo('.codezone') //adds box showing modified code
      .addClass('codebox')
      .val(newcode)
  }
  return eval(newcode);
}

}())

if (typeof module === 'object') {
  module.exports = runIt;
}



/*
//Example of wrapIntervals:

var alpha = 'abcdefghijklmnopqrstuvwxyz',
    wordTree = {range:[4,21],children:[ //efghijklmnopqrstu
      {range:[5,7],children:[]}, //fg
      {range:[10,20],children:[  //klmnopqrst
        {range:[12,14],children:[]},  //mn
        {range:[15,18],children:[]}   //opq
      ]}]};

console.log(wrapIntervals(alpha,wordTree)));
//==> 'abcd(e(fg)hij(kl(mn)o(pqr)st)u)vwxyz'
*/

/*

// Various experimental hacks...

function wrapFunction(code,ctxTree) {
  if (!ctxTree || !ctxTree.range) return '';
  var range = ctxTree && ctxTree.range;
  if (!range) return '';
  var start = range[0],
      end = range[1];

  ctxTree.children.reduce((newcode,childCtx)=>{
    return newcode,slice(0,c)
  },code
  );
      middle = wrapFunction(code,ctxTree)
  code = code.slice(0,start)+wrapAllFunctions
}



function wrapWords2(text,wordTree,origin,skipEnd) {
  // origin and skipEnd are optional
  var myrange = wordTree.range,
      left = myrange[0],
      right = myrange[1],
      preamble = text.slice(origin||0,left),
      coda = skipEnd? '': text.slice(right),
      newtext = '',
      children = wordTree.children,
      child, start, stop;
  children.forEach(child=>{
    var start = child.range[0],
        stop = child.range[1];
    newtext += wrapWords2(text,child,left,true);//may include preamble left..start
    left = stop;
  });
  // for (var i=0; i<children.length; ++i) {
  //   child = children[i];
  //   start = child.range[0];
  //   stop = child.range[1];
  //   newtext += wrapWords2(text,child,left,true);//may include preamble left..start
  //   left = stop;
  //}
  newtext += text.slice(left,right);
  return preamble+'('+newtext+')'+coda;
}

function wrapOuter(text,wordTree) {
  var myrange = wordTree.range,
      left = myrange[0],
      right = myrange[1];
  return text.slice(0,left)+wrapWords2(text,wordTree)+text.slice(right);
}

//experimental
function wrapWords1(text,wordTree) {//simplified equivalent...
  //word is an object {range:[from,to],children:[...words...]}
  var myrange = wordTree.range,
      mystart = myrange[0],
      mystop = myrange[1];
  var last = mystart;
  var segments = [];
  wordTree.children.forEach(word => {
    var start  = word.range[0],
        stop = word.range[1];
    segments.push(text.slice(last,start));
    segments.push(text.slice(start,stop));
  });
  console.log(segments);
}

function wrapWords3(text,wordTree,left,right) {
  // either left/right may be undefined;
  //if numeric left, include prefix starting at left;
  //if numeric right, include suffix up to right
  var myrange = wordTree.range,
      mystart = myrange[0],
      mystop = myrange[1];
  var prev = mystart;
  var newtext = '',
      children = wordTree.children,
      child, range, start, stop;
  var ends = children.map(child=>child.range[1]);
  for (var i=0; i<children.length; ++i) {
    child = children[i];
    //range = child.range;
    //start = range[0];
    //stop = range[1];
    //newtext += text.slice(prev,start);
    next = (i+1)<children.length? undefined: mystop ;
    newtext += wrapWords2(text,child,prev,next);
    //newtext += text.slice(start,stop);
    prev = ends[i];
  }
  newtext += text.slice(prev,mystop);
  newtext =  '(' + newtext + ')';
  if (left>=0) {
    newtext = text.slice(left,mystart)+newtext;
  }
  if (right>=0) {
    newtext = newtext+text.slice(mystop,right);
  }
  return newtext;
}

//console.log(wrapOuter(alpha,wordTree));
console.log(wrapWords(alpha,wordTree));//,0,true));
//console.log(wrapWords3(alpha,wordTree,0,alpha.length));
*/
