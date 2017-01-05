var koa = require("koa");
var Router = require("koa-router");
var router = new Router();
var koabody = require("koa-body");
var koaPg = require('koa-pg');

var app = require('../../../so.js').app;

function * checkDB(next){
   var dataB = koaPg('postgres://postgres:@db3:5432/tplinux');
   console.log(dataB)
   if(dataB){
    app.use(koaPg('postgres://postgres:@db2:5432/tplinux'));
    yield next;
   }else{
    app.use(error());
   }
}


// Login Function
var login = require('./login.js');
router.get('/',  login.index);
router.get('/login', login.index);
router.post('/api/login', koabody({multipart:true}), login.login_server);
router.post('/api/reset', koabody({multipart:true}), login.login_reset);


// logout Function
var logout = require('./logout.js');
router.get("/api/emp/logout/:userID", koabody({multipart: true}), logout.index);

// Customer information
var cust = require('./customer.js');
router.get('/customer', cust.index);
router.post("/api/cust/recall", koabody({multipart: true}), cust.enable_recall);
router.post("/api/cust/recall/select", koabody({multipart: true}), cust.select_sono);
router.post("/api/cust/save", koabody({multipart: true}), cust.call_server);
router.post("/api/cust/reprint", koabody({multipart: true}), cust.reprintSO);


// Sales Order Entry information
var so_entry = require('./so_entry.js');
router.get('/so_entry', so_entry.index);
router.post("/api/item/save", koabody({multipart: true}), so_entry.call_server);
router.post("/api/so/savelist", koabody({multipart: true}), so_entry.save_list);
router.post("/api/so/recall", koabody({multipart: true}), so_entry.recall);
router.post("/api/so/printso", koabody({multipart: true}), so_entry.print_so);
router.post("/api/so/deleteso", koabody({multipart: true}), so_entry.delete_so);
router.post("/api/so/cancelso", koabody({multipart: true}), so_entry.cancel_so);


// Delete Item
var del = require('./delete.js');
router.get("/api/item/delete/:itemID/:userID/:custNmbr/:sales_orderno/:purpose/:custName", koabody({multipart: true}), del.index);

// Search PLU item for desktop mode only
var search = require('./search.js');
router.get('/search', search.index);
router.post("/api/search/item", koabody({multipart: true}), search.call_item_db);
router.post("/api/search/cust", koabody({multipart: true}), search.call_cust_db);
router.get('/itemlist', search.itemlist);

module.exports = router.routes()
