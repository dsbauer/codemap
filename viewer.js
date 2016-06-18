var MapView = (function() {

function renderMap(fns,$container,label) {
	//var fnNames = fns.names;
	var vars = _.difference(fns.vars,fns.names);
		//fns.vars? fns.vars: [];

	var isGlobal = fns.isGlobal(),
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
	//Function.register(fns);

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

return renderOuter;

}())

if (typeof module !== 'object') {
  module.exports = MapView;
}
