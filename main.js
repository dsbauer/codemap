var lc = null;//debugging

function go() {
	var code = document.getElementById('code').value,
			lexmap = LexicalContext.makeMapFromCode(code);
	var view = new MapView(lexmap);
  lc = lexmap;
}

window.onload = function() {
	var btn = document.getElementById('goBtn');
	btn.onclick = go;
}
