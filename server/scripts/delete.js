var monk = require('monk');
var db = monk('localhost/tplinux');
var item = db.get('items');
var Decimal = require('decimal.js');
var _ = require('lodash');

exports.index = function * (next){
  console.log('Calling Delete Item: Started');  
  var ids = this.params.itemID;
  var user = this.params.userID;
  var custnmbr = this.params.custNmbr;
  var so_no = this.params.sales_orderno;
  var purpose = this.params.purpose;
  var custname = this.params.custName;

  var sono = this.session.selected_recall ? this.session.selected_recall : so_no;

  console.log('Item No: ' + ids);
  console.log('User Name: ' + user);
  console.log('Customer Nmbr: ' + custnmbr);
  console.log('Customer Name: ' + custname);
  console.log('Sales Order No: ' + sono);
  console.log('this.session.emploginname: ' + this.session.emploginname);
  console.log('this.session.purpose: ' + purpose);
  console.log('this.session.selected_recall: ' + this.session.selected_recall);

  console.log('Deleting this itemID: ',ids);
  var del = yield item.remove({plunmbr: ids, so_no: parseInt(sono)});

  // This is to retrieve the temp data list and pass to JSON
  var itemlist = yield item.find({so_no: parseInt(sono)});
  var totprice = _.sumBy(itemlist, function(price)
    { return parseFloat(price.totalprice);});

  var totqty = _.sumBy(itemlist, function(quantity)
    { return parseFloat(quantity.qty);});

  console.log(' itemlist: ', itemlist);
  console.log('Calling Delete Item: Completed');  

  yield this.render("so_entry", {
      so_no: sono,
      returnMsg: itemlist,
      returnQty: Decimal(totqty).toFixed(2),
      returnPrice: Decimal(totprice).toFixed(2),
      userid: user,
      custname: custname,
      custnmbr: custnmbr,
      purpose: purpose      
  });

 }
