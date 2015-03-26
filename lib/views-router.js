/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * structured routes/deep-views refresh algorithm.
 *
 * Load all matched controllers parallely.
 * Apply render, dom placement and enhancement (directives) from root to leaf. 
 * So a sub-controller is always rendered, placed in dom and enhanced AFTER its parent and BEFORE its children.
 */
 
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./structured-map"], 
function(require, deep, structured){
	"use strict";
	var viewsMapper = function(map)
	{
		return structured(map)
		.done(function(node){
			return {
				map:map,
				emitter : new deep.Emitter(),
				match:function(path){
					var matched;
					if(typeof path === 'object' && !path.forEach)
						matched = node.match(path.parts.slice(path.index), path.parts.index);
					else
						matched = node.match(path);
					
					if(matched.endChilds == 0 && matched.route.length > 0)
						matched.noMain = true;
					else if(matched.endChilds < matched.route.length)
						matched.stillToMatch = true;
					return matched;
				},
				refresh:function(matched, options){
					//console.log("matched : ", matched)
					var contextRoute = deep.context("route"), self = this;
			
					var  p;
					if(matched && !matched.unmatch)
						p = refresh(matched);
					else
						p = deep.errors.NotFound("route empty");
					return p;
				}
			};
		});
	};

	var loadNode = function(m) {
		var subloads = null;
		if (m.childs) {
			m.subloads = [];
			for (var i = 0, len = m.childs.length; i < len; ++i) {
				var c = m.childs[i];
				if (c.unmatch)
					m.subloads.push(c);
				else
					m.subloads.push(loadNode(c));
			}
		}
		if (!m.node.controllerNode)
		{
			m.loaded = {
				params: m.output
			};
			return m;
		}
		return deep.nodes(m.node.controllerNode)
		.run("load", {
			params: m.output
		})
		.done(function(res) {
			m.loaded = res;
			return m;
		})
		.elog();
	};

	var renderNode = function(m) {
		// console.log("RENDER NODE : ", m.unmatch, m.node.path)
		if (m.unmatch) {
			if (!deep.context("isServer") && m.node.controllerNode && m.node.controllerNode.value.remove)
				m.node.controllerNode.value.remove();
			return null;
		}
		var controllerNode = m.node.controllerNode;
		var refreshed = null;
		if (controllerNode) {
			var entry = controllerNode.value;
			// console.log("try render")
			//entry.route(m.node)
			if (entry.refresh)
				refreshed = entry.refresh(m);
			else
				refreshed = "(nothing)";
			if (refreshed && (refreshed.then || refreshed.promise)) {
				return deep.when(refreshed)
					.done(function(refreshed) {
						// console.log("refreshed : ", m.node.path, " - ", refreshed.rendered || refreshed, " - with : ",m.output);
						if (m.subloads && m.subloads.length > 0) {
							var subpromises = [];
							for (var i = 0, len = m.subloads.length; i < len; ++i) {
								var subnode = m.subloads[i];
								if (subnode.unmatch) {
									// console.log("m unmatch : ", subnode);
									if (!deep.context("isServer") && subnode.node.controllerNode && subnode.node.controllerNode.value.remove)
										subnode.node.controllerNode.value.remove();
									continue;
								}
								if (subnode.then) {
									subpromises.push(subnode);
									subnode.then(function(m) {
										return renderNode(m);
									});
								} else
									subpromises.push(renderNode(subnode));
							}
							return deep.all(subpromises)
								.done(function() {
									return refreshed;
								});
						}
					});
			}
			// console.log("refreshed : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ", m.output);
		}
		// console.log("no controller")
		if (m.subloads && m.subloads.length > 0) {
			var subpromises = [];
			for (var i = 0, len = m.subloads.length; i < len; ++i) {
				var subnode = m.subloads[i];
				if (subnode.unmatch) {
					// console.log("m unmatch : ", subnode);
					if (!deep.context("isServer") && subnode.node.controllerNode && subnode.node.controllerNode.value.remove)
						subnode.node.controllerNode.value.remove();
					continue;
				}
				if (subnode.then) {
					subpromises.push(subnode);
					subnode.then(function(m) {
						return renderNode(m);
					});
				} else
					subpromises.push(renderNode(subnode));
			}
			return deep.all(subpromises)
				.done(function(s) {
					//console.log("FINAL REFRESH RETURN : ", refreshed, s)
					return refreshed || s;
				});
		}
		return refreshed;
	};

	var refresh = function(matched, route) {
		// console.log("START - refresh");
		//return null;
		
		var toRelink = matched;
		if (!matched.forEach) {
			if (matched.node && !matched.node.controllerNode)
				toRelink = matched.childs;
			matched = [matched];
		}
		var base = matched[0].node;
		var promises = [];
		matched.forEach(function(m) {
			if (m.unmatch) {
				if (!deep.context("isServer") && m.node.controllerNode && m.node.controllerNode.value.remove)
					m.node.controllerNode.value.remove();
				return;
			}
			if (m.node.controllerNode) {
				var config = m.node.controllerNode.value.config ||  {};
				if (config.scope && config.scope !== "both")
					if (deep.context("isServer")) {
						if (config.scope !== "server")
							return;
					} else
				if (config.scope !== "browser")
					return;
			}
			var p = loadNode(m);
			if (p.then) {
				promises.push(p);
				p.then(function(m) {
					return renderNode(m);
				});
			} else
				promises.push(renderNode(p));
		});
		return deep.all(promises)
		.done(function(s){
			return s.shift();
		});
	};

	return {
 		_deep_router_:true,
 		_deep_store_:true,
		_deep_restrictable_: ["get"],
		outputType:"text/html",
		inputType:[],
 		get:function(uri, opt){
 			var output = { 
				status: 200,
				headers:{
					'Content-Type':this.outputType,
					'Location':"/"
				}
			};
			var matched = this.mapper.match(uri);
			if(matched.stillToMatch)
			{
				deep.warn("route contains additional parts that are not understoud. : ", matched.path, matched.route, matched.endChild);
				if(this.stillToMatchHandler)
					return this.stillToMatchHandler(matched, opt);
			}
			else if(matched.noMain)
			{
				deep.warn("route doesn't match any main router", matched);
				if(this.noMainHandler)
					return this.noMainHandler(matched, opt);
			}
			// console.log("matched : ", matched);
 			return deep.when(this.mapper.refresh(matched))
			.done(function(success){
				var $ = deep.$();
				if(deep.context("isServer") && $.html)
					output.result = $.html();
				else
					output.result = success;
				return output;
			})
 		},
 		init:function(){
 			var self = this;
 			return viewsMapper(this.map)
 			.done(function(mapper){
			     self.mapper = mapper;
			})
			.elog();
 		}
 	};
});
