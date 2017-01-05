var monk = require('monk');
var db = monk('localhost/tplinux');
var item = db.get('items');
var item1 = db.get('itemstmp');

exports.index = function * (next){
  console.log('Customer page')
  this.session.selected_recall = null;
  this.session.selected_reprint = 0;
  var session_id = this.session.emploginname;
  console.log('session: ', session_id);
  yield this.render("customer", {Message: session_id});
}


// This routine will do the entering of customer number to get the customer name
exports.call_server =  function * (next){
  var fields = this.request.body;
  console.log('Retrieve bodyfields: ',fields);
  var results = "";

  console.log('this.session.selected_reprint : ', this.session.selected_reprint)
  console.log('this.session.selected_recalled: ', this.session.selected_recalled)
  console.log('sono: ', sono)
  console.log('this.session.selected_recall: ', this.session.selected_recall)

  //Check if reprintSO click but no selection throw an error
  if (this.session.selected_reprint == 1 && this.session.selected_recall == null) {
    	this.session.selected_reprint = 0;
      this.session.selected_recalled= 0;
      this.session.selected_recall=null;
       this.body = {
        status: {
          success: false,
          error: true,
          message: "Reprint SO been clicked but no SO number selected.. Please select SO No."
        }
      }
     return;
  }

  //Check if recalled click but no selection throw an error
  if (this.session.selected_recalled== 1 && (this.session.selected_recall == 'undefined' || this.session.selected_recall == '' || this.session.selected_recall == null)) {
    	this.session.selected_recalled= 0;
      this.session.selected_recall=null;
       this.body = {
        status: {
          success: false,
          error: true,
          message: "Recalled been clicked but no SO number selected.. Please select SO No."
        }
      }
     return;
  }

 // Getting data from TPLinux DB
  results = yield this.pg.db.client.query_("select firstname from customer where custnmbr=$1;", [fields.custnmbr])
  var tmpResults = results.rows;
  console.log('fields.custnmbr: [' + tmpResults + ']');
  if (tmpResults == "" || tmpResults == null) {
    console.log('fields.custnmbr: [' + fields.custnmbr + ']');
     /*yield this.render("customer", {
        Message: fields.userid,
        errMsg: "Customer number is not exist, Please try again..."
      });*/
       this.body = {
        status: {
          success: false,
          error: true,
          message: "Customer number is not exist, Please try again..."
        }
      }
     return;
  }
  results = results.rows[0].firstname;

  console.log('results: ',results);
  if (results == null || results == "") {
     /*yield this.render("customer", {
        Message: fields.userid,
        errMsg: "Invalid customer number, Please try again..."
      });*/
       this.body = {
        status: {
          success: false,
          error: true,
          message: "Invalid customer number, Please try again..."
        }
      }
     return;
  } else {
     // Initialialise temporary data
      this.session.sono = "";
      this.session.custname = "";
      this.session.purpose = "";
      this.session.custnmbr = "";

      if (this.session.selected_reprint == 1 || this.session.selected_recalled == 1)
        ;
      else
        yield item1.remove();

     // Get the new SO_NO from sequence number
     var next_so_no = yield this.pg.db.client.query_("select nextval(\'salesorder_seq\') as orderno")
     var sono = next_so_no.rows[0].orderno;

     this.session.sono = sono;
     this.session.custname = results;
     this.session.custnmbr = fields.custnmbr;
     this.session.purpose = fields.purpose;
     this.session.emploginname = fields.userid;
     //this.redirect("/so/so_entry");
     this.body = {
      status: {
        success: true,
        error: false,
        message: "Successfully get customer informastion.."
      }
     }
     // yield this.render("so_entry", {
     //    custname: results,
     //    userid: fields.userid,
     //    so_no: sono
     //  });
  }
}


exports.select_sono = function * (){
  var selected = this.request.body.data;
  this.session.selected_recall = selected;

  console.log("this.session.selected_recall :", this.session.selected_recall);

  this.body = {
    status:{
      success: true,
      error: false,
      message: "Selected " + selected
    }
  }
}


exports.enable_recall = function  *(){
   var fields = this.request.body.data;
   console.log('field ', fields);
  /*if (this.session.selected_reprint == 1 && this.session.selected_recall != null) {
       this.body = {
        status: {
          success: false,
          error: true,
          message: "Recall is not allowed in this function.."
        }
      }
      return;
  }*/
  var cust_data = yield this.pg.db.client.query_("select distinct salesorderno from so_unprocess where custnmbr=$1 and status=2 order by salesorderno;", [fields])
  var tmpResults = cust_data.rows;
  console.log(' tmpResults: ',tmpResults);
  // If no records in PLU return
  if (tmpResults == "" || tmpResults == null) {
      var msgDat = "";
      if (fields == '' || fields == null)
        msgDat = "Customer number was empty";
      else
        msgDat = "No available SO list to RECALL of this customer: " + fields;
       this.body = {
        status: {
          success: false,
          error: true,
          message: msgDat
        }
      }
      return;
  }

  this.session.selected_recalled = 1;
  this.session.selected_recall=null;
  this.session.selected_reprint = 0;
  var cust_sono = cust_data.rows[0].salesorderno;
   this.body = {
    status: {
      success: true,
      error: false,
      message: "Customer number exist with Recall no." + cust_sono
    },
    list: tmpResults
  }
}


exports.reprintSO = function  *(){
   var fields = this.request.body.data;
   console.log('field ', fields);
  /*if (this.session.selected_recall != null) {
       this.body = {
        status: {
          success: false,
          error: true,
          message: "Reprint is not allowed in this function.."
        }
      }
      return;
  }*/
  var cust_data = yield this.pg.db.client.query_("select distinct salesorderno from so_unprocess where custnmbr=$1 and status=1 order by salesorderno;", [fields])
  var tmpResults = cust_data.rows;
  console.log(' tmpResults: ',tmpResults);
  // If no records in PLU return
  if (tmpResults == "" || tmpResults == null) {
      var msgDat = "";
      if (fields == '' || fields == null)
        msgDat = "Customer number was empty";
      else
        msgDat = "No available SO list to RE-PRINT SO of this customer: " + fields

       this.body = {
        status: {
          success: false,
          error: true,
          message: msgDat
        }
      }
      return;
  }

  this.session.selected_reprint = 1;
  this.session.selected_recall=null;
  this.session.selected_recalled=0;
  var cust_sono = cust_data.rows[0].salesorderno;
   this.body = {
    status: {
      success: true,
      error: false,
      message: "Customer number exist with Recall no." + cust_sono
    },
    list: tmpResults
  }
}
