/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./route-node", "./route"], function(require, deep)
{
"use strict";

    deep.createRouteMap = function(map, strict)
    {
        return deep.flatten(map)
        .done(function(map){
            return deep.compileRouteMap(map, strict);
        });
    };

    deep.compileRouteMap = function(map, strict, root, parentNode)
    {
        if(!map)
            return null;
        if(!parentNode)
        {
            parentNode = root = new deep.RouteNode(); //parent, router, entryNode, root
            parentNode.strict = strict;
            parentNode.path = "/";
        }
        deep.query(map, "./*", { fullOutput:true })
        .forEach(function(node){
            var routeNode = new deep.RouteNode(parentNode, node, root);        //parent, router, entryNode, root
            routeNode.path = node.path;
            parentNode.childs.push(routeNode);
            var childs = deep.query(node, "./subs", {fullOutput:true});
            if(childs)
                deep.compileRouteMap(childs, strict, root, routeNode);
        });
        return root;
    };

 
});


