/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
/*
    feature : recode group test in route map : /[q:query,brol,!truc,(i:start/i:end)]            OK
    
    ROUTE DSL : add $ in end to say : finished with or finished : aka : 
    /campaign/s:id/$     :   say : match me if there is only /campaign/s:id and nothing more        OK

    add route(>info,>update)::./brol   or equivalent                    OK

    so : what's next : 
    - redirection in map? --> as it's an automate : no sens.
            --> maybe set redirection (route transformation) in mapper after compilation.
            they will be at higher priority
            ex : 
            deep.route().redirection("/campaign/s:id", "/brol/{ id }")

    - staters ? will see when it's needed.

    - ocm at any level : 
        - it means that views manage ocm on what, how, where, etc
        - or any route entry itself could be ocm

    - condition in views and routing : 
        maybe routing could handle conditions in same way than views do
        ==> test condition before test route

    - maybe add in route matcher dsl : index of matching in front of route : 
    aka : 4/info/33
    could be label
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./lib/route", "./lib/mapper", "./lib/route-node", "deepjs/lib/view"], function(require, deep)
{
	deep.errors.Route = function(msg, report, fileName, lineNum) {
        if (typeof msg === 'object')
            report = msg;
        if (!msg)
            msg = "RouterError";
        return this.Error(500, msg, report, fileName, lineNum);
    };
    require("./lib/route");
	require("./lib/route-node");
    require("./lib/mapper");


    //var oldRoute = null;
    if(!deep.isNode)
    {
        var closure = {};
        var emitter = new deep.Emitter();

        /*
        deep.printRouteMap = function(){
            if(!closure.node)
                return null;
            closure.node.print();
        };*/

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
                        console.log("route init : ", uri, this.route(uri));
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
                //console.log("\ndeep.route : ",route,"\n\n")
                return deep.when(closure.node.route(route));
            }
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
    }

    deep.coreUnits = deep.coreUnits || [];
    deep.coreUnits.push("js::deep-routes/units/route-dsl");
    deep.coreUnits.push("js::deep-routes/units/map-dsl");

    return deep;
});



