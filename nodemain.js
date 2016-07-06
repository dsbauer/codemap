var LexicalContext = require('./lexmap.js'),
    spy = require('./spy.js'),
    runIt = require('./wrap-fns.js'),
    fs = require('fs');



var code = fs.readFileSync(process.argv[2],'utf8'),
    // parse code to build LexicalContext tree:
    lexmap = LexicalContext.makeMapFromCode(code)
    // build initial diagram of contexts
    //view = new MapView(lexmap);
// wrap all functions, run wrapped code, and modify diagram:
runIt(code,lexmap);
