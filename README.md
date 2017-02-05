Whistlerr
=========

Whistlerr is a whistle detection program which implements M. Nilsson's research paper - "[Human Whistle Detection and Frequency Estimation][1]".

Sadly, the research paper has been paywalled since I wrote this code (but you're free to make use of site made by Kazakh researcher). 

Although it's accurate, it may fail against significant background noise. [Demo here][2].


How it works
=============

The basic idea is to detect the high energy spikes in the band of 500-5000Hz where most people blow whistles.

It uses the HTML5 WebAudio API. 


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



[1]: https://www.diva-portal.org/smash/get/diva2:836227/FULLTEXT01.pdf
[2]: http://shubhamjain.github.io/whistlerr/
