/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
/*
    feature : recode group test in route map : /[q:query,brol,!truc,(i:start/i:end)]            OK
    
    ROUTE DSL : add $ in end to say : finished with or finished : aka : 
    /campaign/s:id/$     :   say : match me if there is only /campaign/s:id and nothing more        OK

    add route(>info,>update)::./brol   or equivalent                    OK

    so : what's next : 
    - redirection in map? --> as it's an automate : no sens.
            --> maybe set redirection (route transformation) in mapper after compilation.
            they will be at higher priority
            ex : 
            deep.route.redirection("/campaign/s:id", "/brol/{ id }")

    - staters ? will see when it's needed.

    - ocm at any level : 
        - it means that views manage ocm on what, how, where, etc
        - or any route entry itself could be ocm

    - condition in views and routing : 
        maybe routing could handle conditions in same way than views do
        ==> test condition before test route

    - maybe add in route matcher dsl : index of matching in front of route : 
    aka : 4/info/33
    could be label
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./lib/route", "./lib/mapper", "./lib/route-node"], function(require, deep)
{
	deep.errors.Route = function(msg, report, fileName, lineNum) {
        if (typeof msg === 'object')
            report = msg;
        if (!msg)
            msg = "RouterError";
        return this.Error(500, msg, report, fileName, lineNum);
    };
    require("./lib/route");
	require("./lib/route-node");
    require("./lib/mapper");

    deep.coreUnits = deep.coreUnits || [];
    deep.coreUnits.push("js::deep-routes/units/route-dsl", "js::deep-routes/units/map-dsl");
});



