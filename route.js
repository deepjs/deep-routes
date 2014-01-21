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







/*



var SimpleRouter = deep.compose.Classes(function(map){
  this.map = map;
},{
  route:function(path){
    // match and extract params, find controller (or hierarchy) and return it.
    // first iteration : just first level route
  }
});





var MapRouter = deep.compose.Classes(function(map){
  this.map = map;
},{
  route:function(path){
    // match and extract params, find controller (or hierarchy) and return it.
    // 
    
  }
});





var routes = {
  "/home:rest?":"js::/home-controller.js",
  "/campaign/:campID":"js::campaign.js",
  "_default_":"route::/home"
};



var routes = {
  "/home:rest?":"js::/home-controller.js",
  "/campaign/:campID":{
    backgrounds:["js::campaign.js"],
    subs:{
      "*":"js::...",
      "/info/:infoID":"json::othercontroller",
      "/updates/:updateID":new deep.ui.View({ how:"swig::update.html", what:"campaign-update::{ updateID }"})
    }
  },
  "_default_":new deep.ui.View({ how:"swig::...", what:{ details:"json::..." } })
};

*/

//    campaign(:id, ?info(:id), ?updates(:id))
//    
//    {
//        "campaign(:id)":{
//            routeParams:{ id:null }
//            subs:{
//                ".topbar":{}
//                "info(:id) || .info":{},
//                "updates(:id)":{}
//            }
//        }
//    }
//    
//    cette method ci dessous : permet de diminuer le couplage de l'accroche. 
//    info ici decrit seul à quoi il réagit dans la route, et son parent n'a aucune info sur lui
//    ensuite la sémantique de '*' est plus clair et ne pose pus de problème de syntaxe
//    
//    le nom des entrée dans la map ne puevent pas etre lié à la route, sinon on ne sait pas etre affcihé par defaut
//    
//    route:"*" = valeur par defaut
//    
//    
//    {
//        "campaign":{
//            route:"campaign(:id)",
//            routeParams:{ id:null },
//            what:"json::/campaign/{ id }",
//            subs:{
//                topbar:{ },
//                info:{ route:"info(:id) || *", what:"info::?campID={ parent.id }" },
//                updates:{ route:"updates(:id)" }
//            }
//        }
//    }
//    
//    au moment ou on descend et produit la route : garder reference des routeParams produit : 
//    
//    une route parsée =  node = {
//      parent:null,
//      controller:campaignCtrlRef,
//      entry:"campaign"
//      routeParams:ref,
//      subs:[
//        {
//          parent:campNode,  
//          controller:topbarCtrRef,
//        },
//        {
//          parent:campNode,  
//          controller:infoCtrlRef,
//          entry:"info"
//          routeParams:ref,
//          subs:[
//          
//          ]
//        },
//        {
//          parent:campNode,  
//          controller:updatesCtrlRef,
//          entry:"updates"
//          routeParams:ref,
//          subs:[
//          
//          ]
//        }
//      ]
//    }
//    
//    
//    beans : mettre sous vue avec 
//    
//    ==> update route :
//    
//      - Router.refresh()   : reproduit la meme route en prennant les routeParams 
//          ==> si on fais sur un controller : ctrl.hardRoute("id", 23) : 
//    
//    /campaign/12/info/13/updates/24
//    var routeParams = { ":id":12, info:{ ":id":13 }, updates:{ ":id":24 }}
//    
//    /campaign/12/info/13
//    var routeParams = { ":id":12, info:{ ":id":13 }}




/*











 campaign/12/info/23



 campaign(:id):{
    campaign:{ 
      what:"camp::{ id }",
      subs:{
        info:{ what:"info::?campID={ parent.id }" }
      }
    }
 }

 campaign(:id, ?info(:id), ?update(:id, profile(:id))):{
    campaign:{ 
      what:"camp::{ id }",
      subs:{
        info:{ what:"info::{ id }" },
        update:{ 
          what:"update::{ id }" 
          subs:{ 
            profile:{
              what:"profile::{ id }"
            }
          }
        },
      }
    }
 }

 campaign(?:query, ?:start, ?:end):{
    campaign:{ 
      what:"camp({ start || 0 }, { end || 10 })::{ query || '?' }"
    }
 }

 campaign(:start, :end, info(:query)):{
    campaign:{ 
      what:"camp({ start },{ end })::?"
      subs:{
        info:{ what:"info::{ query }"}
      }
    }
 }





campaign:{
  "_id_":{
    "?info(:id)":{

    }
  }
}
*/

//______________________________________________________
//
/*
router simple :

var map = {
  "/home:rest?":{
    how:"swig:...."
  },
  "/campaign/?:query/?:start/?:end":{
      what:"camp({ start || 0 }, { end || 10 })::{ query || '?' }"
  },
  "/campaign/:id":{
      what:"camp::{ id }",
      subs:{
        info:{ what:"info::?campID={ parent.id }" }
      }
  },
  "/campaign/:id/info/:id/update/:id/profile/:id":{
      what:"camp::{ id }",
      subs:{
        info:{ what:"info::{ id }" },
        update:{ 
          what:"update::{ id }" 
          subs:{ 
            profile:{
              what:"profile::{ id }"
            }
          }
        }
      }
  }
}

SimpleRouter._deep_flattener_ = true;
*/
/*
case "float" :
          fin = parseFloat(value);
          if(!isNaN(fin) && fin !== Infinity)
            ok = true;
          break;
        case "integer" :
          fin = parseInt(value);
          if(!isNaN(fin) && fin !== Infinity)
            ok = true;
          break;
        case "boolean" :
          if(value == "true" || value == "1")
          {
            fin = true;
            ok = true;
          }
          else if (value == "false" || value === "0")
          {
            fin = false;
            ok = true;
          }
          break;
        case "string" :
          if(typeof value === 'string')
          {
            fin = value;
            ok = true;
          }
          break;

 */
/*
Router.types = [];
Router.addType = function(prefix, parser){
  Router.types.push({ prefix:prefix, parser:parser })
}
Router.addType("i:", function(input){
  var r = parseInt(value);
  if(!isNaN(r) && r !== Infinity)
    return r;
  return null;
});
Router.addType("q:", function(input){
  if(input === null || typeof input == 'undefined')
    return false;
  if(input[0] == "?")
    return input;
  return false;
});
Router.addType("f:", function(input){
  var r = parseFloat(value);
  if(!isNaN(r) && r !== Infinity)
    return r;
  return null;
});
Router.addType("s:", function(input){
  if(input === null || typeof input == 'undefined')
    return false;
  return input;
});
*/
//   /campaign/?q:query/?(/n:start/n:end)
//   donne : 
// var fin = [
// // key manager
// function(splittedRoute, output){
//    // from closure : optional + key name (== campaign here)
//    if(splittedRoute[0] == keyName)
//    {
//      splittedRoute.shift();
//      return splittedRoute;
//    }
//    if(optional)
//      return splittedRoute;
//    return false;
// },
// // variable manager
// function(splittedRoute, output){
//    // from closure : variable name (query) + type parser (q:) + optional
//    var res = parser(splittedRoute[0]);
//    if(res)
//    {
//      splittedRoute.shift();
//      output[name] = res;
//      return splittedRoute;
//    }
//    if(optional)
//       return splittedRoute;
//     return false;
// },
// // block manager
// function(splittedRoute, output){
//    // from closure : optional + subroute = Router.compile( "/n:start/n:end", true )
//    splittedRoute = splittedRoute.slice();
//    var ok = subroute.handle(splittedRoute.slice(), output)
//    if(!ok && !optional)
//      return false;
//    return splittedRoute;
// }]
/*
deep.Router = {};
deep.Router.compile = function(router, optional){
  var descriptor = {
    optional : optional || false
  };
  descriptor.run = function(path){
    if(!path.forEach)
      path = path.split("/");
    else
      path = path.slice();
    var output = {};
    var ok = this.tests.every(function(t){
        path = t(path, output);
        if(path)
          return true;
    });
    if(ok)
      return output;
    return false;
  };
  if(typeof router === 'function')
  {
    descriptor.tests = [router];
    return descriptor;
  }
  else
  {
    var tests = [];
    var p = router;
    var count = 0;
    if(p[count] == '?')
    {
      descriptor.optional = true;
      count++;
    }
    if(p[count] == '/')
      count++;

    // analyse current 
    while(count < p.length)
    {
      var optional = false;
      if(p[count] == "?")
      {
        optional = true;
        count++;
      }
      if(p[count] == '(')   // block
      {
        var block = deep.utils.catchParenthesis(p.substring(count));
        var subroute = deep.Router.compile(block);
        var handler = function(splittedRoute, output){
          // from closure : optional + subroute = Router.compile( "/n:start/n:end", true )
          splittedRoute = splittedRoute.slice();
          var ok = subroute.handle(splittedRoute, output)
          if(!ok && !optional)
            return false;
          return ok;
        };
        tests.push(handler);
        count += block.length;
      }
      else if(p[count+1] == ":")   // variable
      {
        var parser = deep.Router.types[p.substring(count, count+1)];
        count += 2;
        var end = p.indexOf("/", count);
        var varName = p.substring(count, end);
        count = end+1;
        var handler = function(splittedRoute, output){
          // from closure : variable name (query) + type parser (q:) + optional
          var res = parser(splittedRoute[0]);
          if(res)
          {
           splittedRoute.shift();
           output[varName] = res;
           return splittedRoute;
          }
          if(optional)
            return splittedRoute;
          return false;
        }
      }
      else // key
      {
        var end = p.indexOf("/", count);
        var keyName = p.substring(count, end);
        count = end+1;
        var handler = function(splittedRoute, output){
          // from closure : optional + key name (== campaign here)
          if(splittedRoute[0] == keyName)
          {
           splittedRoute.shift();
           return splittedRoute;
          }
          if(optional)
           return splittedRoute;
          return false;
        }
      }
      if(p[count] == "/")
        count++;
    }
  }
  descriptor.tests = tests;
  return descriptor;
}

//______________ finally


var map = {
  campaigns:{
    router:"/campaign/?q:query/?(/n:start/n:end)",
    what:"camp({ start || 0 }, { end || 10 })::{ query || '?' }",
    subs:{
      info:{
        router:"?/info/?s:id",
        what:"info::{ id }" 
      }
    }
  },
  campaign:{
    router:"/campaign/s:id",
    what:function(params){},
    how:function(what, params){},
    where:function(rendred)
    subs:{
      info:{ 
        router:"?/info/s:id",
        what:{
          datas:'"'

        }
      },
      update:{ 
        what:"update::{ id }", 
        router:"/update/i:id",
        subs:{ 
          profile:{
            what:"profile::?updateID={ parent.id }"
          }
        }
      }
    }
  },
  campaignCustom:{
    router:function(pathDescriptor){
    },
    how:function(context){
    }
  }
}

view.refresh();     // refresh me. if not present in screen : not shown
view.refresh(null, null, preloaded);     // refresh me with preloaded



view.show();        // show me as this 
view.refresh("./subs/[a,b,c]");     // refresh my subs
view.refresh("../../!");      // refresh : ATTENTION = ma vue parente : pas le subs
view.refresh("./subs/a", { id:12 });      // refresh un subs on lui collant

// pour le controller info : ceci
view.refresh({ id:"12" });  // refresh me with id = 12
// est équivalent à
view.refresh(".", "/info/12");  // refresh me with id = 12
// et est encore equivalent à
view.route("./info/12")    //from info change info but does only try its own route

// from campaign : change campaign en testant aussi frêres
view.route("../campaign/12/info/27")
//from info change update
view.route("../update/90")
//from info change info but does only try its own route
view.route("./info/12")           //         /campaign/12/info/12/update/45
//from info change info but try brothers (in order of parent)
view.route("../info/12")          //      /campaign/12/info/?query/1/34   /campaign/12/info/12
// from any view 
view.route("/campaign/45/update/90/profile/42")

view.show()
view.show({ id:34 })
view.show("../[a,b,c]")

view.hide()
view.hide("../[a,b,c]")

deep.refresh({
    campaign:{
      id:12,
      info:{
        id:24
      },
      update:{
        id:25
      }
    }
});


deep.refresh(view, {} || "...")
deep.refresh("views::/campaign/subs/info", { id:12 })
deep.refresh("views::/campaign/subs/update")
deep.refresh("views::/campaign", { id:45 })
deep.refresh("views::/") // refresh all

deep.show("views::...")
deep.hide("views::...")

deep.route("/campaign/12")
deep.route({
  campaign:{
    id:12,
    info:{
      id:13
    }
  }
})


dans le template : 

{
  what:what,
  params:routeParams,
  getRoute:function(path){

  }
}

dans infos : 
href={% getRoute("./info/12") %}   // produit la route /campaign/13/
*/
