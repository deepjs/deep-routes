/*!
 * urlrouter - lib/utils.js
 * Copyright(c) 2012 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

/**
 * URL Router
 * @param {String} url, routing url.
 *  e.g.: /user/:id, /user/:id([0-9]+), /user/:id.:format?
 * @param {Boolean} [strict] strict mode, default is false.
 *  if use strict mode, '/admin' will not match '/admin/'.
 */
function Router(url, strict) {
  this.keys = null;
  if (url instanceof RegExp) {
    this.rex = url;
    this.source = this.rex.source;
    return;
  }



  this.producer = url.replace(/:(\w+)(?:\(([^\)]+)\))?(\?)?/g, function (all, name, rex, atLeastOne) {
    //console.log("url replacedddddd : ", all, name, rex, atLeastOne);
    //keys.push(name);
    if (!rex) {
      rex = '[^\\/]' + (atLeastOne === '?' ? '*' : '+');
    }
    return '(' + name + ')';
  });

  var keys = [];
  this.source = url;
  url = url.replace(/\//g, '\\/') // '/' => '\/'
  .replace(/\./g, '\\.?') // '.' => '\.?'
  .replace(/\*/g, '.+'); // '*' => '.+'


  // ':id' => ([^\/]+), 
  // ':id?' => ([^\/]*), 
  // ':id([0-9]+)' => ([0-9]+)+, 
  // ':id([0-9]+)?' => ([0-9]+)* 
  url = url.replace(/:(\w+)(?:\(([^\)]+)\))?(\?)?/g, function (all, name, rex, atLeastOne) {
    //console.log("url replace : ", all, name, rex, atLeastOne);
    keys.push(name);
    if (!rex) {
      rex = '[^\\/]' + (atLeastOne === '?' ? '*' : '+');
    }
    return '(' + rex + ')';
  });
  // /user/:id => /user, /user/123
  url = url.replace(/\\\/\(\[\^\\\/\]\*\)/g, '(?:\\/(\\w*))?');
  this.keys = keys;
  var re = '^' + url;
  if (!strict) {
    re += '\\/?';
  }
  re += '$';
  this.rex = new RegExp(re);
}

/**
 * Try to match given pathname, if match, return the match `params`.
 * 
 * @param {String} pathname
 * @return {Object|null} match `params` or null.
 */
Router.prototype.match = function (pathname) {
  var m = this.rex.exec(pathname);
  // console.log(this.rex, pathname, this.keys, m, this.source)
  var match = null;
  if (m) {
    if (!this.keys) {
      return m.slice(1);
    }
    match = {};
    var keys = this.keys;
    for (var i = 0, l = keys.length; i < l; i++) {
      var value = m[i + 1];
      if (value) {
        match[keys[i]] = value;
      }
    }
  }
  return match;
};

/**
 * Try to match given pathname, if match, return the match `params`.
 * 
 * @param {String} pathname
 * @return {Object|null} match `params` or null.
 */
Router.prototype.produce = function (params) {
  //var m = this.rex.exec(pathname);
  //console.log(this.rex, this.keys, this.source, this.producer);
  var fin = this.producer.replace(/\((\w+)\)/gi, function(all, name){
    return params[name];
  });
  console.log("produced : ", fin);


/*  var match = null;
  if (m) {
    if (!this.keys) {
      return m.slice(1);
    }
    match = {};
    var keys = this.keys;
    for (var i = 0, l = keys.length; i < l; i++) {
      var value = m[i + 1];
      if (value) {
        match[keys[i]] = value;
      }
    }
  }
  return match;*/
};

/**
 * Create a `Router` instance.
 *
 * @param {String|RegExp} urlpattern
 * @param {Boolean} [strict] strict match, default is false.
 * @return {Router}
 */
exports.createRouter = function (urlpattern, strict) {
  return new Router(urlpattern, strict);
};





/**
 * @example producing route from params
 * var route = require("deep-routes/route"); 
 * var r = route.createRouter("/hello/:id/:world/:bloup"); 
 * r.produce({ id:12, world:"deepjs", bloup:"12"});
 */




















