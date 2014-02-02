var route = new deep.Route("/campaign/?s:id/update/?q:query/?(i:start/i:end)")

deep(route.match("/campaign/12/update/?jekk"))
.equal({"catched":["campaign","12","update","?jekk"],"output":{"id":"12","query":"?jekk"},"parts":["campaign","12","update","?jekk"],"index":4});

deep(route.match("/campaign/12/update/12/45"))
.equal({"catched":["campaign","12","update",12,45],"output":{"id":"12","start":12,"end":45},"parts":["campaign","12","update","12","45"],"index":5});

route.match("/campaign/update/12/45") = false








var route = new deep.Route("/!campaign/?s:id/update/?q:query/?(i:start/i:end)")
route.match("!/campaign/12/update/12/45") = false
