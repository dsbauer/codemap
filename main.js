var lctree = null;//visible for debugging


$(function() {
	$('#goBtn').click(function() {
		var code = document.getElementById('code').value,
				// parse code to build LexicalContext tree:
				lexmap = lctree= LexicalContext.makeMapFromCode(code),
				// build initial diagram of contexts
				view = new MapView(lexmap);
		// wrap all functions, run wrapped code, and modify diagram:
	  return runIt(code,lexmap);
	})
});
