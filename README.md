Whistlerr
=========

Whistlerr is a whistle detection program which implements M. Nilsson's research paper - "[Human Whistle Detection and Frequency Estimation][1]".

Although it's accurate, it may fail against significant background noise. [Demo here][2].

Works in node and browsers.


How it works
=============

It works by detecting high energy spikes in the band of 500-5000Hz where most people blow whistles.

On the browser it uses HTML5 WebAudio API, and on node it relies on [mic](https://www.npmjs.com/package/mic) npm module.


Browser usage
===========

You have to include `build/whistle.build.js` and then call `whistlerr` with callback function and threshold value.

`sampleThreshold` is the minimum number of positive samples required to report a whistle.

High `sampleThreshold` may fail to detect low intensity whistles while low `sampleThreshold` may report too many.

```javascript
var config = {
  sampleThreshold: 10
};

whistlerr(function(result) {
	console.log("Whistle detected with data: " + result);
}, config);
```

see `demo/browser/` for a full example.


Node usage
===========
see `demo/node/` for a full example.


[1]: https://www.diva-portal.org/smash/get/diva2:836227/FULLTEXT01.pdf
[2]: http://shubhamjain.github.io/whistlerr/
