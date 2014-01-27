/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./parser"], function(require, deep)
{
    deep.router = deep.router || {};
    deep.router.createRootMapper = function(map)
    {
        return deep.flatten(map)
        .done(function(map){
            var mapper = new deep.router.Mapper(map);
            deep.route = function(route){
                var res = mapper.match(route);
                //console.log("deep.route : matched res :  ", res);
                if(res)
                    return doRoute(res.matched);
                return deep.when(null);
            };
            return mapper;
        });
    };

    deep.router.Mapper = function(map, root, parent){
        this._deep_mapper_ = true;
        this.root = root || null;
        this.tests = [];
        this.parent = parent;
        var mapper = this;
        if(map)
            var nodes = deep.query(map, "./*", { resultType:"full" })
            .forEach(function(node){
                var entry = node.value,
                    entryName = node.key,
                    router = null;
                if (entry.route)
                    router = deep.router.compile(entry.route);
                var mapNode = {
                    name: entryName,
                    router: router,
                    childs: null,
                    controllerNode: node
                };
                var ownMapper = new deep.router.Mapper(null, mapper.root || mapper, mapper);
                ownMapper.tests = [mapNode];
                entry.route = function(route)
                {
                    var res = ownMapper.route(route);
                    return doRoute(res.matched);
                };
                mapNode.childs = new deep.router.Mapper(deep.query(node, "./subs", {resultType:"full"}), mapper.root || mapper, mapper);
                mapper.tests.push(mapNode);
            });
    };

    deep.router.Mapper.prototype = {
        route:function(r){
            if(r[0] == ".")
            {
                if(r[1] == ".")     // from parent
                {
                    if(r[3] == '.')
                        return this.parent.route(r.substring(3));
                    return this.parent.route(r.substring(1));
                }
                else                // from me
                    return this.match(r.substring(1));
            }
            else        // from root
            {
                if(this.root)
                    return this.root.match(r);
                return this.match(r);
            }
        },
        match : function (path, output) {
            if (!path.forEach) {
                path = path.split("/");
                if(path[0] === '')
                    path.shift();
                if(path[path.length-1] === '')          // MODE STRICT = false
                    path.pop();
            }
            var originalPath = path.slice(), current = null;
            output = output || {};
            var res = {
                path:path,
                matched:[]
            };
            //console.log("_____________ mapper.match : ", path)
            for (var i = 0; i < this.tests.length; ++i) {
                var handler = this.tests[i],
                o = { controllerNode:handler.controllerNode, childs:null };
                current = path.slice();
                //console.log("___ try entry : ", handler.name, handler.controllerNode.path, path );
                if (handler.router) {
                    //console.log("____________________________________________________ try router : ", handler.router.original );
                    var temp = handler.router.match(path);
                    if (temp) {
                        path = res.path = temp.path;
                        o.output = temp.output;
                        //console.log("***** res mapper match router : ", temp);
                        if(handler.router.inverse)
                        {
                            //console.log("route was inversed")
                            path = current;
                            continue;
                        }
                    }
                    else if(!handler.router.optional && !handler.router.inverse)
                        continue;
                }
                res.matched.push(o);
                if(handler.childs)
                {
                    //console.log("____ try childs");
                    var r = handler.childs.match(path);
                    if(r)
                    {
                        o.childs = r.matched;
                        path = res.path = r.path;
                    }
                    //console.log("____ end childs matched : ", r);
                }
            }
            if(this.isRoot && res.path.length > 0)
                res.matched = [];
            if(res.matched.length === 0)
                res.path = originalPath;
            // console.log("_____________ end mapper.match");
            return res;
        }
    };

    //_________________________________________________________ APPLY ROUTE : load parallely all matched entries, refresh them inorder from root to leaf.
    var doRoute = function(matched){
        //console.log("doRoute : matched : ", matched);
        if(!matched.forEach)
            matched = [matched];
        var loadTree =  function(matched, parentParams){
            var loading = [];
            matched.forEach(function(m){
                if(!m.output)
                    m.output = {};
                var entry = m.controllerNode.value;
                m.output.parent = parentParams || {};
                entry.params = m.output;
                //console.log("matched : " + entry.router + " - "+ JSON.stringify(entry.params));
                if(m.childs)
                    m.subloads = loadTree(m.childs, m.output);
                var  p = deep(m.controllerNode)
                .load()
                .done(function(res){
                    m.loaded = res;
                    return m;
                })
                .fail(function(e){
                    m.error = e;
                    console.error("error while loading controller : ", m.controllerNode.path, " : ", e);
                    return m;
                });
                loading.push(p);
            });
            return loading;
        };
        var roots = loadTree(matched);
        var allRender = [];
        var refreshAll = function(currents){
            currents.forEach(function(m){
                var p = deep.when(m)
                .done(function(m){
                    if(m.error)
                        return m.error;
                    var controllerNode = m.controllerNode;
                    var entry = controllerNode.value;
                    var r = null;
                    if(entry.refresh)
                        r = entry.refresh(entry.params, null);
                    else
                        r = controllerNode.path+ " - with : "+JSON.stringify(entry.params);
                   deep.when(r)
                   .done(function(refreshed){
                        console.log("result : ", refreshed);
                        if(m.subloads)
                            refreshAll(m.subloads);
                   })
                   .fail(function(e){
                        console.error("error while rendering controller : ", e, m);
                   });
                })
                .fail(function(e){
                    console.error("error while loading controller : ", e, m);
                });
                allRender.push(p);
            });
        };
        if(roots)
            refreshAll(roots);
        if(allRender.length > 0)
            return deep.all(allRender);
        return deep.when(null);
    };
});




