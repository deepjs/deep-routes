var exampleMap = {
    topbar:{
        router:"!/login",
        what:"json::/json/test.json",
        how:"swig::/templates/simple.html",
        where:"dom.htmlOf::#content"
    },
    campaign:{
        router:"/campaign/s:id",
        what:"camp::{ id }",
        subs:{
          info:{
            router:"?/info/s:id",
            what:"info::{ id }"
          },
          update:{
            what:"update::{ id }",
            router:"/update/s:id",
            subs:{
              profile:{
                what:"profile::?updateID={ parent.id }"
              }
            }
          }
        }
      },
    campaigns:{
        router:"/campaign/?q:query/?(/i:start/i:end)",
        what:"campaign({ start },{ end })::{ query }",
        how:"swig::...",
        subs:{
          info:{
            router:"?/info/s:id",
            what:"info::{ id }",
            where:"dom.appendTo::...."
          }
        }
    }
};

deep.router.createRootMapper(exampleMap);
deep.route("/campaign/2/update/13");

