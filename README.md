deep-routes : As now, just extracted from connectjs urlrouter middleware (https://github.com/fengmk2/urlrouter)

Routes format will be decorate with superset to allow automatique casting and validation, 
or reverse writing for deep-linking in browser.



/*

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
