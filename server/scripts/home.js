
var Router = require("koa-router");
var router = new Router();
var koabody = require("koa-body")
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost/tplinux');
var barcode = db.get('sku');
var item = db.get('plu');
var shortid = require('shortid');

//var memberAdmin = require('./memberAdmin');

router.get("/", function * (){

  var list = yield item.find({},
    { _id : 0
  });

  yield this.render('home',{
    page: "home",
    section: "so apps",
    itemslist: list
  });
})

router.post("/api/emp/save", koabody({multipart: true}), function * (){
  console.log('test');
  var fields = this.request.body;
  console.log('Add bodyfields: ',fields);
  var sku = yield barcode.findOne({entrynmbr : fields.barcode},
    {
  });
  console.log(' SKU: ',sku);

  yield this.render("home", {
      returnMsg: Message
  });
})


module.exports = router.routes();
