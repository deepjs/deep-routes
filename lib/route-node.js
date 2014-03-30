/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep)
{
	deep.RouteNode = function (parent, entryNode, root)
	{
		this.root = root || null;
		this.parent = parent || null;
		this.controllerNode = entryNode;
		this._deep_route_node_ = true;
		this.childs = [];
		this.router = null;
		var self = this;
		if(entryNode)
		{
			var entry = entryNode.value;
			this._is_ocm_ = entry._deep_ocm_ || false;
			this.path = entryNode.path;
			this.key = entryNode.key;
			// console.log("RouteNode constructor : OCM? ", this._is_ocm_, entryNode.path)
			if(!this._is_ocm_ && entry.route)
				this.router = new deep.Route(entry.route);
		}
		else
		{
			this.path = "/";
			this.key = null;
		}
	};

	var getRoute = function(route, asArray){
		if(!route)
			return this.route;
		var finalRoute = null;
		if(typeof route === 'string' && route[0] == ">" && route[1] == '(')
		{
			finalRoute = this.route.slice();
			var r = route.substring(1);
			var childs = [];
			var parenthesis = deep.utils.catchParenthesis(r);
			while(parenthesis)
			{
				//console.log("catched : ", parenthesis);
				var ch = parenthesis.value;
				ch = ch.split("/");
				for(var i = 0, len = this.childs.length; i < len; ++i)
				{
					var child = this.childs[i];
					var indice = ch[0].indexOf(child.key);
					if(indice === 0)
					{
						ch.shift();
						finalRoute.splice.apply(finalRoute, [child.start, child.endChilds-child.start].concat(ch));
					}
				}
				if(parenthesis.rest)
					parenthesis = deep.utils.catchParenthesis(parenthesis.rest);
				else
					break;
			}
			if(asArray)
				return finalRoute;
			return "/"+finalRoute.join("/");
		}
		if(!route.forEach)
			route = route.split("/");
		switch(route[0])
		{
			case ".." :
				route.shift();
				if(route[0] !== "..")
					route.unshift(".");
				if(this.parent)
					finalRoute = this.parent.getRoute(route);
				else
					finalRoute = null;
				break;
			case "." :
				route.shift();
				finalRoute = this.route.slice();
				finalRoute.splice.apply(finalRoute, [this.start, this.endChilds-this.start].concat(route));
				//console.log("final route : ", finalRoute, this.route, route, this.start, this.endChilds);
				break;
			case ">" :
				route.shift();
				finalRoute = this.route.slice();
				finalRoute.splice.apply(finalRoute, [this.end, this.endChilds-this.end].concat(route));
				break;
			default: // root
				finalRoute = route;
		}
		if(asArray)
			return finalRoute;
		return "/"+finalRoute.join("/");
	};
	var go = function(route){
		// check / ../ ./ >/ >(ch)/
		var finalRoute = this.getRoute(route, true), r = null;
		if(this.node.root)
			r = this.node.root.match(finalRoute);
		else
			r = this.node.match(finalRoute);
		return refresh(r);
		//console.log("go to r : ", r);
	};

	deep.RouteNode.prototype = {
		match: function (rest, index, parentMatch)
		{
			if (!rest.forEach)
			{
				rest = rest.split("/");
				if(rest[0] === '')
					rest.shift();
				if(rest[rest.length-1] === '')          // MODE STRICT = false
					rest.pop();
			}
			// console.log("node match : ", rest, index, this.path);
			index = index || 0;
			var self = this;
			this.startIndex = this.catchedIndex = index;
			if(this._is_ocm_)
			{
				var value = this.controllerNode.value();
				if(!value._ocm_id_)
				{
					var _id_ = Date.now().valueOf();
					// console.log("deepRouteNode . match OCM : entr : ", this.controllerNode, value);
					var node = deep.nodes.clone(this.controllerNode);
					node.value = value;
					var compileNode = function (node, parent, root){
						var subnode = new deep.RouteNode(parent, node, root);
						subnode.path = node.path;
						parent.childs.push(subnode);
						var childs = deep.query(node, "./subs/*", {resultType:"full"});
						if(childs)
							childs.forEach(function(c){
								compileNode(c, subnode, root);
							});
					};
					var subnode = new deep.RouteNode(self.parent, node, self.root);
					subnode.path = node.path;
					var childs = deep.query(node, "./subs/*", {resultType:"full"});
					if(childs)
						childs.forEach(function(c){
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
				_deep_matched_node_:true,
				unmatch:false,
				route:rest,
				catched:null,
				node:this,
				start:index,
				end:index,
				endChilds:index,
				output:null,
				childs:null,
				parent:parentMatch||null,
				path:this.path,
				key:this.key,
				go:go,
				get:getRoute
			};

			if(!this.router)
				match.output = {};
			else
			{
				var res = this.router.match(rest, index, {});
				//console.log("router match : ", this.path, res)
				if(!res)
				{
					match.output = null;
					match.unmatch = true;
					return match;
				}
				match.output = res.output || {};
				match.catched = res.catched || null;
				match.end = index = res.index || index;
			}
			//if(this.parent && this.parent.output)
			//    this.output.parent = this.parent.output;
			//console.log("catch output : ", match.output)
			var childs = [];
			if(this.childs)
				for(var i  = 0, len = this.childs.length; i < len; ++i)
				{
					// console.log("match recusrion on child : ", this.childs[i].path)
					var r = this.childs[i].match(rest, index, match);
					index = r.endChilds || index;
					childs.push(r);
				}
			match.endChilds = index;
			match.childs = (childs.length>0)?childs:null;
			return match;
		},
		go:function(route){
			return refresh(this.match(route), route);
		}
	};

	var loadNode = function(m)
	{
		var subloads = null;
		if(m.childs)
		{
			m.subloads = [];
			for(var i = 0, len = m.childs.length; i < len; ++i)
			{
				var c = m.childs[i];
				if(c.unmatch)
					m.subloads.push(c);
				else
					m.subloads.push(loadNode(c));
			}
		}
		if(!m.node.controllerNode)
			return m;
		return deep(m.node.controllerNode)
		.run("load", [m.output])
		.done(function(res){
			m.loaded = res;
			return m;
		});
	};

	var renderNode = function(m)
	{
		// console.log("RENDER NODE : ", m)
		if(m.unmatch)
		{
			if(deep.isBrowser && m.node.controllerNode && m.node.controllerNode.value.remove)
				m.node.controllerNode.value.remove();
			return null;
		}
		var controllerNode = m.node.controllerNode;
		var refreshed = null;
		if(controllerNode)
		{
			// console.log("try render")
			var entry = controllerNode.value;
			//entry.route(m.node)
			if(entry.refresh)
				refreshed = entry.refresh(m.output, m.loaded, m);
			else
				refreshed = "(nothing)";
			if(refreshed && (refreshed.then || refreshed.promise))
			{
				return deep.when(refreshed)
				.done(function(refreshed){
					// console.log("refreshed : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ",m.output);
					if(m.subloads && m.subloads.length > 0)
					{
						var subpromises = [];
						for(var i = 0, len = m.subloads.length; i < len; ++i)
						{
							var subnode = m.subloads[i];
							if(subnode.unmatch)
							{
								// console.log("m unmatch : ", subnode);
								if(deep.isBrowser && subnode.node.controllerNode && subnode.node.controllerNode.value.remove)
									subnode.node.controllerNode.value.remove();
								continue;
							}
							if(subnode.then)
							{
								subpromises.push(subnode);
								subnode.then(function(m){
									return renderNode(m);
								});
							}
							else
								subpromises.push(renderNode(subnode));
						}
						return deep.all(subpromises)
						.done(function(){
							return refreshed;
						});
					}
				});
			}
			// console.log("refreshed : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ", m.output);
		}
		// console.log("no controller")
		if(m.subloads && m.subloads.length > 0)
		{
			var subpromises = [];
			for(var i = 0, len = m.subloads.length; i < len; ++i)
			{
				var subnode = m.subloads[i];
				if(subnode.unmatch)
				{
					// console.log("m unmatch : ", subnode);
					if(deep.isBrowser &&  subnode.node.controllerNode && subnode.node.controllerNode.value.remove)
						subnode.node.controllerNode.value.remove();
					continue;
				}
				if(subnode.then)
				{
					subpromises.push(subnode);
					subnode.then(function(m){
						return renderNode(m);
					});
				}
				else
					subpromises.push(renderNode(subnode));
			}
			return deep.all(subpromises)
			.done(function(){
				return refreshed;
			});
		}
		return refreshed;
	};

	var refresh = deep.RouteNode.refresh = function(matched, route){
		// console.log("START - refresh");
		//return null;
		var toRelink = matched;
		if(!matched.forEach)
		{
			if(matched.node && !matched.node.controllerNode)
				toRelink = matched.childs;
			matched = [matched];
		}
		var base = matched[0].node;
		var promises = [];
		matched.forEach(function(m){
			if(m.unmatch)
			{
				// console.log("m unmatch : ", m);
				if(deep.isBrowser && m.node.controllerNode && m.node.controllerNode.value.remove)
					m.node.controllerNode.value.remove();
				return;
			}
			var  p = loadNode(m);
			if(p.then)
			{
				promises.push(p);
				p.then(function(m){
					return renderNode(m);
				});
			}
			else
				promises.push(renderNode(p));
		});
		return deep.all(promises)
		.done(function(){
			if(base.root && base.root.emitter)
				base.root.emitter.emit("refreshed", { refreshed:toRelink, route:route });
			else if(base.emitter)
				base.emitter.emit("refreshed", { refreshed:toRelink, route:route });
		});
	};

});





