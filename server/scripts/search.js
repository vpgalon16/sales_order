var monk = require('monk');
var db = monk('localhost/tplinux');
var item = db.get('items');

exports.index = function * (next){
  console.log('Search page')
  var session_id = this.session.emploginname;
  console.log('session: ', session_id);
  yield this.render("search", {Message: session_id});
}


// This routine will the records from plu and sku to collect item list
exports.call_item_db =  function * (next){
  var query = this.request.query;
  var page = (query.page) ? query.page : 1;
  var fields = this.request.body;
  console.log('Search SKU/PLU Body Fields: ',fields);
  var results = "";

  var offset;

  if(page > 1){
    offset = (page - 1) * 50;
  }else{
    offset = 0;
  }

  var cond = "";
  if (fields.plunmbr != "" && fields.plunmbr != null && fields.pludesc != "" && fields.pludesc != null)
      cond = "a.pludesc like \'%" + fields.pludesc + "%\' and  a.plunmbr::text =\'" + fields.plunmbr + "\' and ";
  else {
    if (fields.plunmbr != "" && fields.plunmbr != null)
        cond = "a.plunmbr::text =\'" + fields.plunmbr + "\' and ";
    else if (fields.pludesc != "" && fields.pludesc != null)
        cond = "a.pludesc like \'%" + fields.pludesc + "%\' and ";
  }
  console.log('cond: [' + cond + ']');
 // Getting data from TPLinux DB
  results = yield this.pg.db.client.query_("select a.plunmbr, b.skunmbr, a.pludesc, a.qty1, a.price1 from plu a, sku b where " + cond + " a.plunmbr=b.plunmbr order by b.skunmbr offset " + offset + " limit 50;")
  var tmpResults = results.rows;

  if (tmpResults == "" || tmpResults == null) {
       this.body = {
        status: {
          success: false,
          error: true,
          message: "No records found(). "
        }
      }
     return;
  }

  /*for (var i = 0; i < tmpResults.length; i++) {
      var resultItem = tmpResults[i];
      plu = resultItem.plunmbr;
      sku = resultItem.skunmbr;
      desc = resultItem.pludesc;

      console.log('plu: ',plu);
      console.log('sku: ',sku);
      console.log('desc: ',desc);
  }*/

  var numrec = tmpResults.length;

  this.body = {
    status: {
      success: true,
      error: false,
      message: "[" + numrec + "] records found(). "
    },
    list: tmpResults,
    page: page
  }
}

// This routine will the records from customer to collect item list
exports.call_cust_db =  function * (next){
  var query = this.request.query;
  var page = (query.page) ? query.page : 1;
  var fields = this.request.body;
  console.log('Search Customer Body Fields: ',fields);
  var results = "";

  var offset;

  if(page > 1){
    offset = (page - 1) * 50;
  }else{
    offset = 0;
  }

  var cond = "";
  if (fields.custnmbr != "" && fields.custnmbr != null && fields.custname != "" && fields.custname != null)
      cond = "where lastname like \'%" + fields.custname + "%\' and  custnmbr::text =\'" + fields.custnmbr + "\'  ";
  else {
    if (fields.custnmbr != "" && fields.custnmbr != null)
        cond = "where custnmbr::text =\'" + fields.custnmbr + "\'  ";
    else if (fields.custname != "" && fields.custname != null)
        cond = "where lastname like \'%" + fields.custname + "%\'  ";
  }
  console.log('cond: [' + cond + ']');
 // Getting data from TPLinux DB
  results = yield this.pg.db.client.query_("select custnmbr, lastname, firstname, birthname from customer " + cond + " order by custnmbr offset " + offset + " limit 50;")
  var tmpResults = results.rows;

  if (tmpResults == "" || tmpResults == null) {
       this.body = {
        status: {
          success: false,
          error: true,
          message: "No records found(). "
        }
      }
     return;
  }

  /*for (var i = 0; i < tmpResults.length; i++) {
      var resultItem = tmpResults[i];
      plu = resultItem.plunmbr;
      sku = resultItem.skunmbr;
      desc = resultItem.pludesc;

      console.log('plu: ',plu);
      console.log('sku: ',sku);
      console.log('desc: ',desc);
  }*/

  var numrec = tmpResults.length;

  this.body = {
    status: {
      success: true,
      error: false,
      message: "[" + numrec + "] records found(). "
    },
    list: tmpResults,
    page: page
  }
}


exports.itemlist = function * (next){
  console.log('Search Item List page')
  var session_id = this.session.emploginname;
  console.log('session: ', session_id);
  yield this.render("itemlist", {Message: session_id});
}
