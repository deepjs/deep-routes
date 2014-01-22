"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep) {
    deep.router = {};

    deep.errors.Route = function(msg, report, fileName, lineNum) {
        if (typeof msg === 'object')
            report = msg;
        if (!msg)
            msg = "RouterError : ";
        return this.Error(500, msg, report, fileName, lineNum);
    };
    deep.router.types = {};
    deep.router.addType = function(prefix, parser) {
        deep.router.types[prefix] = parser;
    };
    deep.router.addType("i:", function(input) {
        var r = parseInt(input, 10);
        if (!isNaN(r) && r !== Infinity)
            return r;
        return null;
    });
    deep.router.addType("q:", function(input) {
        if (input === null || typeof input == 'undefined')
            return null;
        if (input[0] == "?")
            return input;
        return null;
    });
    deep.router.addType("f:", function(input) {
        var r = parseFloat(input);
        if (!isNaN(r) && r !== Infinity)
            return r;
        return null;
    });
    deep.router.addType("s:", function(input) {
        if (input === null || typeof input == 'undefined')
            return null;
        return input;
    });

    var createKeytest = function(keyName, optional) {
        return function(splittedRoute, output) {
            //console.log("key test : ", keyName, " - optional : ", optional);
            if (splittedRoute[0] == keyName) {
                //console.log("$$$$$$$$$$$$ key test match : ", splittedRoute[0]);
                splittedRoute.shift();
                return splittedRoute;
            }
            if (optional)
                return splittedRoute;
            return false;
        };
    };
    var createBlockTest = function(block, subroute, optional) {
        return function(splittedRoute, output) {
            // from closure : optional + subroute = Router.compile( "/n:start/n:end", true )
            var ok = subroute.match(splittedRoute.slice(), deep.utils.copy(output), true);
            //console.log("$$$$$$$$ analyse block : res : ", ok, " - ", block, splittedRoute, optional);
            if (!ok)
                if (!optional)
                    return false;
                else
                    return splittedRoute;
            deep.utils.up(ok.output, output);
            return ok.path;
        };
    };
    var createVarTest = function(type, name, parser, optional) {
        return function(splittedRoute, output) {
            //console.log("test variable : ", type, name, " - with : ", splittedRoute, " - optional : ", optional);
            // from closure : variable name (query) + type parser (q:) + optional
            var res = parser(splittedRoute[0]);
            //console.log("res : ", res);
            if (res !== null) {
                //console.log("$$$$$$$$$$ variable match : ", name, " : ", res);
                splittedRoute.shift();
                output[name] = res;
                return splittedRoute;
            }
            if (optional)
                return splittedRoute;
            return false;
        };
    };

    deep.router.compile = function(router) {
        var descriptor = {
            _deep_router_: true,
            optional: optional || false,
            original: router
        };
        descriptor.match = function(path, output, fullRes) {
            if (!path.forEach) {
                path = path.split("/");
                path.shift();
            } else
                path = path.slice();
            var originalPath = path.slice();
            output = output || {};
            var self = this;

            var ok = this.tests
                .every(function(t) {
                    path = t.call(self, path, output);
                    //console.log("run temp : ", path);
                    if (path)
                        return true;
                    else
                        return false;
                });
            var res = {
                output: output,
                path: (ok)?path:originalPath
            };
            //console.log("descriptor match : ", path, " - res : ", ok, res.output, res.path);

            if (ok)
                return res;
            return false;
        };
        if (typeof router === 'function') {
            descriptor.tests = [router];
            return descriptor;
        } else {
            var tests = [];
            var p = router;
            var count = 0;

            if (p[count] == '?') {
                descriptor.optional = true;
                count++;
            }
            if (p[count] == '/')
                count++;
            // analyse current 
            while (count < p.length) {
                var optional = false,
                    end = null,
                    handler = null;
                if (p[count] == "?") {
                    optional = true;
                    count++;
                }
                if (p[count] == '(') // block
                {
                    var block = deep.utils.catchParenthesis(p.substring(count)).value;
                    //console.log("_________________________ parsing block : ", block);
                    var subroute = deep.router.compile(block);
                    //console.log("___________________________________ end parsing block");
                    count += block.length + 2;
                    handler = createBlockTest(block, subroute, optional);
                    tests.push(handler);
                } else if (p[count + 1] == ":") // variable
                {
                    var type = p.substring(count, count + 2);
                    //console.log("parse : var type : ", type);
                    var parser = deep.router.types[type];
                    if (!parser)
                        throw deep.errors.Route('error : missformed route : ', router);
                    count += 2;
                    end = p.indexOf("/", count);
                    //console.log("var end : ", end);
                    var name = null;
                    if (end !== -1) {
                        name = p.substring(count, end);
                        count = end;
                    } else {
                        name = p.substring(count);
                        count = p.length;
                    }
                    //console.log("parsing var : ", type, name);
                    handler = createVarTest(type, name, parser, optional);
                    tests.push(handler);
                } else // key
                {
                    end = p.indexOf("/", count);
                    var keyName = p.substring(count, end);
                    count = end;
                    //console.log("parsing key : ", keyName);
                    handler = createKeytest(keyName, optional);
                    tests.push(handler);
                }
                //console.log("end loop : ", p.substring(count), p[count]);
                if (p[count] == "/")
                    count++;
                else if (!handler || count < p.length) {
                    throw deep.errors.Route('error : missformed route : ', router);
                }
            }
            descriptor.tests = tests;
        }
        return descriptor;
    };


    deep.router.createRootMapper = function(map) {
        var mapper = deep.router.createMapper(map);
        deep.route = function(route){
            var res = mapper.match(route);
            console.log("deep.route : matched res :  ", res);
            if(res)
                return doRoute(res.matched);
            return deep.when(null);
        };
        return deep.route;
    };
    deep.router.createMapper = function(map, notRoot) {
        var mapper = {
            _deep_mapper_: true,
            isRoot: !notRoot
        };
        var tests = [];
        var nodes = deep.query(map, "./*", { resultType:"full" })
        .forEach(function(node){
            var entry = node.value;
            var entryName = node.key;
            var router = null;
            if (entry.router)
                router = deep.router.compile(entry.router);
            //console.log("_______________________ end create router");
            var mapNode = {
                name:entryName,
                router: router,
                childs: null,
                controllerNode: node
            };
            mapNode.childs = deep.router.createMapper(deep.query(node, "./subs", {resultType:"full"}), true);
            tests.push(mapNode);
        });

        mapper.match = function(path, output) {
            if (!path.forEach) {
                path = path.split("/");
                if(path[0] === '')
                    path.shift();
            }
            var originalPath = path.slice();
            output = output || {};
            var res = {
                path:path,
                matched:[]
            };
            //console.log("_____________ mapper.match : ", path)
            for (var i = 0; i < tests.length; ++i) {
                //path = originalPath.slice();
                var handler = tests[i],
                    o = { controllerNode:handler.controllerNode, childs:null };
                //console.log("___ try entry : ", handler.name, handler.controllerNode.path, path );
                if (handler.router) {
                    //console.log("____________________________________________________ try router : ", handler.router.original );
                    var temp = handler.router.match(path);
                    if (temp) {
                        path = res.path = temp.path;
                        o.output = temp.output;
                        //console.log("***** res mapper match router : ", temp);
                    }
                    else if(!handler.router.optional)
                        continue;
                }
                res.matched.push(o);
                if (path.length === 0)
                    break;
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
                if (path.length === 0)
                    break;
            }
            if(res.matched.length === 0)
                res.path = originalPath;
            // console.log("_____________ end mapper.match");
            return res;
        };
        return mapper;
    };


    var doRoute = function(matched){
        console.log("doRoute : matched : ", matched);
        var loadTree =  function(matched, parentParams){
            var loading = [];
            matched.forEach(function(m){
                if(!m.output)
                    m.output = {};
                var controllerNode = m.controllerNode;
                var entry = controllerNode.value;
                m.output.parent = parentParams || {};
                entry.params = m.output;
                //console.log("matched : " + entry.router + " - "+ JSON.stringify(entry.params));
                if(m.childs)
                    m.subloads = loadTree(m.childs, m.output);
                var  p = deep(controllerNode)
                .load()
                .done(function(res){
                    m.loaded = res;
                    return m;
                })
                .fail(function(e){
                    m.error = e;
                    console.error("error while loading controller : ", controllerNode.path, " : ", e);
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
                        r = entry.refresh(null, entry.params);
                    else
                        r = "view refreshed : "+controllerNode.path+ " - with : "+JSON.stringify(entry.params);
                   deep.when(r)
                   .done(function(refreshed){
                        console.log("REFRESHED : ", refreshed);
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



/*
    mapper result :

*/
    /*
var descriptor = deep.router.compile("/campaign/?q:query/?(/i:start/i:end)");
console.log("descriptor : ", descriptor);
//descriptor;
console.log(JSON.stringify(descriptor.match("/campaign/?id=12/1/3")));
*/

/*

var exampleMap = {
  campaigns:{
    router:"/campaign/?q:query/?(/i:start/i:end)",
    what:"camp({ start || 0 }, { end || 10 })::{ query || '?' }",
    subs:{
      info:{
        router:"?/info/?s:id",
        what:"info::{ id || '?' }"
      }
    }
  },
  campaign:{
    router:"/campaign/s:id",
    what:"camp::{ id }",
    subs:{
      info:{
        router:"?/info/s:id",
        what:"info::{ id || ('?campID='+parent.id) }"
      },
      update:{
        what:"update::{ id }",
        router:"/update/s:id",
        subs:{
          profile:{
            what:"profile::?updateID={ parent.id }"
          }
        }
      }
    }
  }
};

var mapper = deep.router.createMapper(exampleMap);
mapper.match("/campaign/?id=2");

 */



    return deep.router;
});


