/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Flat Map Route Controller
 *
 * A flat map is an object that map route/controller by key/property.
 * @example
 * {
 * 		"/my/path":{ 
 * 			// my controller
 * 		},
 * 		"/my/second/path":{
 * 			// my other controller
 * 		}
 * }
 *
 * Gives first match.
 *
 * @example 
 * deep.route.flatMapper({
 * 		// your map
 * })
 * .done(function(mapper){
 * 		var matched = mapper.match("/my/path/to/test");
 * 		if(matched)
 * 			console.log("matched : ", matched);
 * 		else
 * 			console.log("nothings matched !");
 * })
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./route"], function(require, deep)
{
	"use strict";
	deep.route = deep.route || {};
	deep.route.flatMapper = function(map, restfulDefault){
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
	return deep.route.flatMapper;
});