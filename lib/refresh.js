/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * structured routes/deep-views refresh algorithm.
 *
 * Load all controllers parallely.
 * Apply render, dom placement and enhancement (directives) from root to leaf. 
 * So a sub-controller is always rendered, placed in dom and enhanced AFTER its parent and BEFORE its children.
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep){
    "use strict";
	
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
		return deep(m.node.controllerNode)
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
		// console.log("RENDER NODE : ", !m.unmatch, m.node.path)
		if (m.unmatch) {
			if (deep.isBrowser && m.node.controllerNode && m.node.controllerNode.value.remove)
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
									if (deep.isBrowser && subnode.node.controllerNode && subnode.node.controllerNode.value.remove)
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
					if (deep.isBrowser && subnode.node.controllerNode && subnode.node.controllerNode.value.remove)
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
				// console.log("m unmatch : ", m);
				if (deep.isBrowser && m.node.controllerNode && m.node.controllerNode.value.remove)
					m.node.controllerNode.value.remove();
				return;
			}
			if (m.node.controllerNode) {
				var config = m.node.controllerNode.value.config ||  {};
				if (config.scope && config.scope !== "both")
					if (!deep.isBrowser) {
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
		return deep.all(promises);
	};

    return refresh;

});