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
                    if(p[count] == '/')
                        this.local = true;
                    else if(p[count] == ".")
                    {
                        count ++;
                        this.fromParent = 0;
                        while(p[count+1] == ".")
                        {
                            this.fromParent++;
                            count ++;
                        }
                        console.log("fromParent : ", this.fromParent)
                    }
                }
                else if(p[count] == '/')
                    this.fromRoot = true;
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
        match:function(parts, index, output)
        {
            if (!parts.forEach)
            {
                parts = parts.split("/");
                parts.shift();
            }
            index = index || 0;
            var firstIndex = index;
            var catched = [];
            output = output || {};
            var self = this;
            if(this.fromRoot)
                index = 0;
            else if(this.fromParent)
                index -= this.fromParent;
            var ok = this.tests.every(function(t) {
                var catched2 = t.call(self, parts, output, index);
                if (catched2)
                {
                    if(catched2.forEach)
                    {
                        catched = catched.concat(catched2);
                        index += catched2.length;
                    }
                    return true;
                }
                return false;
            });
            if (ok)
            {
                console.log("Route catch : ", catched, output, parts, index)
                return {
                    catched : catched,
                    output: output,
                    parts: parts,
                    index:(this.local)?index:firstIndex
                };
            }
            return false;
        }
    };

    // PRIVATES
    
    var createKeytest = function(keyName, optional, inversed) {
        return function(parts, output, index) {
            //console.log("key test : ", keyName, " - optional : ", optional);
            
            var ok = false;
            if(keyName.forEach)
                ok = deep.utils.inArray(parts[index], keyName);
            else
                ok = (parts[index] === keyName);
            if(ok)
            {
                //console.log("$$$$$$$$$$$$ key test match : ", splittedRoute[0]);
                if(inversed)
                    return false;
                return [keyName];
                //splittedRoute.shift();
            }
            if (optional || inversed)
                return true;
            return false;
        };
    };
    var createBlockTest = function(block, subroute, optional, inversed) {
        return function(parts, output, index) {
            var ok = subroute.match(parts, index);
            //console.log("$$$$$$$$ analyse block : res : ", ok, " - ", block, splittedRoute, optional);
            if (!ok)
            {
                if (optional || inversed)
                    return true;
                return false;
            }
            if(inversed)
                return false;
            deep.utils.up(ok.output, output);
            return ok.catched;
        };
    };
    var createVarTest = function(type, name, parser, optional, inversed) {
        return function(parts, output, index) {
            //console.log("test variable : ", type, name, " - with : ", splittedRoute, " - optional : ", optional);
            var res = parser(parts[index]);
            //console.log("res : ", res);
            if (res !== null) {
                if(inversed)
                    return false;
                //console.log("$$$$$$$$$$ variable match : ", name, " : ", res);
                //splittedRoute.shift();
                output[name] = res;
                return [res];
            }
            if (optional || inversed)
                return true;
            return false;
        };
    };

    return deep.Route;
});


