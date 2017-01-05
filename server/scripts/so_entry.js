var monk = require('monk');
var db = monk('localhost/tplinux');
var item = db.get('items');
var item1 = db.get('itemstmp');
var Decimal = require('decimal.js');
var _ = require('lodash');
var pdf = require('html-pdf');
var fs = require('fs');
//var IPAddress = "http://172.18.37.108/"
var IPAddress = "http://192.168.56.8/"

function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}


exports.index = function * (next) {
 /* var fields = this.request.body.fields;
*/

  var sono;
  var cust = this.session.custname;
  var userid = this.session.emploginname;
  var recall = this.session.selected_recall ? this.session.selected_recall : null;

  var purpose = this.session.purpose;
  var custnmbr = this.session.custnmbr;
  var custname = this.session.custname;

  if(recall == null){
    sono = this.session.sono;
  console.log(' sono1: ', sono);
  }else{
    sono = recall;
    var so_data = yield this.pg.db.client.query_("select plunmbr, pludesc, regprice, quantity, username, custnmbr, custname, reasoncode from so_unprocess where salesorderno=$1;", [sono])
    var tmpResults = so_data.rows;
    console.log(' tmpResults: ',tmpResults);
    // If no records in PLU return
    if (tmpResults == "" || tmpResults == null) {
         this.body = {
          status: {
            success: false,
            error: true,
            message: "Item number doesn't exist."
          }
        }
        console.log('Calling data entry: Completed');
        return;
    }

    for (var i = 0; i < tmpResults.length; i++) {
      var resultItem = tmpResults[i];
      purpose = resultItem.reasoncode;
      custnmbr = resultItem.custnmbr;
      custname = resultItem.custname;
      var price = parseFloat(resultItem.regprice)/100;
      var qty = parseFloat(resultItem.quantity);
      var totprice = (price * qty);
      console.log(' price: ',price);
      console.log(' qty: ',qty);
      console.log(' totprice: ',totprice);
      yield item.insert({
                so_no: parseInt(sono),
                id: i,
                purpose: purpose,
                custnmbr: custnmbr,
                custname: custname,
                plunmbr: resultItem.plunmbr,
                pludesc: resultItem.pludesc,
                regprice: Decimal(price).toFixed(2),
                qty: Decimal(qty).toFixed(2),
                totalprice: Decimal(totprice).toFixed(2)
      });
    }
  }
  console.log(' sono: ', sono);
  // This is to retrieve the temp data list and pass to JSON
  var itemlist = yield item.find({so_no: parseInt(sono)});
  var totprice = _.sumBy(itemlist, function(price)
    { return parseFloat(price.totalprice);});
  var totqty = _.sumBy(itemlist, function(quantity)
    { return parseFloat(quantity.qty);});

console.log('this.session.selected_reprint : ', this.session.selected_reprint)
console.log('this.session.selected_recall: ', this.session.selected_recall)
console.log('this.session.sono: ', sono)
console.log('this.session.purpose: ', this.session.purpose)
console.log('this.session.custnmbr: ', this.session.custnmbr)
console.log('this.session.custname: ', this.session.custname)

  this.session.sono = sono;
  this.session.purpose = purpose;
  this.session.custnmbr = custnmbr;
  this.session.custname = custname;
  var custnm = custname;
  var custnb = custnmbr;

 var sel_reprint = this.session.selected_reprint;
 var itemlistFin = yield item1.find();
  console.log('so entry page', itemlistFin)
  var retQty = Decimal(totqty).toFixed(2);
  var retPrice = Decimal(totprice).toFixed(2);
  yield this.render("so_entry", {
         so_no: sono,
          returnMsg: itemlistFin,
          returnQty: numberWithCommas(retQty),
          returnPrice: numberWithCommas(retPrice),
          userid: userid,
          custname: custnm,
          selected_reprint: sel_reprint,
          custnmbr: custnb,
          purpose: purpose
  });
}


// This routine will do the sales order per item
exports.call_server = function * (next){
  var fields = this.request.body;
  //var fields1 = JSON.stringify(this.request.body.fields, null, 2);
  //var fields = JSON.parse(fields1);
  console.log('Add bodyfields: ',fields);

  this.session.emploginname = fields.userid;
  this.session.sono = fields.so_no;

  console.log('this.session.selected_recall:', this.session.selected_recall);
  console.log('this.session.sono:', this.session.sono);
  var sono = this.session.selected_recall ? this.session.selected_recall : this.session.sono;
  this.session.sono = sono;
  this.session.selected_recall = null;

  var purpose = this.session.purpose;
  var custnmbr = this.session.custnmbr;
  var custname = this.session.custname;

  var plu_data = yield this.pg.db.client.query_("select plunmbr, pludesc, price1, qty1 from plu where plunmbr=(select plunmbr from sku where skunmbr=$1);", [fields.barcode])
  var tmpResults = plu_data.rows;
  console.log(' tmpResults: ',tmpResults);
  // If no records in PLU return
  if (tmpResults == "" || tmpResults == null) {
         this.body = {
          status: {
            success: false,
            error: true,
            message: "Item number doesn't exist."
          }
        }
        console.log('Calling data entry: Completed');
        return;
    }

    var plunmbr = plu_data.rows[0].plunmbr;
    var pludesc = plu_data.rows[0].pludesc;
    var price1 = (plu_data.rows[0].price1)/100;
    var qty1 = (plu_data.rows[0].qty1)/1000;

    console.log(' plunmbr: ',plunmbr);
    console.log(' pludesc: ',pludesc);
    console.log(' price1: ',price1);
    console.log(' qty1: ',qty1);
    if (fields.quantity != null && fields.quantity !='')
        quantity = Number(fields.quantity);
    else
        quantity = qty1;

    console.log(' quantity: ',quantity);


    // This portion is to insert/update the PLU datas to temporary table
    var chkitems = yield item.findOne({so_no: parseInt(sono), plunmbr: plunmbr}, { _id : 0});
    console.log(' chkitems: ',chkitems);
    if (chkitems != null) {   // means already existing
      var newqty = quantity+Number(chkitems.qty);
      var newtotprice = newqty*Number(chkitems.regprice);
      console.log(' chkitems.qty: ',chkitems.qty);
      console.log(' plulist.qty: ',qty1);
      console.log(' newqty: ',newqty);
      var upditems = yield item.update({so_no: parseInt(fields.so_no),
                          plunmbr: plunmbr},
       {$set: {
          qty: Decimal(newqty).toFixed(2),
          totalprice: Decimal(newtotprice).toFixed(2)
         }
      });
    } else {   // means new record
      var items = yield item.find({so_no: parseInt(sono)});
      var totprice = (price1 * quantity);
      console.log(' totprice: ',totprice);
      var rprice = Decimal(price1).toFixed(2);
      console.log(' rprice: ',rprice);
      //var sono = (items) ? items.length + 1 : 1;
      var itemid = (items) ? items.length + 1 : 1;
      var itemsave = yield item.insert({
                so_no: parseInt(sono),
                id: itemid,
                purpose: purpose,
                custnmbr: custnmbr,
                custname: custname,
                plunmbr: plunmbr,
                pludesc: pludesc,
                regprice: rprice,
                qty: Decimal(quantity).toFixed(2),
                totalprice: Decimal(totprice).toFixed(2)
      });
    }  // End of entering items

    // This is to retrieve the temp data list and pass to JSON
    var itemlist = yield item.find({so_no: parseInt(sono)});
    var totprice = _.sumBy(itemlist, function(price)
      { return parseFloat(price.totalprice);});
    var totqty = _.sumBy(itemlist, function(quantity)
      { return parseFloat(quantity.qty);});

    console.log('Calling data entry: Completed');
    console.log(' itemlist: ', itemlist);

    yield item1.remove();  // remove temp data
    for (var itemL of itemlist) {
      var itemsave1 = yield item1.insert({
          plunmbr: itemL.plunmbr,
          pludesc: itemL.pludesc,
          regprice: numberWithCommas(itemL.regprice),
          qty: numberWithCommas(itemL.qty),
          totalprice: numberWithCommas(itemL.totalprice)
      });
    }

    var itemlistFin = yield item1.find();
    console.log(' itemlistFin: ', itemlistFin);
    //this.redirect('/so/so_entry');
    this.body = {
      status: {
        success: true,
        error: false,
        returnMsg: itemlistFin
      }
    }
}

exports.save_list = function * (next) {
  console.log('Calling Save: Started');
  var fields = this.request.body;
  console.log('Bodyfields: ',fields);

  this.session.emploginname = fields.userid;
  this.session.sono = fields.so;
  this.session.purpose = fields.reason;

  console.log('this.session.emploginname: ',this.session.emploginname);
  console.log('this.session.custnum: ',this.session.custnmbr);
  console.log('this.session.custname: ',this.session.custname);
  console.log('this.session.selected_recall: ',this.session.selected_recall);
  console.log('this.session.sono: ',this.session.sono);
  console.log('this.session.purpose: ',this.session.purpose);

    var userid = this.session.emploginname;
    var cust = this.session.custname;
    var custnmbr = this.session.custnmbr;
    var sono = this.session.selected_recall ? this.session.selected_recall : this.session.sono;
    var purpose = this.session.purpose;

    var chk_data = yield item.find({so_no: parseInt(sono)});
    if (chk_data.length <= 0) {
        this.body = {
          status: {
            success: false,
            error: true,
            message: "Please enter barcode before clicking the save button.."
          }
        }
        console.log('Calling Save with Error');
        return;
    }

    //Delete existing record
    yield this.pg.db.client.query_('delete from so_unprocess where salesorderno=$1',[sono])

    // Read the temp table
    var so_entry = yield item.find({so_no: parseInt(sono)});
    for (var i = 0; i < so_entry.length; i++) {
      var sqlCom = "insert into so_unprocess " +
          "(salesorderno, salesdate, reasoncode, lineno, plunmbr, pludesc, custnmbr, custname, " +
          " username, quantity, regprice, overregprice, status) values " +
          "(" + sono + ",now(),\'" + purpose + "\'," + i + ",\'" +
            so_entry[i].plunmbr + "\',\'" + so_entry[i].pludesc + "\',\'" + custnmbr + "\',\'" + cust + "\',\'" +
            userid + "\'," + so_entry[i].qty + "," + (so_entry[i].regprice*100) + "," +
            (so_entry[i].totalprice)*100 + ",2);"
      console.log(sqlCom);
      var ins_result = yield this.pg.db.client.query_(sqlCom)
    };

    // Remove tmp data
    var delitems = yield item.remove({so_no: parseInt(sono)});

  this.session.selected_reprint=0;
  this.session.selected_recall=null;
  this.session.selected_recalled=0;

    this.body = {
      status: {
        success: true,
        error: false,
        returnMsg: "Save success..."
      }
    }
    console.log('Calling Save: Completed');
}


exports.recall = function * (next) {
    console.log('Calling Recall: Started');

  var plu_data = yield this.pg.db.client.query_("select plunmbr, pludesc, price1, qty1 from plu where plunmbr=(select plunmbr from sku where skunmbr=$1);", [fields.barcode])
  var tmpResults = plu_data.rows;
  console.log(' tmpResults: ',tmpResults);
  // If no records in PLU return
  if (tmpResults == "" || tmpResults == null) {
       this.body = {
        status: {
          success: false,
          error: true,
          message: "Item number doesn't exist."
        }
      }
      console.log('Calling data entry: Completed');
      return;
  }

  var plunmbr = plu_data.rows[0].plunmbr;
  var pludesc = plu_data.rows[0].pludesc;
  var price1 = (plu_data.rows[0].price1)/100;
  var qty1 = (plu_data.rows[0].qty1)/1000;

  var sono = this.session.sono;
  var cust = this.session.custname;
  var userid = this.session.emploginname;

  // This is to retrieve the temp data list and pass to JSON
  var itemlist = yield item.find({so_no: parseInt(sono)});
  var totprice = _.sumBy(itemlist, function(price)
    { return parseFloat(price.totalprice);});
  var totqty = _.sumBy(itemlist, function(quantity)
    { return parseFloat(quantity.qty);});

  console.log('so entry page', itemlist)
  yield this.render("so_entry", {
         so_no: sono,
          returnMsg: itemlist,
          returnQty: Decimal(totqty).toFixed(2),
          returnPrice: Decimal(totprice).toFixed(2),
          userid: userid,
          custname: cust
  });

    console.log('Calling Recall: Completed');
}


exports.print_so = function *(next) {
  console.log('Calling PrintSO: Started');
  var sono = this.session.selected_recall ? this.session.selected_recall : this.session.sono;
  var cust = this.session.custname;
  var custnmbr = this.session.custnmbr;
  var userid = this.session.emploginname;
  var purpose = this.session.purpose;

  console.log('this.session.selected_recall: ' + this.session.selected_recall);
  console.log('this.session.sono: ' + this.session.sono);
  console.log('this.session.custname: ' + this.session.custname);
  console.log('this.session.custnum: ' + this.session.custnmbr);
  console.log('this.session.emploginname: ' + this.session.emploginname);
  console.log('this.session.purpose: ' + this.session.purpose);


  var chk_data = yield item.find({so_no: parseInt(sono)});
  if (chk_data.length <= 0) {
      this.body = {
        status: {
          success: false,
          error: true,
          message: "Please enter barcode before clicking the PrintSO button.."
        }
      }
      console.log('Calling PrintSO with Error');
      return;
  }
  //Create the barcode
  //zint --height=40 --rotate=0 --output=test.png -d 1234
  // Convert the password
  require('shelljs/global');
  var cmd = "/usr/bin/zint --height=15 --rotate=0 --notext --output=/samba/secured/Workspace/SalesOrder/src/client/styles/barcode/" + sono + ".png -d " + sono;
  var child = exec(cmd, {async:false});  // disable the async flag to get the results upon request
  console.log('cmd: ' + cmd);

  /*var cmd1 = "rm -f /samba/secured/Workspace/SalesOrder/src/client/styles/pdf/invoice.pdf";
  var child = exec(cmd1, {async:false});  // disable the async flag to get the results upon request
  console.log('cmd1: ' + cmd1);
  */
  //Delete existing record for not reprint
  if (this.session.selected_reprint == 0) {
    yield this.pg.db.client.query_('delete from so_unprocess where salesorderno=$1',[sono])
  }

  //var html = fs.readFileSync('src/client/views/invoice.html', 'utf8');
  var html = fs.readFileSync('/samba/secured/Workspace/SalesOrder/src/client/styles/template/invoice.html', 'utf8');
  var options = { format: 'Letter', "font": 'Times New Roman' };
  //var options = { format: 'Letter' };

  var html = "<html> " +
             " <head> " +
             " <style>" +
             " .framebg {" +
             "    background-color: #E9E9E9;" +
             "    font-family: Times New Roman;" +
             "  }" +
             "  *{" +
             "    transition: all ease-in-out .5s;" +
             "  }" +
             "  .wrap{" +
             "    display: block;" +
             "    width: 100%;" +
             "    margin: 10px auto;" +
             "    border: 2px solid #333;" +
             "    position: relative;" +
             "    padding: 10px;" +
             "    box-sizing: border-box;" +
             "  }" +
             "  .item{" +
             "    display: block;" +
             "    padding: 2px;" +
             "    color: #000;" +
             "    font-size :0;" +
             "    width: 100%;" +
             "    box-sizing: border-box;" +
             "  }" +
             "  .item:nth-child(odd){" +
             "    background-color: #d4d4d4;" +
             "  }" +
             "  .item:nth-child(even){" +
             "    background-color: #fff;" +
             "  }" +
             "  .item div{" +
             "    display: inline-block;" +
             "    padding: 2px;" +
             "    text-align: left;" +
             "    box-sizing: border-box;" +
             "    border-bottom: 1px solid #333;" +
             "    color: #000;" +
             "    font-size: 8pt;" +
             "    width: 16.5%;" +
             "    vertical-align: top;" +
             "    height: 30px;" +
             "    overflow: hidden;" +
             "  }" +
             "  .item div.item_number{ " +
             "     width: 10%; " + 
             "   }             " +
             "  .item div.item_desc{ " +
             "     width: 18%; " + 
             "   }             " +
             "  .item div.item_desc1{ " +
             "     width: 16.5%; " + 
             "   }             " +
             "  .item_action {" +
             "    text-align: left;" +
             "  }" +
             "  .item_price {" +
             "    text-align: right;" +
             "  }" +
             "  .item .item_price {" +
             "    text-align: right;" +
             "    font-family: Times New Roman;" +
             "  }" +
             "  .item .item_quantity {" +
             "    text-align: right;" +
             "  }" +
             "  .item .item_total_price {" +
             "    text-align: right;" +
             "  }" +
             "   .header-items div{" +
             "    font-weight: bold;" +
             "  }" +
             "  .item span{" +
             "    display: none;" +
             "    font-size: 8pt;" +
             "    color: #333;" +
             "    padding-bottom: 10px;" +
             "  }" +
             "  .headdleft {" +
             "    font-size: 8px;" +
             "    font-family: Times New Roman;" +
             "    text-align: left;" +
             "  }" +
             "  .headrigth {" +
             "    font-size: 8px;" +
             "    font-family: Times New Roman;" +
             "    text-align: right;" +
             "  }" +
             "  .maintitle {" +
             "    font-size: 14px;" +
             "    font-family: Times New Roman;" +
             "    text-align: center;" +
             "  }" +
             "  </style>" +
             "  </head>" +
             "     <body class=\"framebg\">" +
             "     <div class=\"headrigth\">  " +
             "         <p id=\"getdate\"></p>" +
             "         <script>" +
             "         var d = new Date();" +
             "         document.getElementById(\"getdate\").innerHTML = d.toUTCString();" +
             "         </script>" +
             "     </div>" +
             "     <br>" +
             "     <div class=\"maintitle\"> Sales Order - Invoice </div>" +
             "     <div class=\"headdleft\"> <img src=\""+ IPAddress + "so/barcode/" + sono + ".png\"/> </div>" +
             "     <div class=\"headdleft\"> SO Number: " + sono + " </div>" +
             "     <div class=\"headdleft\"> Customer Name: " + cust + " </div>" +
             "     <div class=\"headdleft\"> Purpose: " + purpose + " </div>" +
             "     <div class=\"headdleft\"> User ID: " + userid + " </div>" +
             "     <div class=\"item header-items\">" +
             "       <div class=\"item_number\"> No.  </div>" +
             "       <div> Item number  </div>" +
             "       <div class=\"item_desc\"> Item Description  </div>" +
             "       <div class=\"item_price\"> Regular Price  </div>" +
             "       <div class=\"item_price\"> Quantity  </div>" +
             "       <div class=\"item_price\"> Total Price  </div>" +
             "     </div>";
            var html1 = "";
            var idno = 0;
            var totqty = 0;
            var totprice = 0;
            var so_entry = yield item.find({so_no: parseInt(sono)});
            for (var i = 0; i < so_entry.length; i++) {
                     idno = idno+1;
                     totqty += parseFloat(so_entry[i].qty);
                     totprice += parseFloat(so_entry[i].totalprice);
                     var trprice = Decimal(so_entry[i].regprice).toFixed(2);
                     var ttprice = Decimal(so_entry[i].totalprice).toFixed(2);
                     var ttqty = so_entry[i].qty
                     html1 = html1 + "       <div class=\"item\">" +
                     "         <div class=\"item_number\">" +
                     "           <span> No.  </span>" +
                     "            " + idno +
                     "         </div>" +
                     "         <div class=\"item_plu_number\">" +
                     "         <span> Item number.  </span>" +
                     "           "+ so_entry[i].plunmbr +
                     "         </div>" +
                     "         <div class=\"item_description\">" +
                     "         <span> Item Description  </span>" +
                     "         " + so_entry[i].pludesc +
                     "         </div>" +
                     "         <div class=\"item_price\">" +
                     "         <span> Regular Price  </span>" +
                     "         "+ numberWithCommas(trprice) +
                     "         </div>" +
                     "         <div class=\"item_quantity\">" +
                     "         <span> Quantity  </span>" +
                     "         " +  numberWithCommas(ttqty) +
                     "         </div>" +
                     "         <div class=\"item_total_price\">" +
                     "         <span> Total Price  </span>" +
                     "         " + numberWithCommas(ttprice) +
                     "         </div>" +
                     "       </div>"

                // Read the temp table and save to so_unprocess table
                if (this.session.selected_reprint == 0) {
                  var sqlCom = "insert into so_unprocess " +
                      "(salesorderno, salesdate, reasoncode, lineno, plunmbr, pludesc, custnmbr, custname, " +
                      " username, quantity, regprice, overregprice, status) values " +
                      "(" + sono + ",now(),\'" + purpose + "\'," + i + ",\'" +
                        so_entry[i].plunmbr + "\',\'" + so_entry[i].pludesc + "\',\'" + custnmbr + "\',\'" + cust + "\',\'" +
                        userid + "\'," + so_entry[i].qty + "," + (so_entry[i].regprice*100) + "," +
                        (so_entry[i].totalprice)*100 + ",1);"
                  console.log(sqlCom);
                  var ins_result = yield this.pg.db.client.query_(sqlCom)
                }
            };
             var tqty = Decimal(totqty).toFixed(2);
             var tprice = Decimal(totprice).toFixed(2);
             var html2 = html + html1 + "     <div class=\"item header-items\">" +
             "       <div class=\"item_number\">   </div>" +
             "       <div>   </div>" +
             "       <div class=\"item_desc1\">  </div>" +
             "       <div class=\"item_price\"> Total:  </div>" +
             "       <div class=\"item_price\"> " + numberWithCommas(tqty) + " </div>" +
             "       <div class=\"item_price\"> " + numberWithCommas(tprice) + " </div>" +
             "     </div>" +
             "     </body>" +
              "     </html>";
  //console.log(html2);
	
  var pdffile = "/samba/secured/Workspace/SalesOrder/src/client/styles/pdf/invoice_" + sono + ".pdf";
  pdf.create(html2, options).toFile(pdffile, function(err, res) {
    if (err) return console.log(err);
    console.log(res);
  });

  // Update SO number status
  var cust_data = yield this.pg.db.client.query_("update so_unprocess set status=1 where salesorderno=$1;", [sono])

    // Remove tmp data
    var delitems = yield item.remove({so_no: parseInt(sono)});

  // Send PDF printing to network printer
/*  fs.readFile('src/client/views/pdf/invoice.pdf', function(err, data) {
    if (err)
      throw err;

    var printer = ipp.Printer("http://172.17.97.229:631/ipp/printer");
    var msg = {
      "operation-attributes-tag": {
        "requesting-user-name": "William",
        "job-name": "My Test Job",
        "document-format": "application/pdf"
      },
      data: data
    };
    printer.execute("Print-Job", msg, function(err, res){
      console.log(res);
    });
  });
*/
  this.session.selected_reprint=0;
  this.session.selected_recall=null;
  this.session.selected_recalled=0;

  console.log('Calling printSO: Completed');

  this.body = {
    status: {
      success: true,
      error: false,
      returnMsg: "SO# " + sono + " was successfully generated."
    }
  }
  console.log('Calling PrintSO: Completed');
}

exports.delete_so = function  *(next){

  console.log('Calling Delete SO: Started');
  var fields = this.request.body.data;

  var sono = this.session.selected_recall ? this.session.selected_recall : this.session.sono;

  var chk_data = yield item.find({so_no: parseInt(sono)});
  if (chk_data.length <= 0) {
      this.body = {
        status: {
          success: false,
          error: true,
          message: "Please enter barcode before clicking the DeleteSO button.."
        }
      }
      console.log('Calling Delete SO with Error');
      return;
  }  

  console.log('SO No: ', sono);

  // Remove saved data from so_unprocess table
  //var cust_data = yield this.pg.db.client.query_("delete from so_unprocess where salesorderno=$1;", [sono])
  var cust_data = yield this.pg.db.client.query_("update so_unprocess set status=4 where salesorderno=$1;", [sono])

  // Remove tmp data
  var delitems = yield item.remove({so_no: parseInt(sono)});

  this.session.selected_reprint=0;
  this.session.selected_recall=null;
  this.session.selected_recalled=0;

  console.log('Calling Delete SO: Completed');
  this.body = {
    status: {
      success: true,
      error: false,
      message: "SO number deleted..." + sono
    }
  }
}

exports.cancel_so = function  *(next){

  console.log('Calling Cancel SO: Started');
  var fields = this.request.body.data;

  var sono = this.session.selected_recall ? this.session.selected_recall : this.session.sono;
  console.log('SO No: ', sono);

  this.session.selected_reprint=0;
  this.session.selected_recall=null;
  this.session.selected_recalled=0;
  console.log('Calling Cancel SO: Completed');
  this.body = {
    status: {
      success: true,
      error: false,
      message: "SO number cancelled..." + sono
    }
  }
}

