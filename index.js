/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./parser", "./mapper"], function(require, deep)
{
    deep.router = deep.router || {};
	deep.errors.Route = function(msg, report, fileName, lineNum) {
        if (typeof msg === 'object')
            report = msg;
        if (!msg)
            msg = "RouterError : ";
        return this.Error(500, msg, report, fileName, lineNum);
    };
	require("./parser");
	require("./mapper");
});



