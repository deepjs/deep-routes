/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./map-node"], function(require, deep)
{
    "use strict";
    deep.route = deep.route || {};
    var compile = function(map, strict, root, parentNode)
    {
        if(!map)
            return null;
        if(!parentNode)
        {
            parentNode = root = new deep.route.MapNode(); //parent, router, entryNode, root
            parentNode.strict = strict;
            parentNode.path = "/";
        }
        deep.query(map, "./*", { fullOutput:true })
        .forEach(function(node){
            var routeNode = new deep.route.MapNode(parentNode, node, root);        //parent, router, entryNode, root
            routeNode.path = node.path;
            parentNode.childs.push(routeNode);
            var childs = deep.query(node, "./subs", {fullOutput:true});
            if(childs)
                compile(childs, strict, root, routeNode);
        });
        return root;
    };
    deep.route.structuredMapper = function(map, strict)
    {
        return deep.flatten(map)
        .done(function(map){
            return compile(map, strict);
        });
    };
    return deep.route.structuredMapper;
});


