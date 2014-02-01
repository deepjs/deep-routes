/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./route"], function(require, deep)
{
    deep.router = deep.router || {};
    deep.route = function(route){
        console.warn("no root route mapper defined yet. please use deep.router.createRootMapper(map) to iniate one.");
    };

    deep.router.createRootMapper = function(map, strict)
    {
        var closure = {};
        return deep.flatten(map)
        .done(function(map){
            var mapper = new deep.router.Mapper(map, null, null, strict);
            deep.route = function(route){
                if(!route)
                {
                    //console.log("GET ROUTE FROM : ", closure.res);
                    if(!closure.res || !closure.res.childs)
                        return null;
                    // recompose route and return it as string
                    var routeOutput = [];
                    var printRouteNode = function(m){
                        if(m.catched)
                            routeOutput = routeOutput.concat(m.catched);
                        if(m.childs)
                            m.childs.forEach(printRouteNode);
                    };
                    closure.res.childs.forEach(printRouteNode);
                    var output = "/"+routeOutput.join("/");
                    //console.log("deep.route() : output ", output);
                    return output;
                }
                else
                {
                    var res = mapper.match(route);
                    res.mapper = mapper;
                    //console.log("deep.route : matched res :  ", res.catched, res.path, res.output);
                    if(!res || res.childs.length === 0)
                        console.log("nothing match with route : ", route);
                    else if(res)
                    {
                        //console.log("________________ deep.route gives : ", res);
                        closure.res = res;
                        return doRoute(res.childs);
                    }
                    return null;
                }
            };
            return mapper;
        });
    };

    deep.router.Mapper = function(map, root, parent, strict){
        this._deep_mapper_ = true;
        this.root = root || null;
        this.tests = [];
        this.parent = parent;
        this.strict = strict;
        var mapper = this;
        if(map)
            var nodes = deep.query(map, "./*", { resultType:"full" })
            .forEach(function(node){
                var entry = node.value,
                    entryName = node.key,
                    router = null;
                if (entry.route)
                    router = new deep.Route(entry.route);
                var mapNode = {
                    name: entryName,
                    router: router,
                    childs: null,
                    controllerNode: node,
                    mapper:null
                };

                if(!deep.isNode)
                {
                    var ownMapper = new deep.router.Mapper(null, mapper.root || mapper, mapper);
                    mapNode.mapper = ownMapper;
                    ownMapper.name = node.path+"(own)";
                    ownMapper.tests = [mapNode];
                    var closure = {};
                    entry.route = function(route)
                    {
                        if(!route)
                        {
                            if(!closure.node)
                                return null;
                       
                            var cur = closure.node;
                            return cur.catched;
                        }
                        if(route === true)
                            return closure.node;
                        if(route._deep_route_node_)
                        {
                            //console.log("swap node : ", closure.node, route);
                            closure.node = route;
                            return;
                        }
                        if(!closure.node)
                            throw deep.errors.Error(500, "you try to  reroute from a controller that wasn't on screen");
                        //console.log("________________entry.route will launch doRoute")
                        return closure.node.route(route);
                    };
                }
                mapNode.childs = new deep.router.Mapper(deep.query(node, "./subs", {resultType:"full"}), mapper.root || mapper, mapper);
                mapNode.childs.name = node.path;
                mapper.tests.push(mapNode);
            });
    };


    function createRouteNode(parent, rest, mapper, entryNode, root){
        return  {
                _deep_route_node_:true,
                parent:parent || null,
                index:null,
                controllerNode:entryNode || null,
                childs:[],
                output:null,
                catched:null,
                root:root || null,
                mapper:mapper || null,
                route:function(route, fromChilds){
                    //console.log("route.node : route : ", route, fromChilds, this);
                    var splitted = route;
                    if(!route.forEach)
                        splitted = route.split("/");
                    var cur = splitted.shift();
                    switch(cur)
                    {
                        case "." :          // local
                            if(!this.mapper)
                            {

                            }
                            var r = this.mapper.match(splitted, null, null, null, null, fromChilds),  // rest, output, basePath, parentNode, root, fromChilds
                                node = r.childs[0];
                            if(!node)
                                return null;
                            node.parent = this.parent;
                            node.root = this.root;
                            if(this.parent)
                            {   
                                node.index = this.index;
                                this.parent.childs[this.index] = node;
                            }
                            if(fromChilds)
                            {
                                node.output = this.output;
                                node.catched = this.catched;
                            }
                            if(fromChilds)
                                return doRoute([node]);
                            else
                                return doRoute(r.childs);
                        case ".." :         // parent
                            var par = this;
                            while(cur == ".." && par)
                            {
                                par = par.parent;
                                if(splitted[0] == "..")
                                    cur = splitted.shift();
                                else
                                    cur = null;
                            }
                            if(par)
                            {
                                splitted.unshift(".");
                                if(par.root)
                                    return par.route(splitted, true);
                                else
                                    return par.route(splitted);
                            }
                            return null;
                        case "" :           // root
                            //console.log("root case : ", route, this)
                            if(this.root)
                            {
                                splitted.unshift(".");
                                return this.root.route(splitted);
                            }
                            return null;
                        default : throw deep.errors.Error(500, "bad route from _deep_route_node_ : "+cur+"/"+splitted.join("/"));
                    }
                }
            };

    }

    deep.router.Mapper.prototype = {
        match : function (rest, output, basePath, parentNode, root, fromChilds)
        {
            //console.log("deep.router.Mapper.match : rest : ", rest);
            if (!rest.forEach)
            {
                rest = rest.split("/");
                if(rest[0] === '')
                    rest.shift();
                if(rest[rest.length-1] === '')          // MODE STRICT = false
                    rest.pop();
            }
            if(!basePath)
            {
                basePath = rest.slice();
                basePath._root = true;
            }
            var originalPath = rest.slice(), current = null;
            output = output || {};
            var res = createRouteNode(null, null, null, null, null); //parent, rest, mapper, entryNode, root
            res.rest = rest;
            //console.log("_____________ mapper.match : ", rest)
            for (var i = 0; i < this.tests.length; ++i)
            {
                var handler = this.tests[i],
                    routeNode = createRouteNode(parentNode || res, null, handler.mapper, handler.controllerNode, root || res);//parent, rest, mapper, entryNode, root
                current = rest.slice();
                //console.log("___ try entry : ", handler.name, handler.controllerNode.path, rest );
                if (!fromChilds && handler.router)
                {
                    // console.log("____________________________________________________ try router : ", handler.router.original );
                    var cpath = rest;
                    if(!handler.router.local)
                    {
                        // console.log("non local router : ",rest, basePath);
                        cpath = basePath.slice();
                        cpath._root = true;
                    }
                    var temp = handler.router.match(cpath);
                    if (temp)
                    {
                        routeNode.catched = temp.catched;
                        rest = res.rest = temp.rest;
                        routeNode.output = temp.output;
                        // console.log("***** res mapper match router : ", temp);
                        if(handler.router.inverse)
                        {
                            //console.log("route was inversed")
                            rest = current;
                            continue;
                        }
                    }
                    else if(!handler.router.optional && !handler.router.inverse)
                    {
                        // console.log("error and !optional && !inverse")
                        continue;
                    }
                }
                //console.log("add : ",routeNode);
                if(handler.childs)
                {
                    //console.log("____ try childs");
                    var r = handler.childs.match(rest, null, basePath, routeNode, root||res); // rest, output, basePath, parentNode, root
                    if(r)
                    {
                        routeNode.childs = r.childs;
                        rest = res.rest = r.rest;
                    }
                    //console.log("____ end childs matched : ", r);
                }
                if(!fromChilds || (routeNode.childs && routeNode.childs.length !== 0))
                {
                    routeNode.index = res.childs.length;
                    res.childs.push(routeNode);
                }
            }
            //console.log("_____________ end mapper.match", this.root, res.childs, res.rest);
            
            if(this.strict && !this.root && res.rest.length > 0)
                res.childs = [];
            //else
            if(res.childs.length === 0)
                res.rest = originalPath;
            // console.log("_____________ end mapper.match");
            return res;
        }
    };

    //_________________________________________________________ APPLY ROUTE : load parallely all matched entries, refresh them inorder from root to leaf.
    var doRoute = function(matched){
        //return null;
        //console.log("doRoute : matched : ", matched);
        if(!matched.forEach)
            matched = [matched];
        var loadTree =  function doRouteLoadTree(matched, parentParams){
            var loading = [];
            matched.forEach(function(m){
                //console.log("doRoute : loadtree on : ", m)
                if(!m.output)
                    m.output = {};
                var entry = m.controllerNode.value;
                m.output.parent = parentParams || {};
                entry.params = m.output;
                //console.log("will doRoute put m in entry : ", m);
                if(!deep.isNode)
                    entry.route(m);
                // console.log("load tree : ", m.controllerNode.path, " - ", entry.params);
                if(m.childs)
                    m.subloads = loadTree(m.childs, m.output);
                var p = deep(m.controllerNode)
                .run("load", [m.output])
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
        var refreshAll = function doRouteRefreshAll(currents){
            currents.forEach(function(m){
                var p = deep.when(m)
                .done(function(m){
                    if(m.error)
                        return m.error;
                    var controllerNode = m.controllerNode;
                    var entry = controllerNode.value;
                    var refreshed = null;
                    if(entry.refresh)
                        refreshed = entry.refresh(entry.params, m.loaded);
                    else
                        refreshed = "(nothing)";
                    if(refreshed && (refreshed.then || refreshed.promise))
                       return deep.when(refreshed)
                       .done(function(refreshed){
                            console.log("result : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ",entry.params);
                            m.renderOutput = refreshed;
                            if(m.subloads)
                                return refreshAll(m.subloads);
                       })
                       .fail(function(e){
                            console.error("error while rendering controller : ", e, m);
                       });
                    console.log("direct result : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ",entry.params);
                    m.renderOutput = refreshed;
                    if(m.subloads)
                        return refreshAll(m.subloads);
                })
                .fail(function(e){
                    console.error("error while loading controller : ", e, m);
                });
                allRender.push(p);
            });
        };
        //return roots;
        if(roots)
            refreshAll(roots);
        if(allRender.length > 0)
            return deep.all(allRender);
        return deep.when(null);
    };
});


