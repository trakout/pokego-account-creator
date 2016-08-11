var Nightmare = require('nightmare');
var q = require('q');

var db = require('./db');
var proxy = require('./proxyScraper');
var signup = require('./signup');
var config = require('../config');
var nightmare = null;
var pollCount = 0;
var polling = false;


var initNightmare = function() {
  nightmare = Nightmare({
    show: config.debug.emailVerify,
    useContentSize: true
    // openDevTools: {
    //   mode: 'detach'
    // }
  });
  // nightmare.cookies.clearAll()
};


var login = function(nightmare) {
  var defer = q.defer();
  console.log('emailVerify: Logging into Email');

  nightmare
    .wait('#gaia_firstform')
    .type('input#Email', config.email.user)
    .click('input#next')
    .wait('input#Passwd')
    .type('input#Passwd', config.email.pass)
    .click('input#signIn')
    .wait('span.gb_Rb')
    .wait(2500)
    .then(function() {
      defer.resolve(true);
    });

  return defer.promise;
};


var archive = function(nightmare) {
  var defer = q.defer();
  console.log('emailVerify: Archiving Email');

  nightmare
    .exists('input[value="Archive"]')
    .then(function(elExists) {
      if (elExists) {
        nightmare
          .click('input[value="Archive"]')
          .then(function() {
            defer.resolve(true)
          })
      } else {
        console.log('emailVerify: Archiving Email Failure, archive button missed')
        defer.resolve(false)
      }
    });

  return defer.promise;
};


var verifyExternal = function(url, userIndex, newProxy) {
  console.log('emailVerify: Verifying Email via proxy');
  newProxy = true;

  db.getUnverified({
    key: userIndex
  }).then(function(res) {

    var proxyNightmare = null;

    if (!newProxy) {
      proxyNightmare = Nightmare({
        show: config.debug.emailVerify,
        useContentSize: true,
        switches: {
          'proxy-server': res.ip + ':' + res.port,
          'ignore-certificate-errors': true
        },
        gotoTimeout: 10000
      });

      proxyNightmare
        .goto(url)
        .wait(2000)
        .wait('.cufonAlternate')
        .exists('.cufonAlternate')
        .end()
        .then(function(result) {
          if (result) {
            // TODO: db del & put
            db.putVerified({key:userIndex, value:res})
              .then(function() {
                // if (!polling) start();
                console.log('user added!!!');
              }, function(err) {
                console.log(err)
              })

            db.delUnverified({key:res.emailPrefix})
              .then(function() {
                console.log('db cleanup success')
              }, function(err) {
                console.log(err)
              })
          } else {
            console.log('We lost one.')
            // if (!polling) start();
          }
        });

    } else {

      proxy.get().then(function(data) {
        proxyNightmare = Nightmare({
          show: config.debug.emailVerify,
          useContentSize: true,
          // switches: {
          //   'proxy-server': data.ip + ':' + data.port,
          //   'ignore-certificate-errors': true
          // },
          gotoTimeout: 10000
        });

        proxyNightmare
          .goto(url)
          .wait(2000)
          .wait('.cufonAlternate')
          .exists('.cufonAlternate')
          .end()
          .then(function(result) {
            if (result) {
              // TODO: db del & put
              db.putVerified({key:userIndex, value:res})
                .then(function() {
                  // if (!polling) start();
                  console.log('user added!!!');
                }, function(err) {
                  console.log(err)
                })

              db.delUnverified({key:res.emailPrefix})
                .then(function() {
                  console.log('db cleanup success')
                }, function(err) {
                  console.log(err)
                })
            } else {
              console.log('We lost one.')
              // if (!polling) start();
            }
          })
      });
    }

  }, function(err) {
    console.log(err)
  })


  // TODO:
  // - attempt connecting to URL using proxy, if not use new proxy
  // - clear cookies and end()
};


var poll = function(nightmare) {
  // polling = true;
  if (pollCount > 20) {
    pollCount = 0;
    signup.ptcSignup()
      .then(function(res) {
        console.log('====== RUNNING AGAIN: artificial pollcount increase ======');
        pollCount = 11;
      }, function(err) {
        console.log('Signup Worker err:', err);
        console.log('====== RUNNING AGAIN: error handle from poll ======');
        pollCount = 11;
      });
  }

  var defer = q.defer();
  console.log('Polling Email, pollCount:', pollCount);

  nightmare
    .wait(6000)
    .goto('https://mail.google.com/?ui=html')
    .evaluate(function() {
      return document.getElementsByClassName("ts")[0].innerHTML.indexOf('<b>') < 0;
    })
    .then(function(result) {
      // console.log('poll result', result);
      if (!result) {
        console.log('New Email Found!')

        pollCount = 0
        return nightmare
          .evaluate(function() {
            return document.getElementsByClassName("ts")[0].parentNode.href;
          })
          .then(function(url) {
            return nightmare
              .goto(url)
              .wait('.msg')
              .click('.msg a')
              .then(function() {
                return nightmare
                  .evaluate(function() {
                    // get verify URL
                    return document.querySelector('.msg > font:nth-child(2) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(7) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > a:nth-child(1)').href;
                  })
                  .then(function(verifyUrl){
                    return nightmare
                      .evaluate(function() {
                        return document.querySelector('.msg').parentNode.parentNode.parentNode.childNodes[1].childNodes[0].innerText.replace('To: ', '').replace('@pokeless.com', '').trim()
                      })
                      .then(function(emailPrefix) {
                        // console.log('emailPrefix:', emailPrefix)
                        // console.log('verifyUrl:', verifyUrl)
                        verifyExternal(verifyUrl, emailPrefix)
                        poll(nightmare)
                      })
                  })
              })

        })

      } else {
        poll(nightmare);
        pollCount++;
      }
    });

  return defer.promise;
};


// check login state
var checkLogin = function(nightmare) {
  console.log('emailVerify: Checking Email Login');
  var defer = q.defer();

  nightmare
    .wait(1000)
    .goto('https://mail.google.com/?ui=html')
    .wait(2500)
    .exists('input[value="Archive"]')
    .then(function(elExists) {
      if (elExists) {
        console.log('emailVerify: Already Logged In.')
        defer.resolve(true)
      } else {
        console.log('emailVerify: Not logged in yet.')
        defer.resolve(false);
      }
    })

  return defer.promise;
}


var start = function() {
  if (!nightmare) initNightmare();

  checkLogin(nightmare).then(function(res) {
    if (res === true) {
      poll(nightmare);
    } else {
      login(nightmare).then(function(res) {
        start();
      });
    }
  });


};


module.exports = {
  start: start
}
