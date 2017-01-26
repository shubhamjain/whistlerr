/**
 * A whistle detector based on the research paper  --
 * "Human Whistle Detection and Frequency Estimation" by M. Nilsson and others.
 *
 * Sadly, the paper itself has been paywalled long since I wrote this code.
 *
 * @author	   Shubham Jain (hi@shubhamjain.co)
 * @license    MIT License
 */

var SMQT = require('./smqt'),
	FFT = require('./lib/fft'),
	jensenDiff = require('./jensenDiff');

function main() {

	var config = {
		sampleRate : 44100,
		maxLevel : 8,
		freqBinCount: 512
	};

	window.whistlerr = function(whistleCallback, threshold) {
		var audioContext = new AudioContext();

		var BAND_PASS = 1, BAND_STOP = 0;

		/* This filter is not accurate since the values outside the band have been attenuated to a fixed value but
			serves a usable approximation. */
		function filter(spectrum, type) {

			/* In a spectrum of 22.05 Khz mapped to a n element
			   array, each element correspond to freqPerBufferIndex frequncied */
			var freqPerBufferIndex = config.freqBinCount / config.sampleRate;

			// Clone the array as an object
			var clone = JSON.parse(JSON.stringify(spectrum));

			for( var i = 0; clone[i] !== undefined; i++ )

				if( (type === BAND_PASS) && (i < freqPerBufferIndex * 500 || i > freqPerBufferIndex * 5000 ) )
					clone[i] = 0.15;
				else if( (type === BAND_STOP) &&  i > freqPerBufferIndex * 500 && i < freqPerBufferIndex * 5000 )
					clone[i] = 0.15;

			return clone;
		}

		function getUserMedia(dictionary, callback, error) {
			try {
				navigator.getUserMedia(dictionary, callback, error);
			} catch (e) {
				alert('getUserMedia threw exception :' + e);
			}
		}

		function gotStream(stream)
		{
			// Create an AudioNode from the stream.
			var mediaStreamSource = audioContext.createMediaStreamSource(stream);

			// Connect it to the destination.
			window.analyser = audioContext.createAnalyser();
			window.analyser.fftSize = config.freqBinCount;

			mediaStreamSource.connect( analyser );
			whistleFinder();
		}

		getUserMedia({audio: true}, gotStream, function(){
			alert("There was an error accessing audio input. Please check.");
		});

		var timeBuf = new Uint8Array( config.freqBinCount ); //time domain data

		// Variables for keeping track of positive samples per 50 samples.
		var D = 0, T = 0,
			normData, fft, pbp,
			pbs, maxpbp, sumAmplitudes,
			minpbp, ratio, jDiff, i;

		function whistleFinder() {
			analyser.getByteTimeDomainData(timeBuf);
			SMQT.init(timeBuf, config.maxLevel).calculate();

			/* FFT calculation of nomralized data */
			fft = new FFT(config.freqBinCount, config.sampleRate);

			fft.forward(SMQT.normalize());

			pbp = filter(fft.spectrum, BAND_PASS);
			pbs = filter(fft.spectrum, BAND_STOP);

			/* Calculating mean(pbs) max(pbp) */
			maxpbp = 0; sumAmplitudes = 0; minpbp = 100;

			for(i = 0; i < config.freqBinCount / 2; i++) {
				if( (pbp[i]) > maxpbp)
					maxpbp = pbp[i];

				if( pbp[i] < minpbp)
					minpbp = pbp[i];

				sumAmplitudes += Math.abs(pbs[i]);
			}

			meanpbs = sumAmplitudes / (i - 1);

			/* Forming data for Jensen Difference */
			sumAmplitudes = 0;
			for( i = 0; i < config.freqBinCount / 2; i++) {
				pbp[i] = (pbp[i] - minpbp)  + 2/config.freqBinCount;
				sumAmplitudes += pbp[i];
			}

			for( i = 0; i < config.freqBinCount / 2; i++)
				pbp[i] /= sumAmplitudes;

			ratio = maxpbp / (meanpbs + 1);
			jDiff = jensenDiff(pbp, config.freqBinCount);

			if( ratio > 25 && jDiff > 0.45 && ++T > threshold) {
				whistleCallback({
					ratio: ratio,
					jDiff: jDiff
				});
			}

			if ( D === 50 ) {
				D = 0;
				T = 0;
			} else {
				D += 1;
			}

			window.requestAnimationFrame(whistleFinder);
		}
	};
}

main();