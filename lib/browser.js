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

	deep.route = function(route, strict, fromInit) {
		// console.log("deep.route start : ", route);
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
						uri = uri || (window.location.pathname+window.location.hash) || window.location.hash.substring(1) || "/";
						console.log("route init : ", uri);
						if (uri !== '/' && uri[0] !== '!')
							return;
						if (uri[0] == '!')
							uri = uri.substring(1);
						return deep.route(uri, false, true);
					};
				})
				.elog();
		else {
			if (!closure.node)
				throw deep.errors.Error(500, "you need to define a root Route map before using deep.route.");
			var splitted = route.split("#"), p = new deep.Promise();
				//match = closure.node.match(splitted[0]);

			var routeData = {
				url:route,
				path:splitted[0],
				anchor:splitted[1] || "",
				promise: function(){ return p; }
				/*,matched:function(){ return match; }*/
			};
			var old = deep.context('route');
			console.log("deep.route : ", routeData, old, fromInit);
			if(fromInit || !old || old.url != routeData.url)
			{
				if (typeof History !== 'undefined')
					if(fromInit)
					{
						//console.log("will replace state at init");
						//History.replaceState(routeData, 'hihi');
						return deep.route.go(routeData.path);
					}
					else
					{
						console.log("deep.route . PUSH STATE : ", routeData.url);
						History.pushState(routeData, '', routeData.url);
					}	
			}
			else
				p.resolve(null);

			return p;
			//return deep.when(deep.RouteNode.refresh(match, routeData.path));
		}
	};


	deep.route.go = function(path){
		if(!path)
			throw deep.errors.Route("bad route : "+path)
		var match = closure.node.match(path);
		return deep.RouteNode.refresh(match, path);
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
		if (deep.route.deepLink.config && uri[0] == "#")
			return;
		// console.log("RELINK : ", uri, this);
		$(this).click(function(e) {
			e.preventDefault();
			console.log("click on rerouted dom object : uri : ", uri);
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
		deep.Promise.addInChain.call(self, func);
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

	deep.route.current = function() {
		var route = deep.context('route');
		return route.path + "#" + route.hash;
	};
	deep.route.deepLink = function(config) {
		config = deep.route.deepLink.config = config ||  {};
		/*if (typeof config.useHash === "undefined") {
			if (!window.history.pushState) {
				config.useHash = true;
				config.hashAsAnchor = false;
			} else {
				config.useHash = false;
				config.hashAsAnchor = true;
			}
		}*/
		//deep.route.deepLink.useHash = true;
		deep.route.on("refreshed", function(event) {
			// if (event.datas.refreshed)
			/*if (event.datas.route == closure.oldURL)
				return;
			console.log("ROUTE refreshed : ", event.datas.route, closure.oldURL);
			deep.context("route", { url:"", path:event.datas.route, hash:""});
			closure.oldURL = event.datas.route;
			if (config.useHash)
				window.location.hash = closure.oldURL;
			else if (!event.datas.fromHistory) {
				var hash = deep.context('hash');
				console.log("REFRESHED NOT FROM HISTORY : ", closure.oldURL+"#"+hash);
				
				var url = closure.oldURL + (hash ? ("#" + hash) : "");
				//console.log("refreshed: ", url, History.getState());

				if(History.getState().data.url !== url)
				{
					console.log("push new state on refresh");
					History.pushState({
						url:url,
						path: closure.oldURL,
						hash: hash
					}, "", url);
				}
			}*/
		});

		/*if (config.useHash) {
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
		} else {
			window.onpopstate = function(e) {
				console.log("popstate : ", e.state);
				if (e.state) {
					deep.route(e.state.url, false, true);
				}
			};*/


			
			

				/*History.options.disableSuid = true;
				History.options.debug = true;
				//History.options.html4Mode = true;
			    // Bind to StateChange Event
			    // 
			    // 
				History.Adapter.bind(window,'hashchange',function(){ // Note: We are using statechange instead of popstate
			        var State = History.getState(); // Note: We are using History.getState() instead of event.state
				    	console.log("hashchange : ", State);
					
			    });
			    History.Adapter.bind(window,'statechange',function(){ // Note: We are using statechange instead of popstate
			        var State = History.getState(); // Note: We are using History.getState() instead of event.state
				    	console.log("statechange : ", State);
					if (State) {
				    	console.log("statechange : data : ", State.data);
				    	var data = State.data;
						deep.context("route", data);
						data.path = data.path || "/";
						var p = data.promise;
						data.promise = null;
						var d = deep.route.go(data.path);
						if(p)
						{
							p = p();
							d.done(function(s){
								p.resolve(s);
							})
							.fail(function(e){
								p.reject(e);
							});
						}
					}
			    });*/
			    /*History.Adapter.bind(window,'anchorchange',function(){ // Note: We are using statechange instead of popstate
			        var State = History.getState(); // Note: We are using History.getState() instead of event.state
					if (State) {
				    	console.log("anchorchange : ", State.data, State);
				    	
					}
			    });*/
			    // Change our States
			   /* History.pushState({state:1}, "State 1", "?state=1"); // logs {state:1}, "State 1", "?state=1"
			    History.pushState({state:2}, "State 2", "?state=2"); // logs {state:2}, "State 2", "?state=2"
			    History.replaceState({state:3}, "State 3", "?state=3"); // logs {state:3}, "State 3", "?state=3"
			    History.pushState(null, null, "?state=4"); // logs {}, '', "?state=4"
			    History.back(); // logs {state:3}, "State 3", "?state=3"
			    History.back(); // logs {state:1}, "State 1", "?state=1"
			    History.back(); // logs {}, "Home Page", "?"
			    History.go(2); // logs {state:3}, "State 3", "?state=3"*/


		//}
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