/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require", "deepjs/deep", "./index"], function(require, deep, base, relinker){
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
    
    deep.route = function(route, strict, fromHistory)
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
                    if(deep.route.deepLink && deep.route.deepLink.config &&  !deep.route.deepLink.config.useHash)
                        history.replaceState({ url: window.location.href }, '');
                };
            })
            .elog();
        else
        {
            if(!closure.node)
                throw deep.errors.Error(500,"you need to define a root Route map before using deep.route.");
            //if(oldRoute == route)
            //     return;
            //oldRoute = route;
            var match = closure.node.match(route);
            return deep.when(deep.RouteNode.refresh(match, route, fromHistory))
        }
    };

    deep.route.relinkNode = function(){
        $ = deep.context.$;
        if(this._deep_rerouted_)
            return;
        var tagName = $(this).get(0).tagName.toLowerCase(), uri = null;
        if(tagName == 'a')
            uri = $(this).attr("href");
        if(!uri)
            return;
        if(uri.substring(0,4) === 'http')
            return;
        if(uri[0] == '/' && uri[1] == '/')   // file
            return;
        //console.log("RELINK : ", uri);
        this._deep_rerouted_ = true;
        $(this).click(function(e){
            e.preventDefault();
            //console.log("click on rerouted dom object : uri : ", uri);
            deep.route(uri);
        });
    };
    deep.route.relink = function(selector){
        $ = deep.context.$;
        // console.log("relink : ", selector);
        $(selector)
        .find("a")
        .each(deep.route.relinkNode);
    };

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
        config = deep.route.deepLink.config = config || {};
        if(typeof config.useHash === "undefined")
            config.useHash = (!window.history.pushState)?true:false;
        deep.route.deepLink.useHash = true;
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
            // console.log("event.datas.route == oldURL ? ", event.datas.route == oldURL)
            // console.log("fromHistory ? ", event.datas)
			if(event.datas.route == oldURL)
				return;
			oldURL = event.datas.route;
			if(config.useHash)
                window.location.hash = oldURL;
            else if(!event.datas.fromHistory)
                window.history.pushState({ url:oldURL },"", oldURL);
		});

        if(config.useHash)
        {
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
        }
        else
            window.onpopstate = function(e){
                // console.log("popstate : ", e.state);
                if(e.state){
                    deep.route(e.state.url, false, true);
                }
            };
	};

	return deep.route;
});