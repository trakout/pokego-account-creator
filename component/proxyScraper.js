var search = require('js-proxy-finder');
var request = require('request');
var q = require('q');

var proxyList = null;


var check = function(host, port, options) {
  var defer = q.defer();

  var proxyRequest = request.defaults({
		proxy: 'http://' + host + ':' + port,
    timeout: 2000
	});
	proxyRequest(options.url, function(err, res) {
		if (err) {
      // console.log(0);
      // console.log(err);
      defer.reject();
		} else if( res.statusCode != 200 ) {
      // console.log(1);
			defer.reject();
		} else if( !res.body || (options.regex && !options.regex.exec(res.body)) ) {
      // console.log(2);
      // console.log('regex issue');
			defer.reject();
		} else {
      console.log('Proxy Check: good proxy found');
			defer.resolve({
        'ip': host,
        'port': port
      })
		}
	});

  return defer.promise;
};


var generate = function() {
  var defer = q.defer();

  search.getProxies(function (err, proxies) {
    if (err) {
      throw err
      defer.reject(err);
    }

    proxyList = [];
    var promiseArr = [];
    for (var key in proxies) {
      if (proxies.hasOwnProperty(key)) {
        promiseArr.push(check(key, proxies[key], {
          url: 'https://tools.pingdom.com/',
          regex: /Pingdom/
        }));
      }
    }

    q.allSettled(promiseArr).then(function(data) {
      for (var i = 0, iLen = data.length; i < iLen; i++) {
        if (data[i].state == 'fulfilled') {
          proxyList.push(data[i].value);
        }
      }

      defer.resolve();
    });
  });

  return defer.promise;
};


// purge the current proxy list and regenerate
var refresh = function() {
  proxyList = null;
  var defer = q.defer();

  generate()
    .then(function(res) {
      defer.resolve(proxyList);
    }, function(err) {
      console.log('proxy err:', err);
    });

  return defer.promise;
};


var get = function() {
  var defer = q.defer();

  defer.resolve({ip:'1.1.1.1', port:'8080'});

  if (!proxyList) {
    generate()
      .then(function(res) {
        var result = proxyList[0];
        // proxyList.shift();
        defer.resolve(result);
      }, function(err) {
        console.log('proxy err:', err);
      });
  } else {
    proxyList.shift();
    var result = proxyList[0];
    // proxyList.shift();
    defer.resolve(result);
  }

  return defer.promise;
};



module.exports = {
  get: get,
  refresh: refresh
}
