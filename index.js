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
        - it means that views manage ocm on what, how, where, etc           OK
        - or any route entry itself could be ocm                            OK

    - condition in views and routing : 
        maybe routing could handle conditions in same way than views do
        ==> test condition before test route

    - maybe add in route matcher dsl : index of matching in front of route : 
    aka : 4/info/33
    could be label
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./lib/route", "./lib/structured", "./lib/route-node"], function(require, deep) {
    "use strict";
	require("./lib/route");
	require("./lib/route-node");
	require("./lib/structured");
});