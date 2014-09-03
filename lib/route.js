/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep) {
"use strict";
	// constructore
	deep.Route = function(route) {
		this._deep_route_ = true;
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
	deep.Route.addType("q:", function(input) { // query
		if (input === null || typeof input == 'undefined' || input[0] != "?")
			return null;
		return input;
		//return deep.utils.parseQueryString(input);
	});
	deep.Route.addType("f:", function(input) { // float
		var r = parseFloat(input);
		if (!isNaN(r) && r !== Infinity)
			return r;
		return null;
	});
	deep.Route.addType("s:", function(input) { // string
		if (input === null || typeof input == 'undefined' || input[0] == "?")
			return null;
		return input;
	});
	deep.Route.addType("r:", function(input) { // RQL
		if (input === null || typeof input == 'undefined' || input[0] != "?")
			return null;
		return deep.utils.parseRQL(input);
	});
	deep.Route.addType("p:", function(input) { // path
		return input;
	});
	// PROTO
	deep.Route.prototype = {
		compile: function() {
			// _______________  DO COMPILATION
			if (typeof this.original === 'function') {
				this.tests = [this.original];
				return this;
			} else {
				var p = this.original,
					tests = [],
					count = 0;
				if (p[0] == '?') {
					this.optional = true;
					count++;
				} else if (p[0] == '!') {
					this.inverse = true;
					count++;
				}
				if (p[count] == '.') {
					count++;
					if (p[count] == '/')
						this.local = true;
					else if (p[count] == ".") {
						count++;
						this.fromParent = 1;
						while (p[count + 1] == ".") {
							this.fromParent++;
							count += 3;
						}
					}
				} else if (p[count] == '/')
					this.fromRoot = true;
				if (p[count] == '/')
					count++;
				// analyse current 
				while (count < p.length && p[count]) {
					count = analyseEntry(p, count, tests);
					//console.log("end loop : ", p.substring(count), p[count]);
					if (p[count] == "/")
						count++;
					else if (count < p.length)
						throw deep.errors.Route('error : missformed route : ', this.original);
				}
				this.tests = tests;
			}
			return this;
		},
		match: function(parts, index, output) {
			// console.log("deep.Route.match : ", parts, index, output, this)
			if (!parts.forEach) {
				parts = parts.split("/");
				if (parts[0] === '')
					parts.shift();
				if (parts[parts.length - 1] === '')
					parts.pop();
			}
			index = index || 0;
			var catched = [];
			output = output || {};
			var self = this;
			if (this.fromRoot)
				index = 0;
			else if (this.fromParent) {
				// console.log("has from parent : ", this.fromRoot, this.fromParent, index, index-this.fromParent);
				index -= this.fromParent;
				index = Math.max(index, 0);
			}
			var startIndex = index;
			var ok = this.tests.every(function(t) {
				var catched2 = t.call(self, parts, output, index);
				// console.log("route test : ", catched2)
				if (catched2) {
					if (catched2.forEach) {
						catched = catched.concat(catched2);
						index += catched2.length;
					}
					return true;
				}
				return false;
			});
			//console.log("route match : ", ok, " - ",  this.optional, this.inverse, " - ", joinedCatched);
			if (ok) {
				//parts.splice(index, catched.length, output);
				// console.log("Route catch : ", catched, output, parts, index)
				if (this.inverse)
					return false;
				/*output.toString = function(){
                    //console.log("will output : ", joinedCatched, " - with : ", JSON.stringify(this));
                    return deep.utils.interpret("/"+catched.join("/"), this);
                }*/
				return {
					catched: catched,
					output: output,
					parts: parts,
					index: index,
					start: startIndex
				};
			}
			if (this.optional || this.inverse)
				return {
					catched: [],
					output: { /*toString:function(){ return ""; }*/ },
					parts: parts,
					index: startIndex,
					start: startIndex
				};
			return false;
		}
	};

	// PRIVATES
	// 

	function analyseEntry(p, count, tests) {
		// console.log("analyse entry : ", p, count, p[count])
		var optional = false,
			inversed = false;
		if (p[count] == "?") {
			optional = true;
			count++;
		} else if (p[count] == '!') {
			inversed = true;
			count++;
		}
		if (p[count] == '(') // block
			return analyseBlock(p, count, tests, optional, inversed);
		else if (p[count] == '$') // block
		{
			tests.push(createEndTest(optional, inversed));
			return ++count;
		} else if (p[count] == '[') // disjonction
			return analyseDisjonction(p, count, tests, optional, inversed);
		else if (p[count + 1] == ":") // variable
			return analyseVar(p, count, tests, optional, inversed);
		else // key
			return analyseKey(p, count, tests, optional, inversed);
	}

	function analyseBlock(p, count, tests, optional, inversed) {
		var block = deep.utils.catchParenthesis(p.substring(count)).value;
		// console.log("_________________________ parsing BLOCK : ", block);
		var subroute = new deep.Route(block);
		//console.log("___________________________________ end parsing block");
		count += block.length + 2;
		tests.push(createBlockTest(block, subroute, optional, inversed));
		return count;
	}

	function analyseVar(p, count, tests, optional, inversed) {
		var type = p.substring(count, count + 2);
		// console.log("parse VAR : var type : ", type);
		var parser = deep.Route.types[type];
		if (!parser)
			return deep.errors.Route('error : missformed route : no parser with type : ' + type, p);
		count += 2;
		var start = count;
		while (p[count] && p[count] != "," && p[count] != "]" && p[count] != "/")
			count++;
		var name = p.substring(start, count);
		//console.log("parsing var : ", type, name);
		tests.push(createVarTest(type, name, parser, optional, inversed));
		return count;
	}

	function analyseDisjonction(p, count, tests, optional, inversed) {
		count++;
		if (p[count] == "]")
			return ++count;
		var disjonctions = [];
		count = analyseEntry(p, count, disjonctions);
		while (p[count] == ',' && p[count])
			count = analyseEntry(p, ++count, disjonctions);
		if (p[count] !== ']')
			return deep.errors.Route('error : missformed route : group bad end : ', p[count], p);
		else
			count++;
		tests.push(createGroupTest(disjonctions, optional, inversed));
		return count;
	}

	function analyseKey(p, count, tests, optional, inversed) {
		var start = count;
		while (p[count] && p[count] != "," && p[count] != "]" && p[count] != "/")
			count++;
		var keyName = p.substring(start, count);
		// console.log("parsing key : ", keyName);
		tests.push(createKeyTest(keyName, optional, inversed));
		return count;
	}

	//_______________

	var createGroupTest = function(disjonctions, optional, inversed) {
		return function(parts, output, index) {
			// console.log("group test : ", disjonctions, " - value : ", parts[index], " - optional : ", optional, " - inversed : ", inversed);
			var ok = false;
			for (var i = 0, len = disjonctions.length; i < len && !ok; ++i)
				ok = disjonctions[i].call(this, parts, output, index);
			if (ok) {
				// console.log("$$$$$$$$$$$$ group test match : ", ok);
				if (inversed)
					return false;
				return ok;
			}
			if (optional || inversed)
				return true;
			return false;
		};
	};
	var createKeyTest = function(keyName, optional, inversed) {
		return function(parts, output, index) {
			// console.log("key test : ", keyName, " - value : ", parts[index], " - optional : ", optional, " - inversed : ", inversed);
			var ok = false;
			if (keyName == "*")
				ok = true;
			else
				ok = (parts[index] === keyName);
			if (ok) {
				// console.log("$$$$$$$$$$$$ key test match : ", parts[index], inversed);
				if (inversed)
					return false;
				return [parts[index]];
			}
			// console.log("key test not match", inversed);
			if (optional)
				return true;
			if (inversed)
				return [parts[index]];
			return false;
		};
	};
	var createBlockTest = function(block, subroute, optional, inversed) {
		return function(parts, output, index) {
			var ok = subroute.match(parts, index);
			// console.log("$$$$$$$$ analyse block : res : ", ok, " - ", block, parts, optional);
			if (!ok) {
				if (optional || inversed)
					return true;
				return false;
			}
			if (inversed)
				return false;
			deep.aup(ok.output, output);
			return ok.catched;
		};
	};
	var createVarTest = function(type, name, parser, optional, inversed) {
		return function(parts, output, index) {
			if (type == "p:") {
				var rest = parts.slice(index);
				output[name] = "/" + rest.join('/');
				return rest;
			}
			//console.log("test variable : ", type, name, " - with : ", parts, " - optional : ", optional);
			var res = parser(parts[index]);
			//console.log("res : ", res);
			if (res !== null) {
				if (inversed)
					return false;
				// console.log("$$$$$$$$$$ variable match : ", name, " : ", res);
				//splittedRoute.shift();
				output[name] = res;
				return [res];
				//return ["{"+name+"}"];
			}
			if (optional)
				return true;
			if (inversed)
				return [parts[index]];
			return false;
		};
	};
	var createEndTest = function(optional, inversed) {
		return function(parts, output, index) {
			if (index == parts.length) {
				if (inversed)
					return false;
				// console.log("$$$$$$$$$$ END match : ", parts, index);
				return true;
			}
			if (optional)
				return true;
			if (inversed)
				return [parts[index]];
			return false;
		};
	};
	return deep.Route;
});