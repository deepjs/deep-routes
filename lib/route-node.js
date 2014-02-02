"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep)
{

    deep.RouteNode = function (parent, router, entryNode, root)
    {
        this.original = null;
        this.root = root || null;
        this.parent = parent || null;
        this.controllerNode = entryNode || null;
        this.router = router || null;
        this._deep_route_node_ = true;
        this.childs = [];
        this.output = null;
        this.catched = null;
        this.catchedIndex = null;
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
            //return null;
            var allRender = null;
            if(!this.root)
            {
                var promises = [];
                for(var i = 0, len = this.childs.length;i < len; ++i)
                {
                    var c = this.childs[i];
                    if(!c.output)
                        continue;
                    promises.push(loadNode(c));
                }
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
            }
            index = index || 0;
            //console.log("node match : ", rest, index, this);
            this.startIndex = this.catchedIndex = index;
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
                if(res.catched)
                {
                    this.startIndex = res.index-res.catched.length;
                    this.catchedIndex = res.index;
                }
                this.output = res.output || {};
                this.catched = res.catched;
                index = res.index;
            }
            if(parentOutput)
                this.output.parent = parentOutput;
            if(this.childs)
                for(var i  = 0, len = this.childs.length; i < len; ++i)
                {
                    var r = this.childs[i].match(rest, index, this.output);
                    if(r)
                        index = r.index;
                }
            return {rest:rest, index:index};
        },
        getRoute:function(route, fromChilds, asArray){
            // console.log("route.node : getRoute : ", JSON.stringify(route), this.path, fromChilds);
            if(!route)
            {
                if(this.root)
                    return this.root.getRoute();
                var output = [];
                for(var i  = 0, len = this.childs.length; i < len; ++i)
                    printRouteNode(this.childs[i], output);
                if(asArray)
                    return output;
                return "/"+output.join("/");
            }
            var splitted = route;
            if(!route.forEach)
                splitted = route.split("/");
            var cur = splitted.shift();
            switch(cur)
            {
                case ">" :          // just childs : same case as local
                case "." :          // local
                    // console.log("local case : ", cur, JSON.stringify(splitted), this.path, fromChilds);
                    if(!this.root)
                    {
                        if(asArray)
                            return splitted;
                        return "/"+splitted.join("/");
                    }
                    if(fromChilds || cur == '>')
                        this.reroute = this.catched.concat(splitted);
                    else
                        this.reroute = splitted;
                    // recompose route and return it as string
                    var routeOutput = [], childs = null;
                    if(this.root)
                        childs = this.root.childs;
                    else
                        childs = this.childs;
                    for(var i  = 0, len = childs.length; i < len; ++i)
                        printRouteNode(childs[i], routeOutput);
                    // console.log("getRoute : will return : ", routeOutput)
                    if(asArray)
                        return routeOutput;
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
                        // console.log("parent recursion try : ", JSON.stringify(splitted), this.path)
                    if(par)
                    {
                        splitted = ["."].concat(splitted);
                        // console.log("parent recursion case : ", JSON.stringify(splitted), this.path)
                        return par.getRoute(splitted, true);
                    }
                    return null;
                case "" :           // root
                    return route;
                default : throw deep.errors.Error(500, "bad route from _deep_route_node_ : "+cur+"/"+splitted.join("/"));
            }
        },
        route:function(route, fromChilds){
            // console.log("route.node : route : ", route, fromChilds, this.path);
            var self = this;
            if(!route.forEach)
                route = route.split("/");
            var cur = route.shift();
            switch(cur)
            {
                case ">" :    // childs only
                    if(!this.childs)
                        return null;
                    route.unshift(">");
                    route = this.getRoute(route, true, true);
                    var promises = [];
                    var index = this.catchedIndex || 0;
                    // console.log("try route to childs : from : ",this.path, route, " ------------- : index : ",index, fromChilds)
                    for(var i = 0, len = this.childs.length; i < len; ++i)
                    {
                        var c = this.childs[i];
                        var r = c.match(route, index, self.output);
                        if(r)
                            index = r.index || index;
                        if(c.output)
                            promises.push(c.refresh());
                    }
                    return deep.all(promises);
                case "." :          // local
                    route.unshift(".");
                    route = this.getRoute(route, fromChilds, true);
                    var index = ((fromChilds)?this.catchedIndex:this.startIndex) || 0;
                    // console.log("try route local : from : ",this.path, route, " ------------- : index : ",index, fromChilds)
                    if(!fromChilds)
                        this.match(route, index);
                    else if(this.childs)
                        for(var i = 0, len = this.childs.length; i < len; ++i)
                        {
                            // console.log("local child : ", index)
                            var c = this.childs[i];
                            var r = c.match(route, index, self.output);
                            if(r)
                                index = r.index || index;
                        }
                    if(this.output)
                        if(fromChilds)
                        {
                            if(this.childs)
                            {
                                var promises = [];
                                for(var i = 0, len = this.childs.length; i < len; ++i)
                                {
                                    var c = this.childs[i];
                                    if(c.output)
                                        promises.push(c.refresh());
                                }
                                return deep.all(promises);
                            }
                            return null;
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
                        return par.route(route, true);
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

    var loadNode = function(m)
    {
        m.controllerNode.value.params = m.output;
        //console.log("will doRoute put m in entry : ", m);
        // console.log("load tree : ", m.controllerNode.path, " - ", entry.params);
        if(m.childs)
        {
            m.subloads = [];
            for(var i = 0, len = m.childs.length; i < len; ++i)
            {
                var c = m.childs[i];
                if(!c.output)
                    continue;
                m.subloads.push(loadNode(c));
            }
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
        for(var i = 0, len = currents.length; i < len; ++i)
        {
            var m = currents[i], p = deep.when(m)
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
                        console.log("refreshed : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ",entry.params);
                        m.renderOutput = refreshed;
                        if(m.subloads)
                            return refreshAll(m.subloads);
                   })
                   .fail(function(e){
                        console.error("error while rendering controller : ", e, m);
                   });
                console.log("refreshed : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ",entry.params);
                m.renderOutput = refreshed;
                if(m.subloads)
                    return refreshAll(m.subloads);
            })
            .fail(function(e){
                console.error("error while loading controller : ", e, m);
            });
            allRender.push(p);
        }
        return allRender;
    };

    var printRouteNode = function(m, output){
        // console.log("printRouteNode : ", m);
        if(!m.output || (!m.reroute && !m.catched))
            return;
        var ct = m.catched, endIndex = m.catchedIndex;
        if(m.reroute)
        {
            endIndex = m.startIndex+m.reroute.length;
            ct = m.reroute;
        }
        var dif = 0;
        if(m.startIndex < output.length)
        {
            if(endIndex <= output.length)
                return;
            dif = endIndex - output.length;
        }
        var i = dif, len = ct.length;
        for(; i < len; ++i)
            output.push(ct[i]);
        if(m.reroute)
        {
            delete m.reroute;
            return;
        }
        if(m.childs)
        {
            i = 0;
            len = m.childs.length;
            for(; i < len; ++i)
                printRouteNode(m.childs[i], output);
        }
    };

});





