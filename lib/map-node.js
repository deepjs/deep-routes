/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 * MapNode : a structured map's node.
 * Api : match(uri)
 * 
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./route"], function(require, deep) {
"use strict";
	deep.route = deep.route || {};
	deep.route.MapNode = function(parent, entryNode, root) {
		this.root = root ||  null;
		this.parent = parent ||  null;
		this.controllerNode = entryNode;
		this._deep_route_node_ = true;
		this.childs = [];
		this.router = null;
		var self = this;
		if (entryNode) {
			var entry = entryNode.value;
			this._is_ocm_ = entry._deep_ocm_ || false;
			this.path = entryNode.path;
			this.key = entryNode.key;
			// console.log("MapNode constructor : OCM? ", this._is_ocm_, entryNode.path)
			if (!this._is_ocm_ && entry.route)
				this.router = new deep.Route(entry.route);
		} else {
			this.path = "/";
			this.key = null;
		}
	};

	var getRoute = function(route, asArray) {
		if (!route)
			return this.route;
		var finalRoute = null;
		if (typeof route === 'string' && route[0] == ">" && route[1] == '(') {
			finalRoute = this.route.slice();
			var r = route.substring(1);
			var childs = [];
			var parenthesis = deep.utils.catchParenthesis(r);
			while (parenthesis) {
				//console.log("catched : ", parenthesis);
				var ch = parenthesis.value;
				ch = ch.split("/");
				for (var i = 0, len = this.childs.length; i < len; ++i) {
					var child = this.childs[i];
					var indice = ch[0].indexOf(child.key);
					if (indice === 0) {
						ch.shift();
						finalRoute.splice.apply(finalRoute, [child.start, child.endChilds - child.start].concat(ch));
					}
				}
				if (parenthesis.rest)
					parenthesis = deep.utils.catchParenthesis(parenthesis.rest);
				else
					break;
			}
			if (asArray)
				return finalRoute;
			return "/" + finalRoute.join("/");
		}
		if (!route.forEach)
			route = route.split("/");
		switch (route[0]) {
			case "..":
				route.shift();
				if (route[0] !== "..")
					route.unshift(".");
				if (this.parent)
					finalRoute = this.parent.getRoute(route);
				else
					finalRoute = null;
				break;
			case ".":
				route.shift();
				finalRoute = this.route.slice();
				finalRoute.splice.apply(finalRoute, [this.start, this.endChilds - this.start].concat(route));
				//console.log("final route : ", finalRoute, this.route, route, this.start, this.endChilds);
				break;
			case ">":
				route.shift();
				finalRoute = this.route.slice();
				finalRoute.splice.apply(finalRoute, [this.end, this.endChilds - this.end].concat(route));
				break;
			default: // root
				finalRoute = route;
		}
		if (asArray)
			return finalRoute;
		return "/" + finalRoute.join("/");
	};
	var go = function(route) {
		// check / ../ ./ >/ >(ch)/
		var finalRoute = this.getRoute(route, true),
			r = null;
		if (this.node.root)
			r = this.node.root.match(finalRoute);
		else
			r = this.node.match(finalRoute);
		console.log("go to r : ", r);
		//return refresh(r);
	};

	deep.route.MapNode.prototype = {
		match: function(rest, index, parentMatch) {
			if(!rest)
				return null;
			if (!rest.forEach) {
				rest = rest.split("/");
				if (rest[0] === '')
					rest.shift();
				if (rest[rest.length - 1] === '') // MODE STRICT = false
					rest.pop();
			}
			// console.log("node match : ", rest, index, this.path);
			index = index ||  0;
			var self = this;
			this.startIndex = this.catchedIndex = index;
			if (this._is_ocm_) {
				var value = this.controllerNode.value();
				if (!value._ocm_id_) {
					var _id_ = Date.now().valueOf();
					// console.log("deepRouteNode . match OCM : entr : ", this.controllerNode, value);
					var node = deep.utils.nodes.clone(this.controllerNode);
					node.value = value;
					var compileNode = function(node, parent, root) {
						var subnode = new deep.route.MapNode(parent, node, root);
						subnode.path = node.path;
						parent.childs.push(subnode);
						var childs = deep.query(node, "./subs/*", {
							fullOutput: true
						});
						if (childs)
							childs.forEach(function(c) {
								compileNode(c, subnode, root);
							});
					};
					var subnode = new deep.route.MapNode(self.parent, node, self.root);
					subnode.path = node.path;
					var childs = deep.query(node, "./subs/*", {
						fullOutput: true
					});
					if (childs)
						childs.forEach(function(c) {
							compileNode(c, subnode, self.root);
						});
					this.cache = this.cache || {};
					this.cache[_id_] = subnode; // (map, strict, root, parentNode)
					value._ocm_id_ = _id_;
				}
				var fromOCM = this.cache[value._ocm_id_].match(rest, index);

				return fromOCM;
			}
			var match = this.last = {
				_deep_matched_node_: true,
				unmatch: false,
				route: rest,
				catched: null,
				node: this,
				start: index,
				end: index,
				endChilds: index,
				output: null,
				childs: null,
				parent: parentMatch || null,
				path: this.path,
				key: this.key,
				go: go,
				get: getRoute
			};

			if(this.controllerNode && this.controllerNode.value && this.controllerNode.value.condition && !this.controllerNode.value.condition())
			{
				match.unmatch = true;
				return match;
			}

			if (!this.router)
				match.output = {};
			else {
				var res = this.router.match(rest, index, {});
				//console.log("router match : ", this.path, res)
				if (!res) {
					match.output = null;
					match.unmatch = true;
					return match;
				}
				match.output = res.output ||  {};
				match.catched = res.catched || null;
				match.end = index = res.index || index;
			}
			var childs = [];
			if (this.childs)
				for (var i = 0, len = this.childs.length; i < len; ++i) {
					// console.log("match recusrion on child : ", this.childs[i].path)
					var r = this.childs[i].match(rest, index, match);
					index = r.endChilds || index;
					childs.push(r);
				}
			match.endChilds = index;
			match.childs = (childs.length > 0) ? childs : null;
			return match;
		}/*,
		go: function(route) {
			return refresh(this.match(route), route);
		}*/
	};

	deep.coreUnits = deep.coreUnits || [];
	deep.coreUnits.push("js::deep-routes/units/map-dsl");
});