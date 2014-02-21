/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./route-node", "./route"], function(require, deep)
{
	deep.flatRoute = function(map){
		var entries = [];
		var mapper = {
			_deep_flat_mapper_:true,
			match : function(uri){
				for(var i = 0, len = entries.length; i < len; ++i)
				{
					var res = entries[i].route.match(uri);
					if(res)
						return { output:res.output, catched:res.catched, entry:entries[i] };
				}
				return null;
			}
		};
		return deep.flatten(map)
		.done(function(s){
			deep.query(map, "./*", {resultType:"full"})
			.forEach(function(node){
				var entry = node.value;
				var route = new deep.Route(entry.route);
				var o = { node:node, route:route };
				entries.push(o);
			});
			return mapper;
		})
		.logError();
	};
});