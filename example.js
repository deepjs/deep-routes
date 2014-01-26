var exampleMap = {
    topbar:{
        route:"!/[login,register]"
    },
    footer:{
        route:"/!register"
    },
    campaign:deep.View({
        route:"/campaign/s:id",
        how:"hello campaign",
        subs:{
          info:{
            route:"?/info/s:id"
          },
          update:{
            route:"/update/s:id",
            subs:{
              profile:{
                route:""
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
            route:"?/info/s:id"
          }
        }
    }
};

deep.router.createRootMapper(exampleMap);

deep.route("/campaign/12/info/34/update/13");
console.log("\n\n\n");
exampleMap.campaign.route("../campaign/12");

//deep.route("/login");





