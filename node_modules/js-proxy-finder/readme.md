JS Proxy Finder
=================

A proxy scraper in Node.js

Installation:
```
$ npm install request
$ npm install js-proxy-finder
```


Usage is as follows:
```
var search = require('js-proxy-finder');

search.getProxies(function (err,proxies) {
    if(err)
    	throw err
   	
   	console.log(proxies)
});

```

Output is in the form of key:value --> IP : Port.
```
{ 
  '202.228.236.230' : '3118',
  '222.82.37.294'   : '80',
  '193.233.102.6'   : '3118',
  '187.217.228.58'  : '80',
  '201.206.56.278'  : '3118',
  '62.55.242.70'    : '8080',
  '224.62.225.9'    : '80',
  ...etc
}
```
Based from: [https://github.com/sdrobs/HMA-Proxy-Scraper](https://github.com/sdrobs/HMA-Proxy-Scraper)
