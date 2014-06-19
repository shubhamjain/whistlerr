Whistlerr
=========

Whistlerr is a whistle detection program which uses HTML5 WebAudio API. It implements M. Nilsson's research paper titled, "[Human Whistle Detection and Frequency Estimation][1]". Although, quite accurate it may fail to work against lot of background noise. [Demo here][2].

How it works?
=============

The basic idea is to detect the high energy spikes in the band of 500-5000Hz where most people blow whistles. The program may confuse people for it uses a lot of complex constructs, so it advised to read my blog pot explaining the same. 

How to use?
===========

You have to include `lib/fft.js` and `whistle.js` and then call `whistlerr` with callback function and threshold value. Threshold is the minimum number of positive samples required to report a whistle. High threshold may fail to detect low intensity whistles while low threshold may report too many.

```javascript
whistlerr(function(result){
	console.log("Whistle detected with data: " + result);
}, 10);
```

[1]: http://medieteknik.bth.se/fou/forskinfo.nsf/all/67a079f0676c546fc12574a4002d6d38/$file/nilsson-whistle.pdf
[2]: http://shubhamjain.github.io/whistlerr/
