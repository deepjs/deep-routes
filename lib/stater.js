/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./parser"], function(require, deep) {
"use strict";
	deep.router = deep.router || {};

	deep.router.createStater = function(router) {
		var descriptor = {
			_deep_stater_: true,
			states: []
		};
		for (var i in router) {
			var state = router[i];

		}

		descriptor.match = function(path, output) {

		}


		return descriptor;
	};

});