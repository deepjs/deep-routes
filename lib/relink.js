/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require", "deepjs/deep"], function(require, deep){
	var relinks = {};
	relinks.relinkNode = function(){
		$ = deep.context.$;
		if(this._deep_rerouted_)
			return;
		var tagName = $(this).get(0).tagName.toLowerCase(), uri = null;
		if(tagName == 'a')
			uri = $(this).attr("href");
		if(!uri)
			return;
		if(uri.substring(0,4) === 'http')
			return;
		if(uri[0] == '/' && uri[1] == '/')   // file
			return;
		//console.log("RELINK : ", uri);
		this._deep_rerouted_ = true;
		$(this).click(function(e){
			e.preventDefault();
			//console.log("click on rerouted dom object : uri : ", uri);
			deep.route(uri);
		});
	};
	relinks.relink = function(selector){
		$ = deep.context.$;
		// console.log("relink : ", selector);
		$(selector)
		.find("a")
		.each(relinks.relinkNode);
	};
	return relinks;
});