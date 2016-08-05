var config = require('./config');

var proxy = require('./component/proxyScraper');
var signup = require('./component/signup');
var email = require('./component/emailVerify');
var db = require('./component/db');

var signupWorkerCount = 1;


var initSignupWorker = function() {
  signup.ptcSignup()
    .then(function(res) {
      console.log('====== RUNNING AGAIN ======');
      initSignupWorker();
    }, function(err) {
      console.log('Signup Worker err:', err);
      console.log('====== RUNNING AGAIN ======');
      initSignupWorker();
    });
};


var init = function() {
  proxy.refresh()
  .then(function(res) {
    email.start();
    for (var i = 0; i < signupWorkerCount; i++) {
      console.log('new signup worker');
      initSignupWorker();
    }
  }, function(err) {
    console.log('proxy err:', err);
    init();
  });
}


init();
db.listVerified();
