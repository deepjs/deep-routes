/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep)
{
    deep.RouteNode = function (parent, entryNode, root)
    {
        // if(entryNode)
            // console.log("RouteNode constructor : ", entryNode.path);
        this.root = root || null;
        this.parent = parent || null;
        this.controllerNode = entryNode;
        this._deep_route_node_ = true;
        this.childs = [];
        this.output = null;
        this.catched = null;
        this.catchedIndex = null;
        this.router = null;
        var self = this;
        if(entryNode)
        {
            var entry = entryNode.value;
            this._is_ocm_ = entry._deep_ocm_ || false;
            // console.log("RouteNode constructor : OCM? ", this._is_ocm_, entryNode.path)
            if(!this._is_ocm_)
            {
                if(entry.route)
                    this.router = new deep.Route(entry.route);
                if(!deep.isNode)
                {
                    // console.log("set entry API : ", entryNode.path);
                    var closure = { node:self };
                    entry.route = function(route)
                    {
                        if(!route)
                            return closure.node;
                        if(route._deep_route_node_)
                        {
                            ///console.log("swap node : ", closure.node, route);
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
                        // console.log("________________entry.route will launch doRoute : ", route);
                        return closure.node.getRoute(route);
                    };
                }
            }
        }
    };
    deep.RouteNode.prototype = {
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
        match: function (rest, index)
        {
            if (!rest.forEach)
            {
                rest = rest.split("/");
                if(rest[0] === '')
                    rest.shift();
                if(rest[rest.length-1] === '')          // MODE STRICT = false
                    rest.pop();
            }
            // console.log("node match : ", rest, index, this.path);
            index = index || 0;
            var self = this;
            this.startIndex = this.catchedIndex = index;
            if(this._is_ocm_)
            {
                var value = this.controllerNode.value();
                if(!value._ocm_id_)
                {
                    var _id_ = Date.now().valueOf();
                    // console.log("deepRouteNode . match OCM : entr : ", this.controllerNode, value);
                    var node = deep.utils.cloneNode(this.controllerNode);
                    node.value = value;
                    var compileNode = function (node, parent, root){
                        var subnode = new deep.RouteNode(parent, node, root);
                        subnode.path = node.path;
                        parent.childs.push(subnode);
                        var childs = deep.query(node, "./subs/*", {resultType:"full"});
                        if(childs)
                            childs.forEach(function(c){
                                compileNode(c, subnode, root);
                            });
                    }
                    var subnode = new deep.RouteNode(self.parent, node, self.root);
                    subnode.path = node.path;
                    var childs = deep.query(node, "./subs/*", {resultType:"full"});
                    if(childs)
                        childs.forEach(function(c){
                            compileNode(c, subnode, self.root);
                        });
                    this.cache = this.cache || {}; 
                    this.cache[_id_] = subnode; // (map, strict, root, parentNode)
                    value._ocm_id_ = _id_;
                }
                var fromOCM = this.cache[value._ocm_id_].match(rest, index);
                // console.log("FORM OCM : ", fromOCM);
                return fromOCM;
            }
            else if(!this.router)
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
                        return { index:index, unmatch:this.controllerNode };
                    }
                }
                else if(this.router.inverse)
                {                     
                    this.output = null;
                    return { index:index, unmatch:this.controllerNode };
                }
                // console.log("catch output : ", res.output)
                if(res.catched)
                {
                    this.startIndex = res.index-res.catched.length;
                    this.catchedIndex = res.index;
                }
                this.output = res.output || {};
                this.catched = res.catched;
                index = res.index;
            }
            if(this.parent && this.parent.output)
                this.output.parent = this.parent.output;
            var childs = [];
            if(this.childs)
                for(var i  = 0, len = this.childs.length; i < len; ++i)
                {
                    // console.log("match recusrion on child : ", this.childs[i].path)
                    var r = this.childs[i].match(rest, index);
                    if(r)
                    {
                        index = r.index || index;
                        if(r.node || r.unmatch)
                            childs.push(r);
                    }
                }
            return { index:index, node:this, output:this.output, childs:(childs.length>0)?childs:null };
        },
        getRoute:function(route, fromChilds, asArray){
            // console.log("route.node : getRoute : ", route, " - path : ", this.path, " - m : ",this);
            if(!route)
            {
                if(this.root)
                    return this.root.getRoute();
                var output = [];
                for(var i  = 0, len = this.childs.length; i < len; ++i)
                    printRouteNode(this.childs[i], output, 0);
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
                    for(var j = 0, len = splitted.length; j < len; ++j)
                        splitted[j] = deep.utils.interpret(splitted[j], this.output);

                    if(!this.root)
                    {
                        if(asArray)
                            return splitted;
                        return "/"+splitted.join("/");
                    }

                    if((fromChilds || cur == '>') && this.catched)
                        this.reroute = this.catched.concat(splitted);
                    else
                        this.reroute = splitted;
                    // recompose route and return it as string
                    var routeOutput = [], childs = null;
                    if(this.root)
                        childs = this.root.childs;
                    else
                        childs = this.childs;
                    var shift = 0;
                    for(var i = 0, len = childs.length; i < len; ++i)
                        shift = printRouteNode(childs[i], routeOutput, shift);
                    // console.log("getRoute : will return : ", routeOutput)
                    if(asArray)
                        return routeOutput;
                    return "/"+routeOutput.join("/");
                case ".." :         // parent
                    // console.log("parent recursion try : ", JSON.stringify(splitted), this.path)
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
                        // console.log("parent recursion case : ", JSON.stringify(splitted), this.path)
                        return par.getRoute(splitted, true);
                    }
                    return null;
                case "" :           // root
                    return route;
                default : return deep.errors.Error(500, "bad route from _deep_route_node_ : "+cur+"/"+splitted.join("/"));
            }
        },
        route:function(route, fromChilds){
            // console.log("route.node : route : ", route, fromChilds, this.path);
            var self = this, promises;
            if(!route.forEach)
                route = route.split("/");
            var cur = route.shift();
            switch(cur)
            {
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
                case ">" :    // childs only
                    if(!this.childs)
                        return null;
                    route.unshift(">");
                    route = this.getRoute(route, true, true);
                    promises = [];
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
                case "" :
                case "." :          // local
                    route.unshift(".");
                    if(cur === '' && this.root)
                        return this.root.route(route);
                    route = this.getRoute(route, fromChilds, true);
                    var index = ((fromChilds)?this.catchedIndex:this.startIndex) || 0;
                    // console.log("try route local : from : ",this.path, route, " ------------- : index : ",index, fromChilds)
                    var matched = null;
                    if(!fromChilds)
                        matched = this.match(route, index);
                    else if(this.childs)
                    {
                        matched = [];
                        for(var i = 0, len = this.childs.length; i < len; ++i)
                        {
                            // console.log("local child : ", index)
                            var c = this.childs[i], r = c.match(route, index, self.output);
                            if(r)
                            {
                                index = r.index || index;
                                matched.push(r);
                            }
                        }
                    }
                    // console.log("after route match : ", matched);
                    return refresh(matched);
                default : return deep.errors.Error(500, "bad route from _deep_route_node_ : "+cur+"/"+route.join("/"));
            }
        }
    };

    var loadNode = function(m)
    {
        var subloads = null;
        if(m.childs)
        {
            m.subloads = [];
            for(var i = 0, len = m.childs.length; i < len; ++i)
            {
                var c = m.childs[i];
                if(c.unmatch)
                    m.subloads.push(c);
                else
                    m.subloads.push(loadNode(c));
            }
        }
        if(!m.node.controllerNode)
            return m;
        return deep(m.node.controllerNode)
        .run("load", [m.output])
        .done(function(res){
            m.loaded = res;
            return m;
        });
    };

    var renderNode = function(m)
    {
        // console.log("RENDER NODE : ", m)
        if(m.unmatch)
        {
            if(m.unmatch.controllerNode && m.unmatch.controllerNode.placed && deep.jquery.isInDOM(m.unmatch.controllerNode.placed()))
                $(m.unmatch.controllerNode.placed()).remove();
            return null;
        }
        var controllerNode = m.node.controllerNode;
        var refreshed = null;
        if(controllerNode)
        {
            // console.log("try render")
            var entry = controllerNode.value;
            //entry.route(m.node)
            if(entry.refresh)
                refreshed = entry.refresh(m.output, m.loaded);
            else
                refreshed = "(nothing)";
            if(refreshed && (refreshed.then || refreshed.promise))
            {
                return deep.when(refreshed)
                .done(function(refreshed){
                    // console.log("refreshed : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ",m.output);
                    if(m.subloads && m.subloads.length > 0)
                    {
                        var subpromises = [];
                        for(var i = 0, len = m.subloads.length; i < len; ++i)
                        {
                            var subnode = m.subloads[i];
                            if(subnode.unmatch)
                            {
                                // console.log("m unmatch : ", subnode);
                                if(subnode.unmatch && subnode.unmatch.value.placed && deep.jquery.isInDOM(subnode.unmatch.value.placed()))
                                    $(subnode.unmatch.value.placed()).remove();
                                continue;
                            }
                            if(subnode.then || subnode.promise)
                            {
                                subpromises.push(subnode);
                                subnode.done(function(m){
                                    return renderNode(m);
                                });
                            }
                            else
                                subpromises.push(renderNode(subnode));
                        }
                        return deep.all(subpromises)
                        .done(function(){
                            return refreshed;
                        });
                    }
                });
            }
            // console.log("refreshed : ", controllerNode.path, " - ", refreshed.rendered || refreshed, " - with : ", m.output);
        }
        // console.log("no controller")
        if(m.subloads && m.subloads.length > 0)
        {
            var subpromises = [];
            for(var i = 0, len = m.subloads.length; i < len; ++i)
            {
                var subnode = m.subloads[i];
                if(subnode.unmatch)
                {
                    // console.log("m unmatch : ", subnode);
                    if(subnode.unmatch && subnode.unmatch.value.placed && deep.jquery.isInDOM(subnode.unmatch.value.placed()))
                        $(subnode.unmatch.value.placed()).remove();
                    continue;
                }
                if(subnode.then || subnode.promise)
                {
                    subpromises.push(subnode);
                    subnode.done(function(m){
                        return renderNode(m);
                    });
                }
                else
                    subpromises.push(renderNode(subnode));
            }
            return deep.all(subpromises)
            .done(function(){
                return refreshed;
            });
        }
        return refreshed;
    };

    var refresh = function(matched){
        //return null;
        var toRelink = matched;
        if(!matched.forEach)
        {
            if(matched.node && !matched.node.controllerNode)
                toRelink = matched.childs;
            matched = [matched];
        }
        var base = matched[0].node;
        var promises = [];
        var len = matched.length;
        for(var i = 0; i < len; ++i)
        {
            var  m = matched[i];
            if(m.unmatch)
            {
                // console.log("m unmatch : ", m);
                if(m.unmatch && m.unmatch.value.placed && deep.jquery.isInDOM(m.unmatch.value.placed()))
                    $(m.unmatch.value.placed()).remove();
                continue;
            }

            var  p = loadNode(m);
            if(p.then || p.promise)
            {
                promises.push(p);
                p.done(function(m){
                    return renderNode(m);
                });
            }
            else
                promises.push(renderNode(p));
        }

        return deep.all(promises)
        .done(function(){
            //console.log("end render __________________________________________________________ ")
            // emit refreshed event
            if(base.root && base.root.emitter)
                base.root.emitter.emit("refreshed", { refreshed:toRelink, route:deep.getRoute() });
            else if(base.emitter)
                base.emitter.emit("refreshed", { refreshed:toRelink, route:deep.getRoute() });
        });
    };

    var printRouteNode = function(m, output, shift){
        //console.log("printRouteNode : ", shift, m.path, m.output, m.catched, m.reroute, m.startIndex, m.catchedIndex);
        if(!m.output || (!m.reroute && !m.catched))
            return shift;
        var ct = m.catched, endIndex = m.catchedIndex + shift;
        if(m.reroute)
        {
            if(!m.catched)
                shift += m.reroute.length;
            else if(m.catched.length != m.reroute.length)
                shift += m.reroute.length - m.catched.length;
            endIndex = m.startIndex+shift+m.reroute.length;
            ct = m.reroute;
        }
        var dif = 0;
        if(m.startIndex+shift < output.length)
        {
            if(endIndex <= output.length)
                return shift;
            dif = endIndex - output.length;
        }
        var i = dif, len = ct.length;
        for(; i < len; ++i)
            output.push(ct[i]);
        if(m.reroute)
        {
            delete m.reroute;
            return shift;
        }
        if(m.childs)
        {
            i = 0;
            len = m.childs.length;
            for(; i < len; ++i)
                shift = printRouteNode(m.childs[i], output, shift);
        }
        return shift;
    };

});





