/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 * Eveything specific about deep-routes for browser.
 *
 * Provides mainly deep-link for deep-routes.
 *
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./index"], function(require, deep, base) {
	//var oldRoute = null;
	var closure = {};
	var emitter = new deep.Emitter();

	deep.isBrowser = true;

	deep.route = function(route, strict, fromHistory) {
		// console.log("deep.route : ", route, closure.node);
		if (!route) {
			if (!closure.node)
				return null;
			return closure.node;
		} else if (route._deep_route_node_) {
			if (closure.node)
				closure.node.emitter = null;
			closure.node = route;
			if (!route.emitter)
				route.emitter = emitter;
			return route;
		} else if (typeof route === 'object')
			return deep.structuredRoutes(route, strict)
				.done(function(node) {
					closure.map = route;
					closure.node = node;
					node.emitter = emitter;
					node.init = function(uri) {
						uri = uri || window.location.hash.substring(1) || "/";
						if (uri !== '/' && uri[0] !== '!')
							return;
						if (uri[0] == '!')
							uri = uri.substring(1);
						console.log("route init : ", uri);
						if (history && deep.route.deepLink.config && !deep.route.deepLink.config.useHash)
							history.replaceState({
								url: uri
							}, '');
						//deep.route.relink("body");
						return deep.route(uri);
					};
				})
				.elog();
		else {
			if (!closure.node)
				throw deep.errors.Error(500, "you need to define a root Route map before using deep.route.");
			if (route) {
				var splitted = route.split("#");
				deep.Promise.context.path = route = splitted[0];
				deep.Promise.context.hash = closure.currentHash = splitted[1] || "";
			}
			var match = closure.node.match(route);
			return deep.when(deep.RouteNode.refresh(match, route, fromHistory));
		}
	};

	deep.route.getMap = function() {
		return closure.map;
	}

	deep.route.relinkNode = function() {
		var $ = deep.$();
		if (this._deep_rerouted_)
			return;
		var tagName = $(this).get(0).tagName.toLowerCase(),
			uri = null;
		if (tagName == 'a')
			uri = $(this).attr("href");
		if (!uri)
			return;
		if (uri.substring(0, 4) === 'http')
			return;
		if (uri[0] == '/' && uri[1] == '/') // file
			return;
		this._deep_rerouted_ = true;
		if (deep.route.deepLink.config && deep.route.deepLink.config.hashAsAnchor && (uri[0] == "#" || uri[1] == "#"))
			return;
		// console.log("RELINK : ", uri);
		$(this).click(function(e) {
			e.preventDefault();
			//console.log("click on rerouted dom object : uri : ", uri);
			deep.route(uri);
		});
	};
	deep.route.relink = function(selector) {
		// console.log("relink : ", selector);
		deep.Promise.context.$(selector)
			.find("a")
			.each(deep.route.relinkNode);
	};

	deep.Chain.add("route", function(route) {
		var self = this;
		var func = function(s, e) {
			return deep.route(route);
		};
		func._isDone_ = true;
		deep.utils.addInChain.call(self, func);
		return this;
	});

	deep.route.on = function(type, callback) {
		emitter.on(type, callback);
	};

	deep.route.unbind = function(type, callback) {
		emitter.remove(type, callback);
	};

	deep.route.refresh = function() {
		if (!closure.node)
			throw deep.errors.Error(500, "you need to define a root Route map before using deep.route.refresh()");
		return closure.node.refresh();
	};

	deep.ui.directives["dp-route"] = function(node, context) {
		var self = this;
		$(node).click(function(e) {
			e.preventDefault();
			var route = self.getRoute($(node).attr("dp-route"));
			deep.route(route);
		});
	};

	//_________________________________ DEEP LINK ____________________________________________

	closure.oldURL = "/", closure.currentHash = "";
	deep.route.current = function() {
		return closure.oldURL + "#" + closure.currentHash;
	};
	deep.route.deepLink = function(config) {
		config = deep.route.deepLink.config = config ||  {};
		if (typeof config.useHash === "undefined") {
			if (!window.history.pushState) {
				config.useHash = true;
				config.hashAsAnchor = false;
			} else {
				config.useHash = false;
				config.hashAsAnchor = true;
			}
		}
		deep.route.deepLink.useHash = true;
		deep.route.on("refreshed", function(event) {
			// console.log("ROUTE refreshed : ", event.datas, closure.oldURL);
			// if (event.datas.refreshed)
			if (event.datas.route == closure.oldURL)
				return;
			closure.oldURL = event.datas.route;
			if (config.useHash)
				window.location.hash = closure.oldURL;
			else if (!event.datas.fromHistory) {
				// console.log("REFRESHED NOT FROM HISTORY : ", closure.oldURL+"#"+deep.Promise.context.hash);
				var url = closure.oldURL + (deep.Promise.context.hash ? ("#" + deep.Promise.context.hash) : "");
				window.history.pushState({
					url: url
				}, "", url);
			}
		});

		if (config.useHash) {
			function hashChange(event) {
				var newHash = window.location.hash.substring(1) || "/";
				//console.log("__________________________ hash change : ", newHash, closure.oldURL);
				if (newHash == closure.oldURL)
					return;
				deep.route(newHash || "/");
			}
			if (!window.addEventListener)
				window.attachEvent("hashchange", hashChange);
			else
				window.addEventListener("hashchange", hashChange, false);
		} else
			window.onpopstate = function(e) {
				// console.log("popstate : ", e.state);
				if (e.state) {
					deep.route(e.state.url, false, true);
				}
			};
	};
	/*
    var relinkRefreshed = function(refreshed){
        refreshed.forEach(function(r){
            if(r.unmatch)
                return;
            if(r.loaded && r.loaded.placed)
                deep.route.relink(r.loaded.placed);
            
        })
            
    }*/
	/*window.onbeforeunload = function (evt) {
      var message = 'Are you sure you want to leave?';
      //window.location.href = "/#/"+deep.route.current();
      return;
      if (typeof evt == 'undefined') {
        evt = window.event;
      }
      if (evt) {
        evt.returnValue = message;
      }
      return message;
    };*/

	return deep.route;
});