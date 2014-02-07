/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./lib/route", "./lib/mapper", "./lib/route-node"], function(require, deep)
{
    deep.router = deep.router || {};
	deep.errors.Route = function(msg, report, fileName, lineNum) {
        if (typeof msg === 'object')
            report = msg;
        if (!msg)
            msg = "RouterError : ";
        return this.Error(500, msg, report, fileName, lineNum);
    };
    require("./lib/route");
	require("./lib/route-node");
    require("./lib/mapper");

    var closure = {};
    var emitter = new deep.Emitter();

    deep.printRouteMap = function(){
        if(!closure.node)
            return null;
        closure.node.print();
    };

    deep.getRoute = function(){
        if(!closure.node)
            return null;
        return closure.node.getRoute();
    };

    deep.routeMap = function(){
        if(!closure.map)
            return null;
        return closure.map;
    };

    var oldRoute = null;

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
                node.init = function(){
                    var uri = window.location.hash.substring(1) || "/";
                    console.log("route init : ", uri);
                    this.route(uri);
                };
            })
            .logError();
        else
        {
            if(!closure.node)
                throw deep.errors.Error(500,"you need to define a root Route map before using deep.route.");
            if(oldRoute == route)
                 return;
            oldRoute = route;
            //console.log("\ndeep.route : ",route,"\n\n")
            return deep.when(closure.node.route(route));
        }
    };

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

});



