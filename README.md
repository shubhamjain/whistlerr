Whistlerr
=========

Whistlerr is a whistle detection program which implements M. Nilsson's research paper - "[Human Whistle Detection and Frequency Estimation][1]".

Although it's accurate, it may fail against significant background noise. [Demo here][2].

Tested in node and Chrome and Safari browser.


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
whistlerr.setConfig({
    sampleThreshold : 8
});

whistlerr.detect(function(){
    console.log("Whistle detected: ", result)
});
```

see `docs/index.html` for a full example.


Node usage
===========
see `node/index` for a full example.


[1]: https://www.diva-portal.org/smash/get/diva2:836227/FULLTEXT01.pdf
[2]: http://shubhamjain.github.io/whistlerr/
