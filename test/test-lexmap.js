var LexicalContext = require('../lexmap.js'),
    fs = require('fs'),
    _ = require('lodash');

var expect = require('chai').expect;

function evalExpr(expr) {
  return eval('('+expr+')');//wrap in () to ensure expr (e.g. with function(){})
}

function makeSample(code) {
  var root = LexicalContext.makeMapFromCode(code),
      nodes = root.flatten(),
      children = _.without(nodes,root);
  return { //one code sample:
    code:code,//the source
    root:root,//topmost node
    nodes:nodes,// array of all nodes including root
    children:children// array of nodes omitting root
  }
}

function withSamples() {//(sampleArray,sampleArray,... function(sample))
  var fn = arguments[arguments.length-1];
  for (var i=0; i<arguments.length-1; ++i) {
    arguments[i].forEach(fn);
  }
}

function withSampleSubset() {//([samples...],[samples...],... function(child))
  var propname = this,//this is a property name, either 'nodes' or 'children'
      fn = arguments[arguments.length-1];
  for (var i=0; i<arguments.length-1; ++i) {
    arguments[i].forEach(sample=>
      sample[propname].forEach(node=>fn(node,sample))
    )
  }
}
function withSampleNodes() {//visit all nodes of each sample
  withSampleSubset.apply('nodes',arguments);
}
function withSampleChildren() {//visit only child nodes (i.e. skip root) of each sample
  withSampleSubset.apply('children',arguments);
}


describe("LexicalContext", function(){
  var deepcode,flatcode;

  before(function () {
    flatcode = [//code samples with no function definitions
      `var x=1; while(false) {x++;}`,

      `f(x(y(z)));`,

      `var foo, bar=1;`
    ];

    deepcode = [//code samples with at least one function definition
      `function foo(farg) {
        var bar = function(barg) {
          return farg+barg;
        }
        return bar;
      }`,

      `var OBJ = {
        fn: function(arg0,arg1) {
          return OBJ.fn;
        }
      }`,

      `var f = x=>'eff',
           g = (y,z)=>'gee'`
    ];

    // parse and build lexical tree for each code sample
    deepcode = deepcode.map(makeSample);
    flatcode = flatcode.map(makeSample);
  })

  describe("LexicalContext.makeMapFromCode(code)", function() {
    it('should return a LexicalContext instance ("root")', function() {
      withSamples(deepcode,flatcode,sample=>
        expect(sample.root).to.be.an.instanceof(LexicalContext)
      )
    })
    it("  which is marked as the global node", function() {
      withSamples(deepcode,flatcode,sample=>
        expect(sample.root.isGlobal()).to.be.true
      )
    })
    it("  and has a type of 'Program'", function() {
      withSamples(deepcode,flatcode,sample=>
        expect(sample.root.type).to.equal('Program')
      )
    })
    it("  and has no parent",function() {
      withSamples(deepcode,flatcode,sample=>
        expect(sample.root).not.to.have.property('parent')
      )
    })
    it("  and whose source is all of code", function() {
      withSamples(deepcode,flatcode,sample=>
        expect(sample.root.source).to.equal(sample.code)
      )
    })
  })

  describe("any LexicalContext instance except for root", function() {
    it("should have a parent LexicalContext", function() {
      withSampleChildren(deepcode, node=> {
        expect(node.parent).to.be.an.instanceof(LexicalContext);
        expect(node.parent.children).to.include(node);
      })
    })
    it("should have property 'type' which is '...Function...'", function() {
      withSampleChildren(deepcode, node=>
        expect(node.type).to.have.string("Function")
      )
    })
    it("should not be marked as a global node", function() {
      withSampleChildren(deepcode, node =>
        expect(node.isGlobal()).to.be.false
      )
    })
    it("should have source which is a substring of its parent's source", function() {
      withSampleChildren(deepcode, node => {
        expect(node.parent.source).to.have.string(node.source);
        expect(node.range[0]).to.be.within(node.parent.range[0],node.parent.range[1]);
        expect(node.range[1]).to.be.within(node.parent.range[0],node.parent.range[1]);
      })
    })
    it("should have source which evaluates to a function instance",function() {
      withSampleChildren(deepcode, node => {
        expect(node.source).to.be.a.string;
        var result = evalExpr(node.source);
        expect(result).to.be.a.function;
      })
    })
    it("should have property 'instances' which is a set of all registered functions sharing its source", function() {
      withSampleChildren(deepcode, node => {
        var fns = new Set();
        expect(node.instances).to.eql(fns);//both sets empty
        var fn1 = evalExpr(node.source),
            fn2 = evalExpr(node.source);

        expect(fn1.register()).to.be.ok;
        expect(node.instances).to.eql(fns.add(fn1));

        expect(fn2.register()).to.be.ok;
        expect(node.instances).to.eql(fns.add(fn2));
      })
    })
    it("should match the 'context' property of any function instance sharing its code", function() {
      withSampleChildren(deepcode, node => {
        var fn = evalExpr(node.source);
        expect(fn.register()).to.be.ok;
        expect(fn.context).to.equal(node);
      })
    })
  })

  describe("any LexicalContext instance", function() {
    it("should have property 'children' with an array of >=1 other LexicalContexts, or no such property", function() {
      withSamples(deepcode,sample=>{
        expect(sample.root).to.have.property('children')
      })
      withSamples(flatcode,sample=>{
        expect(sample.root).not.to.have.property('children');
        expect(sample.nodes).to.eql([sample.root]);
        expect(sample.children).to.eql([]);
      })
      withSampleNodes(deepcode,node=>{
        if ('children' in node) {
          var children = node.children;
          expect(children).to.be.an.array;
          expect(children.length).to.be.at.least(1);
          children.forEach(child=>expect(child).to.be.an.instanceof(LexicalContext));
        }
      })
    })
    it("should have property 'range', which is an array of 2 positions in code",function() {
      withSampleNodes(deepcode,(node,sample)=>{
        expect(node.range).to.be.an.array;
        expect(node.range.length).to.equal(2);
        expect(node.range[0]).to.be.within(0,sample.code.length-1);
        expect(node.range[1]).to.be.within(0,sample.code.length);
        expect(node.range[1]).to.be.above(node.range[0]);
      })
    })
    it("should have property 'source', which is the substring of code described by range",function(){
      withSampleNodes(deepcode,(node,sample)=>{
        expect(node.source).to.equal(sample.code.slice(node.range[0],node.range[1]));
      })
    })

    it("should have method 'above()'--> list of LexicalContexts upward from parent to root", function(){
      withSamples(deepcode,flatcode,sample=>{
        expect(sample.root.above).to.be.a.function;
        expect(sample.root.above()).to.eql([])
      })
      withSampleChildren(deepcode,(node,sample)=>{
        var above = node.above();
        expect(above).to.be.an.array;
        expect(above.length).to.be.at.least(1);
        expect(above[0]).to.equal(node.parent);
        expect(above[above.length-1]).to.equal(sample.root);
        above.forEach((ancestor,i)=>{
          if (i>0)
            expect(ancestor).to.equal(above[i-1].parent)
        })
      })
    })
    it("should have method 'localVars()'--> non-duplicate list of identifiers", function() {
      withSampleNodes(deepcode,node=>{
        var ids = node.localVars();
        expect(ids).to.be.an.array;
        ids.forEach(id=> {
          expect(id).to.be.a.string;
          expect(id).to.match(/^[a-z_$][a-z0-9_$]*$/i);
        });
        expect(_.uniq(ids)).to.eql(ids);//no duplicates allowed
      })
    })

  })
})
