"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./route"], function(require, deep)
{
    var closure = {};
    deep.printRouteMap = function(){
        if(!closure.node)
            return null;
        closure.node.print();
    };
    deep.route = function(route, strict)
    {
        if(!route)
        {
            if(!closure.node || !closure.node.childs)
                return null;
            return closure.node.getRoute();
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
                        return;
                    }
                    if(!closure.node)
                        throw deep.errors.Error(500, "you try to  reroute from a controller that wasn't on screen");
                    //console.log("________________entry.route will launch doRoute")
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

    var loadNode = function(m)
    {
        var entry = m.controllerNode.value;
        entry.params = m.output;
        //console.log("will doRoute put m in entry : ", m);
        if(!deep.isNode)
            entry.route(m);
        // console.log("load tree : ", m.controllerNode.path, " - ", entry.params);
        if(m.childs)
        {
            m.subloads = [];
            m.childs.forEach(function(c){
                if(!c.output)
                    return;
                m.subloads.push(loadNode(c));
            });
        }
        return deep(m.controllerNode)
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
    };

    var refreshAll = function doRouteRefreshAll(currents){
        var allRender = [];
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
        return allRender;
    }

    deep.RouteNode = function (parent, router, entryNode, root)
    {
        this.root = root || null;
        this.parent = parent || null;
        this.controllerNode = entryNode || null;
        this.router = router || null;
        this._deep_route_node_ = true;
        this.childs = [];
        this.output = null;
        this.catched = null;
        this.catchedIndices = null;
    };

    deep.RouteNode.prototype =   {
        print:function(){
            if(!this.output)
                return;
            console.log("node : ",this.path, JSON.stringify(this.output));
            if(this.childs && this.childs.length > 0)
                this.childs.forEach(function(c){
                    if(c.output)
                        c.print();
                });
        },
        refresh:function(){
            var allRender = null;
            if(!this.root)
            {
                var promises = [];
                this.childs.forEach(function(c){
                    if(!c.output)
                        return;
                    promises.push(loadNode(c));
                });
                allRender = refreshAll(promises);
            }
            else
                allRender = refreshAll([loadNode(this)]);
            if(allRender && allRender.length > 0)
                return deep.all(allRender);
            return deep.when(null);
        },
        match: function (rest, index, parentOutput)
        {
            if (!rest.forEach)
            {
                rest = rest.split("/");
                if(rest[0] === '')
                    rest.shift();
                if(rest[rest.length-1] === '')          // MODE STRICT = false
                    rest.pop();
                index = 0;
            }
            //console.log("node match : ", index, this);
            if(!this.router)
                this.output = {};
            else
            {
                var res = this.router.match(rest, index, {});
                if(!res)
                {
                    if(this.router.optional || this.router.inverse)
                        this.output = {};
                    else
                    {
                        this.output = null;
                        return { rest:rest, index:index };
                    }
                }
                else if(this.router.inverse)
                {
                    this.output = null;
                    return { rest:rest, index:index };
                }
                //console.log("catch output : ", res.output)
                this.output = res.output || {};
                this.catched = res.catched;
                index = res.index;
            }
            if(parentOutput)
                this.output.parent = parentOutput;
            if(this.childs && this.childs.length > 0)
                for(var i  = 0; i < this.childs.length; ++i)
                {
                    var r = this.childs[i].match(rest, index, this.output);
                    if(r)
                        index = r.index;
                }
            return {rest:rest, index:index};
        },
        getRoute:function(route, fromChilds){
            // console.log("route.node : getRoute : ", JSON.stringify(route), this, fromChilds);
            if(!route)
            {
                if(this.root)
                    return this.root.getRoute();
                var output = [];
                var printRouteNode = function(m){
                    if(!m.output)
                        return;
                    if(m.catched)
                        output = output.concat(m.catched);
                    if(m.childs)
                        m.childs.forEach(printRouteNode);
                };
                this.childs.forEach(printRouteNode);
                return "/"+output.join("/");
            }
            var splitted = route;
            if(!route.forEach)
                splitted = route.split("/");
            var cur = splitted.shift();
            switch(cur)
            {
                case "." :          // local
                    //console.log("local case : ", JSON.stringify(splitted), this);
                    if(fromChilds)
                        this.reroute = this.catched.concat(splitted);
                    else
                        this.reroute = splitted;
                    // recompose route and return it as string
                    var routeOutput = [];
                    var printRouteNode2 = function(m){
                        if(!m.output)
                            return;
                        if(m.reroute)
                        {
                            routeOutput = routeOutput.concat(m.reroute);
                            delete m.reroute;
                            return;
                        }
                        if(m.catched)
                            routeOutput = routeOutput.concat(m.catched);
                        if(m.childs)
                            m.childs.forEach(printRouteNode2);
                    };
                    if(this.root)
                        this.root.childs.forEach(printRouteNode2);
                    else
                        this.childs.forEach(printRouteNode2);
                    return "/"+routeOutput.join("/");

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
                        splitted = ["."].concat(splitted);
                        //console.log("parent recursion case : ", JSON.stringify(splitted), this)
                        if(par.root)
                            return par.getRoute(splitted, true);
                        else
                            return par.getRoute(splitted);
                    }
                    return null;
                case "" :           // root
                    //console.log("root case : ", JSON.stringify(splitted), this)
                    return route;
                default : throw deep.errors.Error(500, "bad route from _deep_route_node_ : "+cur+"/"+splitted.join("/"));
            }
        },
        route:function(route, fromChilds){
            //console.log("route.node : route : ", route, fromChilds, this);
            var self = this;
            if(!route.forEach)
                route = route.split("/");
            var cur = route.shift();
            switch(cur)
            {
                case "." :          // local
                    //console.log("try route local : from : ",this, fromChilds)
                    var index = 0;
                    if(!fromChilds)
                        this.match(route);
                    else if(this.childs)
                            this.childs.forEach(function(c){
                                var r = c.match(route, index, self.output);
                                if(r)
                                    index = r.index;
                            });
                    if(this.output)
                        if(fromChilds)
                        {
                            var promises = [];
                            if(this.childs)
                                this.childs.forEach(function(c){
                                    if(c.output)
                                        promises.push(c.refresh());
                                });
                        }
                        else
                            return this.refresh();
                    return null;
                case ".." :         // parent
                    var par = this;
                    while(cur == ".." && par)
                    {
                        par = par.parent;
                        if(route[0] == "..")
                            cur = route.shift();
                        else
                            cur = null;
                    }
                    if(par)
                    {
                        route.unshift(".");
                        if(par.root)
                            return par.route(route, true);
                        else
                            return par.route(route);
                    }
                    return null;
                case "" :           // root
                    //console.log("root case : ", route, this)
                    route.unshift(".");
                    if(this.root)
                        return this.root.route(route);
                    else
                        return this.route(route);
                    break;

                default : throw deep.errors.Error(500, "bad route from _deep_route_node_ : "+cur+"/"+route.join("/"));
            }
        }
    };
});


