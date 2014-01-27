/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep)
{
    deep.router = deep.router || {};
    deep.router.types = {};
    deep.router.addType = function(prefix, parser) {
        deep.router.types[prefix] = parser;
    };
    deep.router.addType("i:", function(input) { // integer
        var r = parseInt(input, 10);
        if (!isNaN(r) && r !== Infinity)
            return r;
        return null;
    });
    deep.router.addType("q:", function(input) {     // query
        if (input === null || typeof input == 'undefined')
            return null;
        if (input[0] == "?")
            return input;
        return null;
    });
    deep.router.addType("f:", function(input) {     // float
        var r = parseFloat(input);
        if (!isNaN(r) && r !== Infinity)
            return r;
        return null;
    });
    deep.router.addType("s:", function(input) {        // string
        if (input === null || typeof input == 'undefined')
            return null;
        return input;
    });

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
            var ok = this.tests.every(function(t) {
                path = t.call(self, path, output);
                //console.log("run temp : ", path);
                if (path)
                    return true;
                return false;
            });
            //console.log("descriptor match : ", path, " - res : ", ok, res.output, res.path);
            if (ok)
                return {
                output: output,
                path: (ok)?path:originalPath
            };
            return false;
        };
        // _______________  DO COMPILATION
        if (typeof router === 'function') {
            descriptor.tests = [router];
            return descriptor;
        } else {
            var p = router,
                tests = [],
                count = 0;
            if (p[0] == '?')    {
                descriptor.optional = true;
                count++;
            }
            else if (p[0] == '!') {
                descriptor.inverse = true;
                count++;
            }
            if (p[count] == '.')
            {
                count++;
                descriptor.local = true;
            }
            if (p[count] == '/')
                count++;
            // analyse current 
            while (count < p.length) {
                var optional = false,
                    end = null,
                    handler = null,
                    inversed = false;
                if (p[count] == "?") {
                    optional = true;
                    count++;
                }
                else if (p[count] == '!') {
                    inversed = true;
                    count++;
                }
                if (p[count] == '(') // block
                {
                    var block = deep.utils.catchParenthesis(p.substring(count)).value;
                    //console.log("_________________________ parsing block : ", block);
                    var subroute = deep.router.compile(block);
                    //console.log("___________________________________ end parsing block");
                    count += block.length + 2;
                    handler = createBlockTest(block, subroute, optional, inversed);
                    tests.push(handler);
                } else if (p[count + 1] == ":") // variable
                {
                    var type = p.substring(count, count + 2);
                    //console.log("parse : var type : ", type);
                    var parser = deep.router.types[type];
                    if (!parser)
                        throw deep.errors.Route('error : missformed route : no parser with type : '+type, router);
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
                    handler = createVarTest(type, name, parser, optional, inversed);
                    tests.push(handler);
                } else // key
                {
                    end = p.indexOf("/", count);
                    if(end == -1)
                        end = p.length;
                    var keyName = p.substring(count, end);
                    if(keyName[0] == '[')
                        keyName = keyName.substring(1,keyName.length-1).split(',');
                    //console.log("parsing key : ", keyName);
                    handler = createKeytest(keyName, optional, inversed);
                    tests.push(handler);
                    count = end;
                    
                }
                //console.log("end loop : ", p.substring(count), p[count]);
                if (p[count] == "/")
                    count++;
                else if (!handler || count < p.length) {
                    throw deep.errors.Route('error : missformed route (!handler || count < p.length) : ', router);
                }
            }
            descriptor.tests = tests;
        }
        return descriptor;
    };

    var createKeytest = function(keyName, optional, inversed) {
        return function(splittedRoute, output) {
            //console.log("key test : ", keyName, " - optional : ", optional);
            var ok = false;
            if(keyName.forEach)
                ok = deep.utils.inArray(splittedRoute[0], keyName);
            else
                ok = (splittedRoute[0] === keyName);
            if(ok)
            {
                if(inversed)
                    return false;
                //console.log("$$$$$$$$$$$$ key test match : ", splittedRoute[0]);
                splittedRoute.shift();
                return splittedRoute;
            }
            if (optional || inversed)
                return splittedRoute;
            return false;
        };
    };
    var createBlockTest = function(block, subroute, optional, inversed) {
        return function(splittedRoute, output) {
            var ok = subroute.match(splittedRoute.slice(), deep.utils.copy(output), true);
            //console.log("$$$$$$$$ analyse block : res : ", ok, " - ", block, splittedRoute, optional);
            if (!ok)
            {
                if (optional || inversed)
                    return splittedRoute;
                return false;
            }
            if(inversed)
                return false;
            deep.utils.up(ok.output, output);
            return ok.path;
        };
    };
    var createVarTest = function(type, name, parser, optional, inversed) {
        return function(splittedRoute, output) {
            //console.log("test variable : ", type, name, " - with : ", splittedRoute, " - optional : ", optional);
            var res = parser(splittedRoute[0]);
            //console.log("res : ", res);
            if (res !== null) {
                if(inversed)
                    return false;
                //console.log("$$$$$$$$$$ variable match : ", name, " : ", res);
                splittedRoute.shift();
                output[name] = res;
                return splittedRoute;
            }
            if (optional || inversed)
                return splittedRoute;
            return false;
        };
    };

    return deep.router;
});


