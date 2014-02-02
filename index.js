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
    deep.printRouteMap = function(){
        if(!closure.node)
            return null;
        closure.node.print();
    };

    deep.getRoute = function(){
        if(!closure.node)
            return null;
        return closure.node.getRoute();
    }

    deep.route = function(route, strict)
    {
        if(!route)
        {
            if(!closure.node)
                return null;
            return closure.node;
        }
        else if(route._deep_route_node_)
        {
            closure.node = route;
            return route;
        }
        else if(typeof route === 'object')
            return deep.createRouteMap(route, strict)
            .done(function(node){
                closure.node = node;
            })
            .logError();
        else
        {
            if(!closure.node)
                throw deep.errors.Error(500,"you need to define a root Route map before using deep.route.");
            return closure.node.route(route);
        }
    };

    deep.route.refresh = function(){
        if(!closure.node)
            throw deep.errors.Error(500,"you need to define a root Route map before using deep.route.refresh()");
        return closure.node.refresh();
    };

});



