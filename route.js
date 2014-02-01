/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep)
{
    // constructore
    deep.Route = function(route){
        this._deep_route_ =  true;
        this.optional = false;
        this.original = route;
        this.compile();
    };

    // types managements
    deep.Route.types = {};
    deep.Route.addType = function(prefix, parser) {
        deep.Route.types[prefix] = parser;
    };

    // basical types
    deep.Route.addType("i:", function(input) { // integer
        var r = parseInt(input, 10);
        if (!isNaN(r) && r !== Infinity)
            return r;
        return null;
    });
    deep.Route.addType("q:", function(input) {     // query
        if (input === null || typeof input == 'undefined')
            return null;
        if (input[0] == "?")
            return input;
        return null;
    });
    deep.Route.addType("f:", function(input) {     // float
        var r = parseFloat(input);
        if (!isNaN(r) && r !== Infinity)
            return r;
        return null;
    });
    deep.Route.addType("s:", function(input) {        // string
        if (input === null || typeof input == 'undefined')
            return null;
        return input;
    });

    // PROTO
    deep.Route.prototype = {
        compile:function(){
            // _______________  DO COMPILATION
            if (typeof this.original === 'function') {
                this.tests = [this.original];
                return this;
            } else {
                var p = this.original,
                    tests = [],
                    count = 0;
                if (p[0] == '?')    {
                    this.optional = true;
                    count++;
                }
                else if (p[0] == '!') {
                    this.inverse = true;
                    count++;
                }
                if (p[count] == '.')
                {
                    count++;
                    this.local = true;
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
                        var subroute = new deep.Route(block);
                        //console.log("___________________________________ end parsing block");
                        count += block.length + 2;
                        handler = createBlockTest(block, subroute, optional, inversed);
                        tests.push(handler);
                    } 
                    else if (p[count + 1] == ":") // variable
                    {
                        var type = p.substring(count, count + 2);
                        //console.log("parse : var type : ", type);
                        var parser = deep.Route.types[type];
                        if (!parser)
                            throw deep.errors.Route('error : missformed route : no parser with type : '+type, this.original);
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
                    }
                    else // key
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
                        throw deep.errors.Route('error : missformed route (!handler || count < p.length) : ', this.original);
                    }
                }
                this.tests = tests;
            }
            return this;
        },
        match:function(rest, output)
        {
            if (!rest.forEach)
            {
                rest = rest.split("/");
                rest.shift();
            }
            else
                rest = rest.slice();
            var catched = [];
            output = output || {};
            var self = this;
            var ok = this.tests.every(function(t) {
                rest = t.call(self, rest, output, catched);
                //console.log("run temp : ", rest);
                if (rest)
                    return true;
                return false;
            });
            //console.log("descriptor match : ", rest, " - res : ", ok, res.output, res.rest);
            if (ok)
            {
                return {
                    original: this.original,
                    catched : catched,
                    output: output,
                    rest: rest
                };
            }
            return false;
        }
    };

    // PRIVATES
    
    var createKeytest = function(keyName, optional, inversed) {
        return function(splittedRoute, output, catched) {
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
                catched.push(keyName);
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
        return function(splittedRoute, output, catched) {
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
            catched = catched.concat(ok.catched);
            deep.utils.up(ok.output, output);
            return ok.rest;
        };
    };
    var createVarTest = function(type, name, parser, optional, inversed) {
        return function(splittedRoute, output, catched) {
            //console.log("test variable : ", type, name, " - with : ", splittedRoute, " - optional : ", optional);
            var res = parser(splittedRoute[0]);
            //console.log("res : ", res);
            if (res !== null) {
                if(inversed)
                    return false;
                //console.log("$$$$$$$$$$ variable match : ", name, " : ", res);
                catched.push(res);
                splittedRoute.shift();
                output[name] = res;
                return splittedRoute;
            }
            if (optional || inversed)
                return splittedRoute;
            return false;
        };
    };

    return deep.Route;
});


