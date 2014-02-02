/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep)
{

    deep.createRouteMap = function(map, strict){
        return deep.flatten(map)
        .done(function(map){
            return deep.compileRouteMap(map, strict);
        });
    };

    deep.compileRouteMap = function(map, strict, root, parentNode){
        if(!map)
            return null;

        if(!parentNode)
        {
            parentNode = root = new deep.RouteNode(); //parent, router, entryNode, root
            parentNode.strict = strict;
            parentNode.path = "/";
        }

        var nodes = deep.query(map, "./*", { resultType:"full" })
        .forEach(function(node){
            var entry = node.value,
                router = null;
            if (entry.route)
                router = new deep.Route(entry.route);
            var routeNode = new deep.RouteNode(parentNode, router, node, root);        //parent, router, entryNode, root
            routeNode.path = node.path;
            parentNode.childs.push(routeNode);
            if(!deep.isNode)
            {
                var closure = {};
                entry.route = function(route)
                {
                    if(!route)
                        return closure.node;
                    if(route._deep_route_node_)
                    {
                        //console.log("swap node : ", closure.node, route);
                        closure.node = route;
                        return route;
                    }
                    if(!closure.node)
                        throw deep.errors.Error(500, "you try to  reroute from a controller that wasn't on screen");
                    // console.log("________________entry.route will launch doRoute : ", route)
                    return closure.node.route(route);
                };
                entry.getRoute = function(route)
                {
                    if(!closure.node)
                        throw deep.errors.Error(500, "you try to  getRoute from a controller that wasn't on screen");
                    //console.log("________________entry.route will launch doRoute")
                    return closure.node.getRoute(route);
                };
            }
            var childs = deep.query(node, "./subs", {resultType:"full"});
            deep.compileRouteMap(childs, strict, root, routeNode);
        });
        return parentNode;
    };

 
});


