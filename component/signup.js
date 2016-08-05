var Nightmare = require('nightmare');
var request = require('request');
var moment = require('moment');
var q = require('q');

var config = require('../config');
var proxy = require('./proxyScraper');
var db = require('./db');


function propCase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


var userGen = function() {
  var defer = q.defer();
  var userApi = 'http://api.randomuser.me/';

  request(userApi, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      defer.resolve(JSON.parse(body));
    } else {
      console.log('userGen err:', error);
      defer.reject(error);
    }
  })


  return defer.promise;
};


var ptcSignup = function(data) {
  var ptcDefer = q.defer();

  var randWait = function() {
    return Math.floor(Math.random() * 1028) + 998;
  }


  var initiate = function(userData) {

    console.log('======== now running (state: just-got-user-data)==========');
    var defer = q.defer();
    var user = {};

    // username limit = 16

    user.year = moment.unix(userData.dob).format('YYYY') * 1;
    if (user.year < 1940) user.year = 1940;
    if (user.year > 1991) user.year = 1991;

    user.month = moment.unix(userData.dob).format('M') * 1 - 1;
    user.day = moment(new Date()).format('D');


    var tempUserName = userData.login.username;
    if (tempUserName.length > 10) {
      tempUserName = tempUserName.slice(0, (Math.floor(Math.random() * 3) + 8));
    }

    user.username = tempUserName + userData.login.sha256.substr(1, 3);
    user.password = userData.login.salt;
    user.name = propCase(userData.name.first) + ' ' + propCase(userData.name.last);
    user.email = userData.name.first + userData.login.sha256.substr(3, 3) + '@' + config.email.suffix;
    user.emailPrefix = user.email.replace('@pokeless.com', '');


    console.log('======== now running (state: pre-proxy-get)==========');
    proxy.get()
      .then(function(res) {

        console.log('signup using ' + res.ip + ':' + res.port);

        user.ip = res.ip;
        user.port = res.port;

        var nightmare = Nightmare({
          show: config.debug.signup,
          useContentSize: true,
          // penDevTools: {
          //   mode: 'detach'
          // },
          // switches: {
          //   'proxy-server': res.ip + ':' + res.port,
          //   'ignore-certificate-errors': true
          // },
          gotoTimeout: 10000,
          waitTimeout: 10000,
          loadTimeout: 15000
        });


        nightmare
          .goto('https://club.pokemon.com/')
          .wait(1000)
          .cookies.clear()
          .wait(1000)

          .goto('https://club.pokemon.com/us/pokemon-trainer-club/sign-up/')
          .exists('.subtitle-404')
          .then(function(elExists) {
            if (!elExists) {

              nightmare
                .wait(randWait())
                .wait('form.form-inner.verify-age-form input[type="submit"]')
                .select('#id_country', 'US')
                .wait(randWait())
                .click('input#id_dob')
                .wait(randWait())
                .select('.month', user.month)
                .wait(randWait())
                .select('.year', user.year)
                .wait(randWait())
                .click('.picker.picker--opened button.picker__button--clear')
                .wait(randWait())
                .wait('form.form-inner.verify-age-form input[type="submit"]')
                .click('form.form-inner.verify-age-form input[type="submit"]')
                .wait(randWait())

                .wait('input#id_username')
                .type('input#id_username', user.username)
                .wait(randWait())
                .type('input#id_password', user.password)
                .wait(randWait())
                .type('input#id_confirm_password', user.password)
                .wait(randWait())
                .type('input#id_email', user.email)
                .wait(randWait())
                .type('input#id_confirm_email', user.email)
                // .wait(randWait())
                // .click('input#id_public_profile_opt_in_1')
                .wait(randWait())
                .type('input#id_screen_name', user.username)
                .wait(randWait())
                .click('input#id_terms')
                .wait(randWait())
                .click('form#user-signup-create-account-form input[type="submit"]')
                .wait(randWait())

                .evaluate(function(){
                  return document.title;
                })
                .end()
                .then(function (result) {
                  console.log('signup success:', result)
                  db.putUnverified({
                    key: user.emailPrefix,
                    value: user
                  }).then(function() {
                    defer.resolve(user)
                  }, function(err) {
                    nightmare.end()
                    .then(function() {
                      defer.reject(err)
                    })
                  })
                })
                .catch(function (error) {
                  // console.log('signup err0:', error)
                  nightmare.end()
                  .then(function() {
                    defer.reject(error)
                  })
                })

            } else {
              // console.log('PTC Under Maintenance')
              nightmare.end()
              .then(function() {
                defer.reject('PTC Under Maintenance')
              })
            }
          })
          .end()
          .catch(function(error) {
            // console.log('signup err1:', error)
            nightmare.end()
            .then(function() {
              defer.reject(error)
            })
          })


      }, function(err) {
        console.log('proxy err:', err);
        nightmare.end()
        .then(function() {
          defer.reject(err)
        });
      });


    return defer.promise;
  };


  userGen()
    .then(function(res) {
      // console.log(res.results[0]);
      initiate(res.results[0])
        .then(function(res) {
          ptcDefer.resolve(res);
        }, function(err) {
          ptcDefer.reject(err);
        });

    }, function(err) {
      console.log(err);
      ptcDefer.reject(err);
    });

  return ptcDefer.promise;
};

module.exports = {
  ptcSignup: ptcSignup
}
