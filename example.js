/**
 * @author Philippe Delabye <phil@chemicalrules.net>
 * @contributors Gilles Coomans <gilles.coomans@gmail.com>
THIS IS THE VIEW MAIN APP : so for browser side.
 */
require.config({
    baseUrl: "./libs",
    catchError:true
});
require([
    "require",
    "deep-browser/index",
],
function(require, deep){

    //require("deep-browser/index");
    deep.generalModes("roles","public");

    var exampleMap = {
        topbar:deep.View({
            route:"!/[login,register]",
            how:"swig::/test.swig",
            where:"dom.htmlOf::#topbar"
        }),
        footer:deep.ocm({
            user:deep.View({
                route:"!/register",
                how:"<span>ocm powaaaaaaa user</span>",
                where:deep.jquery.htmlOf("#footer")
            }),
            "public":{
                backgrounds:["this::../user"],
                how:"<span>ocm powaaaaaaa public</span>"
            }
        }, { group:"roles" }),
        campaign:deep.View({
            route:"/campaign/s:id",
            how:"<div>hello campaign { id }<div id='info'></div><div id='update'></div></div>",
            where:"dom.htmlOf::#content",
            subs:{
                info:deep.View({
                    route:"?./info/s:id",
                    how:"swig::/info.swig",
                    where:"dom.htmlOf::#info"
                }),
                update:deep.View({
                    route:"./update/s:id",
                    how:"<div>update hello { id }<div id='profile'></div></div>",
                    where:"dom.htmlOf::#update",
                    subs:{
                        profile:deep.View({
                            how:"<div>profile from update { parent.id }</div>",
                            where:"dom.htmlOf::#profile"
                        })
                    }
                })
            }
        }),
        register:deep.View({
            route:"/register",
            how:"<div>register</div>",
            where:"dom.htmlOf::#content"
        }),
        campaigns:deep.View({
            route:"/campaigns/?q:query/?(i:start/i:end)",
            how:"<div>campaigns { query | 'no query' } - { start | '0' }:{ end | '10'}<div id='info'></div></div>",
            where:"dom.htmlOf::#content",
            subs:{
              info:deep.View({
                route:"?./info/s:id",
                how:"swig::/info.swig",
                where:"dom.htmlOf::#info"
              })
            }
        })
    };
    
    $('<a href="/campaigns/?bloup/16/32/info/899898">campaigns</a><br/>').appendTo("#menu");
    $('<a href="/campaign/12345667/info/899898">camp + info</a><br/>').appendTo("#menu");
    $('<a href="/campaign/12345667/update/78">camp + update</a><br/>').appendTo("#menu");
    $('<a href="/campaign/33333/info/546/update/8975">camp + info + update </a><br/>').appendTo("#menu");
    $('<a href="/register">register</a><br/>').appendTo("#menu");
    deep.ui.relink("body");
    deep.route(exampleMap)
    .done(function(s){
        console.log("map compiled: ", s);
        return s.init();
    })
    console.log("app initialised");


});


deep.route(exampleMap);
//console.profile("t");
//console.profile("t");
deep.route("/campaign/12/info/34/update/13");
//console.profileEnd("t");
console.log(deep.getRoute());
console.log("\n\n\n");
//console.profileEnd("t");
deep.route("/campaign/67/info/8998/update/56");
console.log(deep.getRoute());

console.log("\n\n\n");


exampleMap.campaign.subs.info.route("/campaign/22222");

console.log(deep.getRoute());
console.log("\n\n\n");

exampleMap.campaign.subs.info.route("../info/56/update/27");
console.log(deep.getRoute());
console.log("\n\n\n");

exampleMap.campaign.subs.info.route("./info/444447");
console.log(deep.getRoute());
console.log("\n\n\n");

exampleMap.campaign.subs.info.route("../update/27");
console.log(deep.getRoute());
console.log("\n\n\n");


exampleMap.campaign.route(">/info/55555555/update/999999999999");

console.log(deep.getRoute());
console.log("\n\n\n");



console.log("getRoute : ", exampleMap.campaign.subs.info.getRoute("./info/7585858585"));
console.log("getRoute : ", exampleMap.campaign.subs.info.getRoute("/campaign/15555/update/89"));
console.log("getRoute : ", exampleMap.campaign.subs.info.getRoute("../info/7585858585"));
console.log("getRoute : ", exampleMap.campaign.getRoute(">/info/111111/update/9988765544"));

deep.getRoute();
//console.profileEnd("t");


























var exampleMap = {
    topbar:{
        route:"!/[login,register]"
    },
    footer:{
        route:"/!register"
    },
    campaign:deep.View({
        route:"/campaign/s:id",
        how:"hello world { id }",
        subs:{
          info:{
            route:"?./info/s:id"
          },
          update:{
            route:"./update/s:id",
            subs:{
              profile:{
              }
            }
          }
        }
      }),
    always:{
    },
    campaigns:{
        route:"/campaigns/?q:query/?(/i:start/i:end)",
        subs:{
          info:{
            route:"?./info/s:id"
          }
        }
    }
};



var mapper = deep.router2.createMap(exampleMap);

var r = mapper.match("/campaign/12/info/34")

console.log("r : ", r);
console.log("mapper : ", mapper);
mapper.print();
console.log("\n\n\n");
console.profile("r")
mapper.route("/campaign/12455/info/34223322")
console.profileEnd("r")
mapper.getRoute();
mapper.print();


















/*


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


dans le template : context = 

{
  what:what,
  params:routeParams,
  getRoute:function(path){

  }
}

example : dans infos : 
href={% getRoute("./info/12") %}   // produit la route /campaign/13/info/12/update/13
*/



