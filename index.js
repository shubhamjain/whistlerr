/**
 * A whistle detector based on the research paper  --
 * "Human Whistle Detection and Frequency Estimation" by M. Nilsson and others.
 *
 * @author	   Shubham Jain (hi@shubhamjain.co)
 * @license    MIT License
 */

var SMQT = require('./lib/smqt'),
	FFT = require('./lib/fft'),
	dspFilter = require('./lib/dspFilter'),
	jensenDiff = require('./lib/jensenDiff');

var raf = require('raf')

var config = {
	sampleRate: 44100,  // Audio Input sample rate
	maxLevel: 8,        // Maximum level of SMQT
	freqBinCount: 512,   // Size of FFT

	jDiffThreshold: 0.45,   // Jensen Difference Threshold
	whistleBlockThreshold: 25, // Ratio of bandpass and bandstop blocks for 500-5000Hz

	sampleThreshold: 10 // Threshold for postive samples / 50 samples

};

var setConfig = function (initConfig = {}) {
	config = {...config, ...initConfig};
};

var totalSamples = 0, positiveSamples = 0,
normData, fft, pbp,
pbs, maxpbp, sumAmplitudes,
minpbp, ratio, jDiff, i;

var timeBuf = new Uint8Array(config.freqBinCount); //time domain data

function whistleFinder(analyser, whistleCallback) {
	analyser.getByteTimeDomainData(timeBuf);

	SMQT.init(timeBuf, config.maxLevel).calculate();

	// FFT calculation of nomralized data
	fft = new FFT(config.freqBinCount, config.sampleRate);

	fft.forward(SMQT.normalize());

	pbp = dspFilter.bandpass(fft.spectrum, {
		sampleRate: config.sampleRate,
		fLower: 500,
		fUpper: 5000
	});

	pbs = dspFilter.bandstop(fft.spectrum, {
		sampleRate: config.sampleRate,
		fLower: 500,
		fUpper: 5000
	});

	// Calculating mean(pbs) max(pbp)
	maxpbp = 0; sumAmplitudes = 0; minpbp = 100;

	for (i = 0; i < config.freqBinCount / 2; i++) {

		// Since it's a TypedArray, we can't use _Math._ operations
		if (pbp[i] > maxpbp)
			maxpbp = pbp[i];

		if (pbp[i] < minpbp)
			minpbp = pbp[i];

		sumAmplitudes += Math.abs(pbs[i]);
	}

	meanpbs = sumAmplitudes / (i - 1);

	// Forming data for Jensen Difference
	sumAmplitudes = 0;
	for (i = 0; i < config.freqBinCount / 2; i++) {
		pbp[i] = (pbp[i] - minpbp) + 2 / config.freqBinCount;
		sumAmplitudes += pbp[i];
	}

	for (i = 0; i < config.freqBinCount / 2; i++)
		pbp[i] /= sumAmplitudes;

	ratio = maxpbp / (meanpbs + 1);
	jDiff = jensenDiff(pbp, config.freqBinCount);

	if (ratio > config.whistleBlockThreshold && jDiff > config.jDiffThreshold) {
		positiveSamples++;

		if (positiveSamples > config.sampleThreshold) {
			whistleCallback({
				ratio: ratio,
				jDiff: jDiff
			});
		}
	}

	if (totalSamples === 50) {
		totalSamples = 0;
		positiveSamples = 0;
	} else {
		totalSamples += 1;
	}

	raf(whistleFinder.bind(this, analyser, whistleCallback));
}

var whistlerr = function (whistleCallback) {
	var audioContext = new AudioContext();

	navigator.getUserMedia = (navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia);

	function getUserMedia(dictionary, callback, error) {
		try {
			if (!navigator.getUserMedia) {
				navigator.mediaDevices.getUserMedia(dictionary).then(callback).catch(error);
			} else {
				navigator.getUserMedia(dictionary, callback, error);
			}
		} catch (e) {
			alert('getUserMedia threw exception :' + e);
		}
	}

	function gotStream(stream) {
		// Create an AudioNode from the stream.
		var mediaStreamSource = audioContext.createMediaStreamSource(stream);
		// Connect it to the destination.
		var analyser = audioContext.createAnalyser();
		analyser.fftSize = config.freqBinCount;

		mediaStreamSource.connect(analyser);
		whistleFinder(analyser, whistleCallback);
	}

	getUserMedia({ audio: true }, gotStream, function () {
		alert("There was an error accessing audio input. Please check.");
	});
};


module.exports = {
	setConfig,
	detect: whistlerr,
	whistleFinder
};