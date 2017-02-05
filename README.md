Whistlerr
=========

Whistlerr is a whistle detection program which uses HTML5 WebAudio API which implements M. Nilsson's research paper - "[Human Whistle Detection and Frequency Estimation][1]". Sadly, the research paper has been paywalled since I wrote this code (but you're free to make use of site made by Kazakh researcher). Although it's accurate, it may fail against significant background noise. [Demo here][2].

How it works?
=============

The basic idea is to detect the high energy spikes in the band of 500-5000Hz where most people blow whistles.

How to use?
===========

You have to include `lib/fft.js` and `whistle.js` and then call `whistlerr` with callback function and threshold value. Threshold is the minimum number of positive samples required to report a whistle. High threshold may fail to detect low intensity whistles while low threshold may report too many.

```javascript
whistlerr(function(result){
	console.log("Whistle detected with data: " + result);
}, 10);
```

[1]: https://www.diva-portal.org/smash/get/diva2:836227/FULLTEXT01.pdf
[2]: http://shubhamjain.github.io/whistlerr/
