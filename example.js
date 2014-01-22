var exampleMap = {
    topbar:{
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


deep.store.Object.create("view", exampleMap,)

var mapper = deep.router.createMapper(exampleMap);
console.log("mapper : ", mapper);
//var res = mapper.match("/campaign/?id=2/info/13");
var res = mapper.match("/campaign/2/update/13");
if(res)
    deep.route(res.matched);


deep.