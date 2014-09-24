# deep-routes

Dynamic url to route mapping.

deep-routes library comes with :
* a small DSL to describe routes parsing.
* flat map management tools
* deeply stuctured map management tools

Maps (deeply structured or flat) could contains OCM entries that will be resolved when traversing.


## install

```shell
npm install deep-routes
```
or

```shell
bower install deep-routes
```

## Route DSL

It has been developped to clarify route parsing description, and to allow relative route matching in structured maps (see below).

example :


Explanation part by part :
* 

### Usage
```javascript

```

### Rules



### variables types


### add custom type
```javascript

```

## Flat map

A "flat" map is just an object containing, at first level, "routes" as properties keys and "controllers" as properties values (absolutly free shaped object).

example :
```javascript
var deep = require("deepjs");
require("deep-routes/lib/flat");

var map = {
	"/product/?s:id":{
		// product controller
		title:"product controller"
	},
	"/register/?s:email":{
		title:"register controller"
	},
	//...
};

deep.flatRoutes(map) // flatten and compile map. returns a mapper object which contains a single method : match(uri)
.done(function(mapper){
	var r = mapper.match("/product/12"); // return first match
	console.log(r);
	/* result : 
	{
		params:{ id:12 }, 
		catched:["product", "12"], 
		entry:{ title:"product controller" }
	}
	*/
})
.elog(); // print any error

```

### Standard restful expantion

When using deep.flatRoutes for restful services mapping, you could ask to expand simple routes (routes without variable catch) with default restful routing pattern (catching optional id, queries or subpath).

It means :
```javascript
var deep = require("deepjs");
require("deep-routes/lib/flat");

var map = {
	"/campaign":{  // declare simple path without variable catch => will be expaneded
		// campaign controller
		title:"campaign controller"
	},
	"/register/?s:email":{  // contains variable catch => will not be expanded
		title:"register controller"
	},
	//...
};

deep.flatRoutes(map, true) // pass true as second argument to expand "simple" route
.done(function(mapper){
	var r = mapper.match("/campaign/12"); // return first match
	console.log(r);
	/* result :
	{
		params:{ id:12 }, 
		catched:["campaign", "12"], 
		entry:{ title:"campaign controller" }
	}
	*/
})
.elog(); // print any error

```

`/campaign/` has been expanded in `/campaign/?[(s:id/?p:path),q:query]`



## Deeply structured map

A structured map is defined by a structure of objects containing "route" and/or "subs" properties, __the two only__ keywords of structured map.

The "route" entry gives the route matcher of your controller, and "subs" property contains optional subcontrollers.

The routing algorithm is like an automate that try to match any "route" property founded in current level's entries.
If "route" matchs (or if there is no route property, which means always match), it select current entry, and if current entry contains a "subs" property, recurse route matching on it.

So the algorithm finally selects a tree of controllers that match a uri.

Additionnaly, any "route" entry could be absolute (starting with "/"), or relative to last matched index :
* ./foo : says try to match "foo" after last matched index
* ../foo : says try to match "foo" after last matched index - 1
* ../../foo : says try to match "foo" after last matched index - 2
* ...


It means :

```javascript
var map = {
	topbar:{
		// top bar controller
		// no "route" property => will always be selected
	},
	home:{
		// home controller : selected if route start with /home or equal /
		route:"/[home,$]"
		// ...
	},
	products:{
		// products ctrler : selected if route start with /products
		route:"/product",
		// ...
		subs:{
			list:{
				// list ctrler : selected if route match, from last matched index (here after /product) :
				// ./?some=query or ./?some=query/an_integer/another_integer
				route:"./q:query/?(i:start/i:end)"
			},
			detail:{
				// list ctrler : selected if route match, from last matched index :
				// ./detail/a_string
				route:"./detail/s:id"
			},
			comment:{
				// comment ctrler : selected if route match, from last matched index :
				// ./comment/a_string
				route:"./comment/s:id"
			}
		}
	},
	//...
}
```

Possibles routes matched by this map :

* `/` (selected : topbar, home)
* `/home` (selected : topbar, home)
* `/products/?some=query` (selected : topbar, products, list)
* `/products/?some=query/0/9` (selected : topbar, products, list)
* `/products/?some=query/detail/53` (selected : topbar, products, list, detail)
* `/products/?some=query/detail/53/comment/12` (selected : topbar, products, list, detail, comment)
* `/products/?some=query/comment/12` (selected : topbar, products, list, comment)
* `/products/?some=query/0/9/detail/53` (selected : topbar, products, list, detail)
* `/products/?some=query/0/9/detail/53/comment/12` (selected : topbar, products, list, detail, comment)
* `/products/?some=query/0/9/comment/12` (selected : topbar, products, list, comment)
* `/products/detail/53` (selected : topbar, products, detail)
* `/products/detail/53/comment/12` (selected : topbar, products, detail, comment)
* `/products/comment/12` (selected : topbar, products, detail)

The idea, with relative route management, is to break coupling between parent and children, to obtain clean MVC pattern where neither parent nor children know anything about each other.

As a controller could define its own route management (as list, detail and comment in example above), independently of previously "consummmed" route's parts, it allows us to reattach or reuse a controller elsewhere without anychange.


## Structured maps and views

### load and refresh sequence

### relink

### inner view route and getRoute



## Licence

LGPL 3.0



