/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require", "deepjs/deep", "./index", "./lib/relink"], function(require, deep, base, relinker){
  //var oldRoute = null;
    var closure = {};
    var emitter = new deep.Emitter();

    deep.isBrowser = true;

    deep.getRoute = function(){
        if(!closure.node)
            return null;
        //return closure.node.getRoute();
    };

    deep.routeMap = function(){
        if(!closure.map)
            return null;
        return closure.map;
    };
    
    deep.route = function(route, strict)
    {
        // console.log("deep.route : ", route, closure.node);
        if(!route)
        {
            if(!closure.node)
                return null;
            return closure.node;
        }
        else if(route._deep_route_node_)
        {
            if(closure.node)
                closure.node.emitter = null;
            closure.node = route;
            if(!route.emitter)
                route.emitter = emitter;
            return route;
        }
        else if(typeof route === 'object')
            return deep.createRouteMap(route, strict)
            .done(function(node){
                closure.map = route;
                closure.node = node;
                node.emitter = emitter;
                node.init = function(uri){
                    uri = uri || window.location.hash.substring(1) || "/";
                    console.log("route init : ", uri, deep.route(uri));
                };
            })
            .logError();
        else
        {
            if(!closure.node)
                throw deep.errors.Error(500,"you need to define a root Route map before using deep.route.");
            //if(oldRoute == route)
            //     return;
            //oldRoute = route;
            var match = closure.node.match(route);
            return deep.when(deep.RouteNode.refresh(match, route))
        }
    };

    for(var i in relinker)
    	deep.route[i] = relinker[i];

    deep.Chain.add("route", function (route) {
        var self = this;
        var func = function (s, e) {
            return deep.route(route);
        };
        func._isDone_ = true;
        deep.utils.addInChain.call(self, func);
        return this;
    });

    deep.route.on = function(type, callback)
    {
        emitter.on(type, callback);
    };
    
    deep.route.remove = function(type, callback)
    {
        emitter.remove(type, callback);
    };

    deep.route.refresh = function(){
        if(!closure.node)
            throw deep.errors.Error(500,"you need to define a root Route map before using deep.route.refresh()");
        return closure.node.refresh();
    };

    deep.ui.View.htmlEnhancers["dp-route"] = function(node){
        var self = this;
        $(node).click(function(e){
            e.preventDefault();
            var route = self.getRoute($(node).attr("dp-route"));
            deep.route(route);
        });
    };

    //_________________________________ DEEP LINK ____________________________________________

    var oldURL = "/";

	deep.route.deepLink = function(config){
		deep.route.on("refreshed", function(event){
			// console.log("ROUTE refreshed : ", event.datas, oldURL);
			var refreshed = event.datas.refreshed;
			if(refreshed)
			{
				if(!refreshed.forEach)
					refreshed = [refreshed];
				refreshed.forEach(function(refreshed){
					// console.log("RELINK : ",refreshed.refreshed);
					if(refreshed.loaded && refreshed.loaded.placed)
						deep.route.relink(refreshed.loaded.placed);
				});
			}
			else
			{
				// console.log("BODY RELINK");
				deep.route.relink("body");
			}
			if(event.datas.route == oldURL)
				return;
			oldURL = event.datas.route;
			window.location.hash = event.datas.route;
		});

		function hashChange(event) {
			var newHash = window.location.hash.substring(1) || "/";
			//console.log("__________________________ hash change : ", newHash, oldURL);
			if(newHash == oldURL)
				return;
			deep.route(newHash || "/");
		}
		if (!window.addEventListener)
		    window.attachEvent("hashchange", hashChange);
		else
		    window.addEventListener("hashchange", hashChange, false);
	};

	return deep.route;
});