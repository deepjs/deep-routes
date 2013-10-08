

/*
  Route :
      need to express : 

            - user dependency

            - http verb

            - content negociation
              - html route
              - json route

*/

  

  var routes = deep.ocm("routes", {
    "public":{
      "/modules":{
          negociation:{
            json:{
              html:function(res){
                
              }
            }
          },
          get:function(params, options){
              return {
                  controller:{

                  },
                  headers:{

                  }
              };
          }
      }
      "/modules/:id":{

            get:function(){
                return 
            },
            post:{

            }
      }
    },
    "user":{
        backgrounds:["dq::/public"]
    }
  });

  var mediaSheet = {
    "dq.up::./!":{
         negociation:function(accept){
            // set response headers
            return this[accept];
        }
      },
      "dq.up::./*":{
          route:function(req){
              for(var i in this)
              {
                  // test route
              }
              return controller;
          }
      },
      'dq.up::./*/*':{
          action:function(req){
              // do action on object (this)
              return deep.when(this[req.method](...));
          }
      },   
      // init
      'dq.call::./*':function(){
          for(var i in this)
          {
              // create router
          }
      }
  }


    routes("user")
    .negociation(req)       // warning : negociation need to be JSGI wrapper : act on downside to select controller and at upside to
    .route(req)
    .action(req)
    .done(function(s){
        res.end(s.toString());
    });


  routes("public")
  .negociation("json")
  .route(req)
  .action(req)
  .done(function(s){
  
  })




 
  deep("route::/community")
  .get()
  .done






