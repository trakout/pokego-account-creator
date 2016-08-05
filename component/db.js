var q = require('q');
var levelup = require('levelup');

var config = require('../config');

var udb = levelup('./pokego-unverified', {valueEncoding: 'json'});
var vdb = levelup('./pokego-verified', {valueEncoding: 'json'});


var putUnverified = function(data) {
  var defer = q.defer();
  if (!data) defer.reject('Missing putUnverified data');

  udb.put(data.key, data.value, function (err) {
    if (err) {
      console.log('levelup err:', err)
      defer.reject(err)
    } else {
      defer.resolve()
    }
  })

  return defer.promise;
};


var getUnverified = function(data) {
  var defer = q.defer();
  if (!data) defer.reject('Missing getUnverified data');

  udb.get(data.key, function (err, value) {
    if (err) {
      console.log('levelup unverified key not found..');
      defer.reject(err);
    } else {
      console.log(value);
      defer.resolve(value);
    }
  })

  return defer.promise;
};


var delUnverified = function(data) {
  var defer = q.defer();
  if (!data) defer.reject('Missing delUnverified data');

  udb.del(data.key, function (err) {
    if (err) {
      console.log('levelup delete error');
      defer.reject(err);
    } else {
      defer.resolve();
    }
  });

  return defer.promise;
};


var putVerified = function(data) {
  var defer = q.defer();
  if (!data) defer.reject('Missing putUnverified data');

  vdb.put(data.key, data.value, function (err) {
    if (err) {
      console.log('levelup putVerified err:', err)
      defer.reject(err)
    } else {
      defer.resolve()
    }
  })

  return defer.promise;
};


var listVerified = function() {
  console.log('The following users have been saved:')
  vdb.createReadStream()
    .on('data', function (data) {
    // console.log(data.key, '=', data.value)
    // console.log(data.key + ' => ' + JSON.stringify(data.value));
    console.log(data.key);
  })
  .on('error', function (err) {
    console.log('Oh my!', err)
  })
  .on('close', function () {
    console.log('Stream closed')
  })
  .on('end', function () {
    console.log('Stream ended')
  })
};


module.exports = {
  putUnverified: putUnverified,
  getUnverified: getUnverified,
  delUnverified: delUnverified,
  putVerified: putVerified,
  listVerified: listVerified
}
