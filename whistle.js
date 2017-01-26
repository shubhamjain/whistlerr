/**
 * A whistle detector based on the research paper  --
 * "Human Whistle Detection and Frequency Estimation" by M. Nilsson and others.
 *
 * Sadly, the paper itself has been paywalled long since I wrote this code.
 *
 * @author	   Shubham Jain (hi@shubhamjain.co)
 * @license    MIT License
 */

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
			var freqPerBufferIndex = config.freqBinCount / (config.sampleRate);

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

		function addUp(a, b, c) {
			var catArr = b.concat(c);

			for(var i = 0; i < catArr.length ; i++) {
				a[i] += catArr[i];
			}

			return a;
		}

		var timeBuf = new Uint8Array( config.freqBinCount ); //time domain data

		// Successive Mean Quantization transform. Calculate mean and recursively partion
		// the array into two equal halves on basis of that.
		function SMQT( time_arr, currLevel )
		{
			if( currLevel == config.maxLevel + 1)
				return [];

			var U = [], one_set = [], zero_set = [], sum_samples = 0, avg_samples;

			// Step 1: Calculate the mean of all samples
			for( var i = 0; i < time_arr.length; i++ ) {
				sum_samples += time_arr[i];
			}

			avg_samples = sum_samples / time_arr.length;

			// Step 2 : Divide the samples into two set, one
			// above average and other below average.
			for( i = 0; i < time_arr.length; i++ ) {
				if( time_arr[i] >= avg_samples ) {
					U.push( Math.pow(2, config.maxLevel - currLevel) ); // 2 ^ (config.maxLevel - L)
					one_set.push(time_arr[i]);
				} else {
					U.push(0);
					zero_set.push(time_arr[i]);
				}
			}

			return addUp(U, SMQT(one_set, currLevel + 1), SMQT(zero_set, currLevel + 1));
		}

		function normalizeSMQT(arr, smqtLevel) {
			for ( var i = 0; i < arr.length; i++)
				arr[i] = (arr[i] - Math.pow(2, smqtLevel - 1)) / Math.pow(2, smqtLevel - 1);

			return arr;
		}


		/* Implementation of Jensen Difference */
		Hv_ = 5.545177444479573;
		function Hv(arr) {
			var sum = 0;

			for( var i = 0; arr[i] !== undefined; i++)
				sum -= arr[i] * Math.log(arr[i]);

			return sum;
		}

		function HvHv_ ( arr ) {
			var sum = 0;

			for( var i = 0; arr[i] !== undefined; i++) {
				var X = (arr[i] + 2 / config.freqBinCount) / 2;
				sum -= X * Math.log(X);
			}

			return sum;

		}

		function jensenDiff( spectrum ) {
			return HvHv_(spectrum) - (Hv(spectrum) + Hv_) / 2;
		}

		// Variables for keeping track of positive samples per 50 samples.
		var D = 0, T = 0,
			normData, fft, pbp,
			pbs, maxpbp, sumAmplitudes,
			minpbp, ratio, jDiff, i;

		function whistleFinder() {
			analyser.getByteTimeDomainData(timeBuf);
			normData = normalizeSMQT(SMQT(timeBuf, 1), config.maxLevel);

			/* FFT calculation of nomralized data */
			fft = new FFT(config.freqBinCount, config.sampleRate);

			fft.forward(normData);

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
			jDiff = jensenDiff(pbp);

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