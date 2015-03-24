/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * HTTP/Restful Map Controller
 *
 * It uses internaly deep.flatRoute (../flat.js) to match.
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "deepjs/deep", "./flat-map", "deep-restful/lib/chain"], function(require, deep, flatRoutes){


	var match = function(mapper, path, options){
		options = options || {};
		options.contentType = options.contentType || { json:true };
		var handler = mapper.match(path);
		if (!handler)
			return deep.errors.Error(4000, "no route match");
		var store = handler.entry;
		if (typeof store === 'function')
			store = {
				get: store
			};
		
		options.params = handler.params;
		var id = null;
		if (handler.standard) {
			if (handler.params.id) {
				id = handler.params.id;
				if (handler.params.path && handler.params.path !== '/')
					id += handler.params.path;
			} else if (handler.params.query)
				id = handler.params.query;
		} else
			id = handler.params;
		if (id && typeof id !== 'object')
			options.id = id;
		return {
			store:store,
			options:options,
			id:id
		};
	};

	var restfulRoute = function(mapper, path, body, method, headers, contentType, output)
	{
		contentType = contentType || { json:true };
		headers = headers || {};
		var handler = mapper.match(path);
		if (!handler)
			return deep.errors.Error(4000, "no route match");
		//console.log("restful map : handled : params : ", handler.params);
		//console.log("restful map : request.body : ", request.body);
		//console.log("restful : context modes : ", deep.Promise.context.modes);
		var store = handler.entry;
		if (typeof store === 'function')
			store = {
				get: store
			};
		var options = {
			params: handler.params
		};
		var id = null;
		if (handler.standard) {
			if (handler.params.id) {
				id = handler.params.id;
				if (handler.params.path && handler.params.path !== '/')
					id += handler.params.path;
			} else if (handler.params.query)
				id = handler.params.query;
		} else
			id = handler.params;
		if (id && typeof id !== 'object')
			options.id = id;

		var d = null;
		switch (method.toLowerCase()) {
			case "head":
				d = deep.restful(store)
					.head(id, options);
				break;
			case "get": // subcases : get, query, range
				//console.log("will get : ", handler.params);
				if (!id && !options.id)
					options.id = id = "?";

				if (headers.range) {
					if (!store.range)
						d = deep.when(deep.errors.Range("range unmanaged by related store"));
					else {
						var res = /items=(\d+)-(\d+)/gi.exec(headers.range);
						if (res) {
							var start = parseInt(res[1], 10);
							var end = parseInt(res[2], 10);
							d = deep.restful(store)
								.range(start, end, options.params.query, options)
								.done(function(range) {
									output.status = (range.start === 0 && range.total - 1 === end) ? 200 : 206;
									output.headers['Content-Range'] = "items " + range.start + '-' + range.end + '/' + (range.total || '*');
									return range.results;
								});
						} else
							d = deep.when(deep.errors.Range("range misformed"));
					}
				} else
					d = deep.restful(store).get(id, options);
				break;

			case "post": // subcases : post, rpc, bulk
				if (contentType.jsonrpc) // RPC
				{
					d = deep.restful(store)
						.rpc(body.method, body.params, options.params.id, options)
						.done(function(result) {
							// console.log("rpc call : response : ", result);
							return {
								id: body.id,
								error: null,
								result: result
							};
						})
						.fail(function(error) {
							//console.log("rpc failed : response : ", error);
							return {
								id: body.id,
								error: JSON.stringify(error),
								result: null
							};
						});
				} 
				else if (contentType.message) // BULK
				{
					if (!(body instanceof Array))
						d = deep.when(deep.errors.Bulk("trying to send message but body isn't array! (" + self.name + ")"));
					else {
						var alls = [];
						body.forEach(function(message) {
							//console.log("BULK UPDATE : message : ", message);
							var h = null;
							var meth = message.method.toLowerCase();
							var opt = deep.abottom(options, {
								id: message.to
							});
							if (deep.utils.inArray(meth, ["patch", "put", "post"]))
								h = deep.restful(store)[meth](message.body, opt);
							else
								h = deep.restful(store)[meth](message.to, opt);
							alls.push(h);
						});
						d = deep.all(alls)
							.done(function(results) {
								var res = [];
								body.forEach(function(message) {
									var r = results.shift();
									res.push({
										from: message.to,
										body: r,
										id: message.id,
										type: message.method
									});
								});
								return res;
							});
					}
				} else if (contentType.json) // POST
					d = deep.restful(store).post(body, options);
				else
					d = deep.when(deep.errors.Post("unrecognised content-type"));
				break;

			case "put":
				if (!contentType.json)
					d = deep.when(deep.errors.Put("unrecognised content-type"));
				d = deep.restful(store).put(body, options);
				break;

			case "patch":
				// console.log("restful apply patch")
				if (!contentType.json)
					d = deep.when(deep.errors.Patch("unrecognised content-type"));
				d = deep.restful(store).patch(body, options);
				break;

			case "delete":
				if (!store.del)
					d = deep.when(deep.errors.MethodNotAllowed());
				else
					d = deep.restful(store).del(options.params.id, options);
				break;

			default: // ASSUMING OPTIONS?
				d = deep.when(deep.errors.MethodNotAllowed());
		}
		return d;//.log("restful router result : ");
	};

	return {
		_deep_restrictable_: ["get", "post", "put", "patch", "del", "head"],
 		_deep_router_:true,
		_deep_store_:true,
		outputType:"application/json",
		inputType:["json", "json-rpc", "message"],
		map:{},
		init:function(){
			var self = this;
			return flatRoutes(this.map, true)
			.done(function(mapper){
				self.mapper = mapper;
				return self;
			})
			.elog();
		},
		get:function(path, opt){
			opt = opt || {};
			return this.exec(path, null, "get", opt.headers, opt.contentType);
		},
		post:function(obj, opt){
			opt = opt || {};
			return this.exec(opt.path, obj, "post", opt.headers, opt.contentType);
		},
		put:function(obj, opt){
			opt = opt || {};
			return this.exec(opt.path, obj, "put", opt.headers, opt.contentType);
		},
		patch:function(obj, opt){
			opt = opt || {};
			return this.exec(opt.path, obj, "patch", opt.headers, opt.contentType);
		},
		del:function(path, opt){
			opt = opt || {};
			return this.exec(path, null, "delete", opt.headers, opt.contentType);
		},
		head:function(path, opt){
			opt = opt || {};
			return this.exec(path, null, "head", opt.headers, opt.contentType);
		},
		exec:function(path, body, method, headers, contentType){
			var output = { 
				status: 200,
				headers:{
					'Content-Type':this.outputType
				}
			};
			return deep.when(restfulRoute(this.mapper, path, body, method, headers, contentType, output))
			.done(function(success){
				output.result = success;
				return output;
			});
		}
	};
});
