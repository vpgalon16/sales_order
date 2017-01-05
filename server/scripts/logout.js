
exports.index = function * (next){
  var id = this.params.userID;
  console.log('Logout userID: ',id);

console.log('this.session.SID: ',this.session.sid);

  this.session.sono = "";
  this.session.emploginname = "";
  this.session = null;
  yield this.render("login", {
      //Message: fields.emploginname
  });
 }
