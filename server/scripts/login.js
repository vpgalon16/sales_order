
//var conString = 'postgres://postgres:@db1:5432/tplinux'

exports.index = function * (next) {
  console.log('login page: ' + this.session.emploginname);

  //var reroute = "";
  //if (this.session.emploginname == "undefined" || this.session.emploginname == null)
	reroute = "login";
  //else
//	reroute = "customer";
  this.session.emploginname = this.session.emploginname;
  console.log('Reroute: ' + reroute );
  yield this.render(reroute , {});
}

exports.login_reset = function * (next){

console.log('Call Reset Function : ',this.session.emploginname);
  var msgLog="";
  if (this.session.emploginname == null)
      msgLog="No user login to reset.."
  else
      msgLog="Reset this user[" + this.session.emploginname + "] successfully..."
  this.session.sono = "";
  this.session.emploginname = "";
  this.session = null;
  this.body = {
    status: {
      success: true,
      error: false,
      message: msgLog
    }
  }
}
exports.login_server = function * (next) {
  var fields = this.request.body;
  console.log('from new login controller: ', fields);

  if (isNaN(fields.emploginname) || fields.emploginname == "" ||
      fields.emploginname == null) {  // Check for alpha
    console.log('fields.emploginname: [' + fields.emploginname + ']');
     this.body = {
      success: false,
      message: "User name can only accept numeric.."
     }
     return;
  }

  // Check if session already login
  console.log('fields.emploginname.trim(): [' + fields.emploginname.trim()+"]");
  console.log('this.session.emploginname: [' + this.session.emploginname+"]");
  if (fields.emploginname.trim() == this.session.emploginname) {
    console.log('Session already login: [' + fields.emploginname + ']');
     this.body = {
      success: false,
      message: "This user [" + fields.emploginname + "] was already login..."
     }
     return;
   }

  // Getting data from TPLinux DB
  var results = "";
  //console.log("conString", conString);
  results = yield this.pg.db.client.query_("select emppin, empprofile from employee where empnmbr=$1;", [fields.emploginname])
  var tmpResults = results.rows;
  console.log('results: [' + tmpResults + ']');
  if (tmpResults == "" || tmpResults == null) {
    console.log('tmpResults: [' + tmpResults + ']');
     this.body = {
      success: false,
      message: "Login name is not exist, Please try again..."
     }
     //yield this.render("login", {
     //   Message: "Login name is not exist, Please try again..."
     // });
     return;
  }
  var empprofile = results.rows[0].empprofile;
  results = results.rows[0].emppin;

  // Check login user profile
  console.log('empprofile: [' + empprofile + ']');
  if (empprofile > 5) {
     this.body = {
      success: false,
      message: "Permission denied..."
     }
     //yield this.render("login", {
     //   Message: "Login name is not exist, Please try again..."
     // });
     return;
  }

  // Convert the password
  require('shelljs/global');
  var cmd = "/usr/sbin/tpdecrypt " + results;
  var child = exec(cmd, {async:false});  // disable the async flag to get the results upon request
  console.log('Entered Login: ' + fields.emploginname);
  console.log('DB Pass (Encrypt):', results);
  console.log('DB Pass (Decrypt): ' + child);
  console.log('Entered Pass: ' + fields.emploginpasswd);
  var pass_flag = "0";
  if (child.trim() == fields.emploginpasswd.trim()) {
    pass_flag = "1";
  }

  console.log('pass_flag: ' + pass_flag);
  if (pass_flag == "0") {
   this.body = {
    error: true,
    message: "Invalid Login, Please try again..."
   }
   //yield this.render("login", {
   //   Message: "Invalid Login, Please try again..."
   // });
  } else {
   //var delitems = yield item.remove({});

    this.session.emploginname = fields.emploginname;
    this.body = {
    success: true,
    message: "Successfully login.."
   }
   //yield this.render("customer", {
   //   Message: fields.emploginname
   // });
  }
  return;
}
