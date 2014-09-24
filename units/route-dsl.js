if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "deepjs/deep"], function(require, deep, Unit) {

	//_______________________________________________________________ GENERIC STORE TEST CASES

	var unit = {
		title: "deep-routes/units/route-dsl",
		stopOnError: false,
		tests: {
			base: function() {
				var route = new deep.Route("/campaign/?s:id/update/?q:query/?(i:start/i:end)");
				return deep(route.match("/campaign/12/update/?foo"))
					.equal({
						catched: ["campaign", "12", "update", "?foo"],
						output: {
							id: "12",
							query:"?foo"
						},
						parts: ["campaign", "12", "update", "?foo"],
						index: 4,
						start: 0
					});
			},
			block: function() {
				var route = new deep.Route("/campaign/?s:id/update/?q:query/?(i:start/i:end)");
				return deep(route.match("/campaign/12/update/12/45"))
					.equal({
						catched: ["campaign", "12", "update", 12, 45],
						output: {
							"id": "12",
							"start": 12,
							"end": 45
						},
						parts: ["campaign", "12", "update", "12", "45"],
						index: 5,
						start: 0
					});
			},
			block_false: function() {
				var route = new deep.Route("/campaign/?s:id/update/?q:query/?(i:start/i:end)");
				return deep(route.match("/campaign/12/update/45"))
					.equal({
						catched: ["campaign", "12", "update"],
						output: {
							"id": "12"
						},
						parts: ["campaign", "12", "update", "45"],
						index: 3,
						start: 0
					});
			},
			bQuery_block: function() {
				var route = new deep.Route("/campaign/?s:id/update/?q:query/?(i:start/i:end)");
				return deep(route.match("/campaign/12/update/?hello/12/56"))
					.equal({
						catched: ["campaign", "12", "update", "?hello", 12, 56],
						output: {
							id: "12",
							query: "?hello",
							start: 12,
							end: 56
						},
						parts: ["campaign", "12", "update", "?hello", "12", "56"],
						index: 6,
						start: 0
					});
			},
			notMatch: function() {
				var route = new deep.Route("/campaign/?s:id/update/?q:query/?(i:start/i:end)");
				return deep(route.match("/campaign/update/12/45")).equal(false);
			},
			not: function() {
				var route = new deep.Route("/!campaign/?s:id/update/?q:query/?(i:start/i:end)");
				return deep(route.match("/campaign/12")).equal(false);
			},
			not2: function() {
				var route = new deep.Route("/campaign/!hello/doe");
				return deep(route.match("/campaign/hello/doe")).equal(false);
			},
			not3: function() {
				var route = new deep.Route("/campaign/!doe");
				return deep(route.match("/campaign/doe")).equal(false);
			},
			not4: function() {
				var route = new deep.Route("/campaign/!doe");
				return deep(route.match("/campaign/johnny"))
					.equal({
						catched: ["campaign", "johnny"],
						output: {},
						parts: ["campaign", "johnny"],
						index: 2,
						start: 0
					});
			},
			disjonction: function() {
				var route = new deep.Route("/[campaign,doe]/s:id");
				return deep(route.match("/doe/45"))
					.equal({
						catched: ["doe", "45"],
						output: {
							id: "45"
						},
						parts: ["doe", "45"],
						index: 2,
						start: 0
					});
			},
			disjonction_block_false: function() {
				var route = new deep.Route("/[campaign,(doe/brol)]/s:id");
				return deep(route.match("/doe/45"))
					.equal(false);
			},
			disjonction_block: function() {
				var route = new deep.Route("/[campaign,(doe/brol)]/s:id");
				return deep(route.match("/doe/brol/45"))
					.equal({
						catched: ["doe", "brol", "45"],
						output: {
							id: "45"
						},
						parts: ["doe", "brol", "45"],
						index: 3,
						start: 0
					});
			},
			disjonction_int: function() {
				var route = new deep.Route("/[i:test,(doe/brol)]/s:id");
				return deep(route.match("/13/45"))
					.equal({
						catched: [13, "45"],
						output: {
							test: 13,
							id: "45"
						},
						parts: ["13", "45"],
						index: 2,
						start: 0
					});
			},
			endFalse: function() {
				var route = new deep.Route("/campaign/$");
				return deep(route.match("/campaign/12")).equal(false);
			},
			endOk: function() {
				var route = new deep.Route("/campaign/$");
				return deep(route.match("/campaign"))
					.equal({
						catched: ["campaign"],
						output: {},
						parts: ["campaign"],
						index: 1,
						start: 0
					});
			},
			catcheEnd: function() {
				var route = new deep.Route("/campaign/p:path");
				return deep(route.match("/campaign/this/is/your/path"))
				.equal({
					"catched": ["campaign", "this", "is", "your", "path"],
					"output": {
						"path": "/this/is/your/path"
					},
					"parts": ["campaign", "this", "is", "your", "path"],
					"index": 5,
					"start": 0
				});
			}
		}
	};
	return unit;
});