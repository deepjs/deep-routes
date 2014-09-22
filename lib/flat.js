/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./route"], function(require, deep)
{
	"use strict";
	deep.flatRoutes = function(map, restfulDefault){
		var entries = [];
		var mapper = {
			match : function(uri){
				for(var i = 0, len = entries.length; i < len; ++i)
				{
					var entry = entries[i], res = entry.route.match(uri);
					if(res)
					{
						var ctrl = entry.entry;
						if(ctrl && ctrl._deep_ocm_)
							ctrl = ctrl();
						return { params:res.output, catched:res.catched, entry:ctrl, standard:entry.standard };
					}
				}
				return null;
			}
		};
		return deep.flatten(map)
		.done(function(s){
			deep.query(map, "./*", { fullOutput:true })
			.forEach(function(node){
				var standard = false,
					key = node.key
				if(restfulDefault && key.indexOf(":") == -1) // no variables in route
				{
					standard = true;
					if(key[key.length-1]=='/')
						key += "?[(s:id/?p:path),q:query]";
					else
						key += "/?[(s:id/?p:path),q:query]";
				}
				entries.push({ route:new deep.Route(key), entry:node.value, standard:standard });
			});
			return mapper;
		})
		.elog();
	};
	return deep.flatRoutes;
});