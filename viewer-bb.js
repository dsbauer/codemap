var SourceView = Backbone.View.extend({
  className: 'compartment',
  tagName:'tr',
  initialize: function(opts) {
    var ctx = this.context = opts.tree;
    ctx.sourceView = this;

    var isGlobal = ctx.isGlobal();

    var $outer = this.$el;// $('<tr>').appendTo(this.$el);
    var $label = $outer.append($('<td>'));
    if (opts.label) {
      $label.html(opts.label+':');//perhaps use ctx.name instead?
    }

    this.$content = $('<div>)');

    var $inner = $('<td>')
  				.addClass('scope')
  				.addClass(isGlobal? 'global':'function')
  				//.html(content)
  				.attr('code',ctx.source)
          .append(this.$content)
  				.appendTo($outer);

    this.render();

    var subtrees = ctx.children || [];
    if (!(subtrees instanceof Array)) subtrees = [subtrees];

    this.childViews = subtrees.map(function (child,i){
        new SourceView({tree:child,container:$inner,label:ctx.names[i]});
    })

    $outer.appendTo(opts.container);
  },

  render: function() {
    //redraw all non-function variables
    console.log(ctx);
    var ctx = this.context;
    var isGlobal = ctx.isGlobal();
    var vars = _.difference(ctx.vars,ctx.names);
            //ctx.vars? ctx.vars: [];

    var paramList = ctx.params? ctx.params.join(): '',
        paramStr = isGlobal? '': '('+paramList+')',
        varStr = vars.join(', ');
    if (varStr)
        varStr = '<b>'+varStr+'</b>';
    var content = _.compact([ctx.name+paramStr,varStr]).join('<br>');

    this.$content.html(content);

  }

})

function MapView(tree) {
	var $container = $('#diagram').html('');
	return new SourceView({tree:tree,container:$container,label:'global'});
}
function idToString(id,ids) {
  var val = (id in ids)? ids[id]: '';
  if (val instanceof Object)
    val = "@";
  return val;
}
var ScopeView = Backbone.View.extend({
  className: 'execFrame',
  tagName: 'td',
  initialize: function(opts) {
    var fn = opts.fn,
        ctx = fn.context,
        args = opts.args,//param values
        params = ctx.params;
    this.fn = fn;

    fn.currentFrame = this;
    //var pairs = ctx.params.map((name,i)=>name+':'+args[i]);
    console.log('drawing new scope:',ctx,args);
    var $parent = //$('tr',ctx.sourceView.$el);
      ctx.sourceView.$el;
    //console.log('parent=',$parent)
    this.count = 0;
    this.render(_.zipObject(params,args));
    this.$el
      //.html(pairs)
      //.html(ctx.params && ctx.params.length? ctx.params: '.')
      .appendTo($parent);
  },
  render: function(idVals) {//object {id:val...} of all known local identifiers
    var ctx = this.fn.context,
        ids = ctx.localVars(),
        pairs = ids.map(id=>
          id+':'+idToString(id,idVals)
        );
    //console.log('rendering:',idVals,ctx);

    this.$el.html(pairs.join('<br>'));
    if (this.count) {
      this.$el.addClass('updated');
    }
    this.count++;
  }
});
