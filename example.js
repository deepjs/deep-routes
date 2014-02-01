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

deep.router.createRootMapper(exampleMap);

//console.profile("t");
deep.route("/campaign/12/info/34/update/13");
console.log(deep.route())
console.log("\n\n\n");

deep.route("/campaign/67/info/8998/update/56");
console.log(deep.route())
//console.profileEnd("t");
console.log("\n\n\n");

exampleMap.campaign.subs.info.route("/campaign/22222/info/14");
console.log(deep.route())
console.log("\n\n\n");

exampleMap.campaign.subs.info.route("../info/56/update/27");
console.log(deep.route())
console.log("\n\n\n");

exampleMap.campaign.subs.info.route("./info/444447");
console.log(deep.route())
console.log("\n\n\n");

exampleMap.campaign.subs.info.route("../update/27");
console.log(deep.route())
console.log("\n\n\n");

console.log("getRoute : ", exampleMap.campaign.subs.info.getRoute("./info/7585858585"));
console.log("getRoute : ", exampleMap.campaign.subs.info.getRoute("/campaign/15555/update/89"));
console.log("getRoute : ", exampleMap.campaign.subs.info.getRoute("../info/7585858585"));

deep.route()

//deep.route("/login");

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



