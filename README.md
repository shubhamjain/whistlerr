Whistlerr
=========

Whistlerr is a experimental whistle detection project using HTML5 WebAudio API. It is'nt perfect and may report false positives or fail to detect whistle against heavy noise but all in all it "works" fine for the most part. [Demo here][2].

How it works?
=============

It analyses the frequence domain data of input audio and seaches for sharp spikes in the range of 600-5000Hz. Most people blow whistles [in this band][1]. Since whistle spike is only created for certain short period of time, it neglects samples which have too many peaks. 

[1]: http://medieteknik.bth.se/fou/forskinfo.nsf/all/67a079f0676c546fc12574a4002d6d38/$file/nilsson-whistle.pdf
[2]: http://shubhamjain.github.io/whistlerr/
