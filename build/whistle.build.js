/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	window.whistlerr = __webpack_require__(1);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * A whistle detector based on the research paper  --
	 * "Human Whistle Detection and Frequency Estimation" by M. Nilsson and others.
	 *
	 * Sadly, the paper itself has been paywalled long since I wrote this code.
	 *
	 * @author	   Shubham Jain (hi@shubhamjain.co)
	 * @license    MIT License
	 */

	var SMQT = __webpack_require__(2),
		FFT = __webpack_require__(3),
		dspFilter = __webpack_require__(4),
		jensenDiff = __webpack_require__(5);

	var extend = __webpack_require__(6);

	var analyser;

	var config = {
		sampleRate : 44100,  // Audio Input sample rate
		maxLevel : 8,        // Maximum level of SMQT
		freqBinCount: 512,   // Size of FFT

		jDiffThreshold : 0.45,   // Jensen Difference Threshold
		whistleBlockThreshold : 25, // Ratio of bandpass and bandstop blocks for 500-5000Hz

		sampleThreshold : 10 // Threshold for postive samples / 50 samples

	};

	var setConfig = function( initConfig ){
		config = extend(config, initConfig );
	};

	var whistlerr = function(whistleCallback) {
		var audioContext = new AudioContext();

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
			analyser = audioContext.createAnalyser();
			analyser.fftSize = config.freqBinCount;

			mediaStreamSource.connect( analyser );
			whistleFinder();
		}

		getUserMedia({audio: true}, gotStream, function(){
			alert("There was an error accessing audio input. Please check.");
		});

		var timeBuf = new Uint8Array( config.freqBinCount ); //time domain data

		var totalSamples = 0, positiveSamples = 0,
			normData, fft, pbp,
			pbs, maxpbp, sumAmplitudes,
			minpbp, ratio, jDiff, i;

		function whistleFinder() {
			analyser.getByteTimeDomainData(timeBuf);

			SMQT.init(timeBuf, config.maxLevel).calculate();

			// FFT calculation of nomralized data
			fft = new FFT(config.freqBinCount, config.sampleRate);

			fft.forward(SMQT.normalize());

			pbp = dspFilter.bandpass( fft.spectrum, {
				sampleRate : config.sampleRate,
				fLower : 500,
				fUpper : 5000
			});

			pbs = dspFilter.bandstop( fft.spectrum, {
				sampleRate : config.sampleRate,
				fLower : 500,
				fUpper : 5000
			});

			// Calculating mean(pbs) max(pbp)
			maxpbp = 0; sumAmplitudes = 0; minpbp = 100;

			for(i = 0; i < config.freqBinCount / 2; i++) {

				// Since it's a TypedArray, we can't use _Math._ operations
				if( pbp[i] > maxpbp)
					maxpbp = pbp[i];

				if( pbp[i] < minpbp)
					minpbp = pbp[i];

				sumAmplitudes += Math.abs(pbs[i]);
			}

			meanpbs = sumAmplitudes / (i - 1);

			// Forming data for Jensen Difference
			sumAmplitudes = 0;
			for( i = 0; i < config.freqBinCount / 2; i++) {
				pbp[i] = (pbp[i] - minpbp) + 2 / config.freqBinCount;
				sumAmplitudes += pbp[i];
			}

			for( i = 0; i < config.freqBinCount / 2; i++)
				pbp[i] /= sumAmplitudes;

			ratio = maxpbp / (meanpbs + 1);
			jDiff = jensenDiff(pbp, config.freqBinCount);

			if( ratio > config.whistleBlockThreshold && jDiff > config.jDiffThreshold) {
			 	positiveSamples++;

			 	if( positiveSamples > config.sampleThreshold ) {
					whistleCallback({
						ratio: ratio,
						jDiff: jDiff
					});
			 	}
			}

			if ( totalSamples === 50 ) {
				totalSamples = 0;
				positiveSamples = 0;
			} else {
				totalSamples += 1;
			}

			window.requestAnimationFrame(whistleFinder);
		}
	};


	module.exports = {
		setConfig : setConfig,
		detect : whistlerr
	};

/***/ },
/* 2 */
/***/ function(module, exports) {

	// Successive Mean Quantization transform is used to remove gain / bias
	// form the signal data. Here's an execellent explaination of the
	// algorithim : https://www.toptal.com/algorithms/successive-mean-quantization-transform
	//
	// To quote the research paper —
	// 'It reduces or removes the effect of different microphones, different dynamic range,
	// bias shift and gain shift'.

	var SMQT = {
		timeArr : [],
		smqtArr : [],

		maxLevel : 0,

		init : function( timeArr, maxLevel){
			this.timeArr = timeArr;
			this.maxLevel = maxLevel;

			return this;
		},

		calculate : function(){
			this.smqtArr = this.SMQT( this.timeArr, 1);

			return this;
		},

		addUp : function(a, b, c) {
			var catArr = b.concat(c);

			for(var i = 0; i < catArr.length ; i++) {
				a[i] += catArr[i];
			}

			return a;
		},

		SMQT : function( time_arr, currLevel )
		{
			if( currLevel === this.maxLevel + 1)
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
					U.push( 1 * Math.pow(2, this.maxLevel - currLevel) ); // conversion from binary "1" to its integer form
					one_set.push(time_arr[i]);
				} else {
					U.push(0);
					zero_set.push(time_arr[i]);
				}
			}

			return this.addUp(U, this.SMQT(one_set, currLevel + 1), this.SMQT(zero_set, currLevel + 1));
		},

		// The result of SMQT is in the range of [0, 255]
		// normalization makes it in the range [-1, 1]
		normalize : function(){
			for ( var i = 0; i < this.smqtArr.length; i++)
				this.smqtArr[i] = (this.smqtArr[i] - Math.pow(2, this.maxLevel - 1)) / Math.pow(2, this.maxLevel - 1);

			return this.smqtArr;
		}

	};

	module.exports = SMQT;

/***/ },
/* 3 */
/***/ function(module, exports) {

	/*
	 *  Trimmed down version of DSP.js to calculate FFT.
	 *
	 *  Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
	 *  Copyright 2010 Corban Brook. All rights reserved.
	 *
	 */

	// Setup arrays for platforms which do not support byte arrays
	function setupTypedArray(name, fallback) {
	  // check if TypedArray exists
	  // typeof on Minefield and Chrome return function, typeof on Webkit returns object.
	  if (typeof this[name] !== "function" && typeof this[name] !== "object") {
	    // nope.. check if WebGLArray exists
	    if (typeof this[fallback] === "function" && typeof this[fallback] !== "object") {
	      this[name] = this[fallback];
	    } else {
	      // nope.. set as Native JS array
	      this[name] = function(obj) {
	        if (obj instanceof Array) {
	          return obj;
	        } else if (typeof obj === "number") {
	          return new Array(obj);
	        }
	      };
	    }
	  }
	}

	setupTypedArray("Float32Array", "WebGLFloatArray");
	setupTypedArray("Int32Array",   "WebGLIntArray");
	setupTypedArray("Uint16Array",  "WebGLUnsignedShortArray");
	setupTypedArray("Uint8Array",   "WebGLUnsignedByteArray");



	// Fourier Transform Module used by DFT, FFT, RFFT
	function FourierTransform(bufferSize, sampleRate) {
	  this.bufferSize = bufferSize;
	  this.sampleRate = sampleRate;
	  this.bandwidth  = 2 / bufferSize * sampleRate / 2;

	  this.spectrum   = new Float32Array(bufferSize/2);
	  this.real       = new Float32Array(bufferSize);
	  this.imag       = new Float32Array(bufferSize);

	  this.peakBand   = 0;
	  this.peak       = 0;

	  /**
	   * Calculates the *middle* frequency of an FFT band.
	   *
	   * @param {Number} index The index of the FFT band.
	   *
	   * @returns The middle frequency in Hz.
	   */
	  this.getBandFrequency = function(index) {
	    return this.bandwidth * index + this.bandwidth / 2;
	  };

	  this.calculateSpectrum = function() {
	    var spectrum  = this.spectrum,
	        real      = this.real,
	        imag      = this.imag,
	        bSi       = 2 / this.bufferSize,
	        sqrt      = Math.sqrt,
	        rval,
	        ival,
	        mag;

	    for (var i = 0, N = bufferSize/2; i < N; i++) {
	      rval = real[i];
	      ival = imag[i];
	      mag = sqrt(rval * rval + ival * ival);

	      if (mag > this.peak) {
	        this.peakBand = i;
	        this.peak = mag;
	      }

	      spectrum[i] = mag;
	    }
	  };
	}



	/**
	 * FFT is a class for calculating the Discrete Fourier Transform of a signal
	 * with the Fast Fourier Transform algorithm.
	 *
	 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
	 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
	 *
	 * @constructor
	 */
	function FFT(bufferSize, sampleRate) {
	  FourierTransform.call(this, bufferSize, sampleRate);

	  this.reverseTable = new Uint32Array(bufferSize);

	  var limit = 1;
	  var bit = bufferSize >> 1;

	  var i;

	  while (limit < bufferSize) {
	    for (i = 0; i < limit; i++) {
	      this.reverseTable[i + limit] = this.reverseTable[i] + bit;
	    }

	    limit = limit << 1;
	    bit = bit >> 1;
	  }

	  this.sinTable = new Float32Array(bufferSize);
	  this.cosTable = new Float32Array(bufferSize);

	  for (i = 0; i < bufferSize; i++) {
	    this.sinTable[i] = Math.sin(-Math.PI/i);
	    this.cosTable[i] = Math.cos(-Math.PI/i);
	  }
	}

	/**
	 * Performs a forward transform on the sample buffer.
	 * Converts a time domain signal to frequency domain spectra.
	 *
	 * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
	 *
	 * @returns The frequency spectrum array
	 */
	FFT.prototype.forward = function(buffer) {
	  // Locally scope variables for speed up
	  var bufferSize      = this.bufferSize,
	      cosTable        = this.cosTable,
	      sinTable        = this.sinTable,
	      reverseTable    = this.reverseTable,
	      real            = this.real,
	      imag            = this.imag,
	      spectrum        = this.spectrum;

	  var k = Math.floor(Math.log(bufferSize) / Math.LN2);

	  if (Math.pow(2, k) !== bufferSize) { throw "Invalid buffer size, must be a power of 2."; }
	  if (bufferSize !== buffer.length)  {
	    throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length;
	  }

	  var halfSize = 1,
	      phaseShiftStepReal,
	      phaseShiftStepImag,
	      currentPhaseShiftReal,
	      currentPhaseShiftImag,
	      off,
	      tr,
	      ti,
	      tmpReal,
	      i;

	  for (i = 0; i < bufferSize; i++) {
	    real[i] = buffer[reverseTable[i]];
	    imag[i] = 0;
	  }

	  while (halfSize < bufferSize) {
	    //phaseShiftStepReal = Math.cos(-Math.PI/halfSize);
	    //phaseShiftStepImag = Math.sin(-Math.PI/halfSize);
	    phaseShiftStepReal = cosTable[halfSize];
	    phaseShiftStepImag = sinTable[halfSize];

	    currentPhaseShiftReal = 1;
	    currentPhaseShiftImag = 0;

	    for (var fftStep = 0; fftStep < halfSize; fftStep++) {
	      i = fftStep;

	      while (i < bufferSize) {
	        off = i + halfSize;
	        tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
	        ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

	        real[off] = real[i] - tr;
	        imag[off] = imag[i] - ti;
	        real[i] += tr;
	        imag[i] += ti;

	        i += halfSize << 1;
	      }

	      tmpReal = currentPhaseShiftReal;
	      currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
	      currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
	    }

	    halfSize = halfSize << 1;
	  }

	  return this.calculateSpectrum();
	};

	module.exports = FFT;



/***/ },
/* 4 */
/***/ function(module, exports) {

	function bandPassFilter(spectrum, config){
		var spectrumClone = spectrum.slice(); // spectrumClone the Array

		var freqPerSpectrumElement = config.sampleRate / (spectrumClone.length * 2);

		for( var i = 0; spectrumClone[i] !== undefined; i++ ) {
			if( i * freqPerSpectrumElement < config.fLower || i * freqPerSpectrumElement > config.fUpper )
				spectrumClone[i] = 0.15;
		}

		return spectrumClone;
	}

	function bandStopFilter(spectrum, config){
		var spectrumClone = spectrum.slice(); // spectrumClone the Array

		var freqPerSpectrumElement = config.sampleRate / (spectrumClone.length * 2);

		for( var i = 0; spectrumClone[i] !== undefined; i++ ) {

			if( i * freqPerSpectrumElement > config.fLower && i * freqPerSpectrumElement < config.fUpper )
				spectrumClone[i] = 0.15;
		}

		return spectrumClone;
	}

	module.exports = {
		bandpass: bandPassFilter,
		bandstop: bandStopFilter
	};

/***/ },
/* 5 */
/***/ function(module, exports) {

	// Implemnetation of Jensen difference.

	var Hv_ = 5.545177444479573;

	function Hv(arr) {
		var sum = 0;

		for( var i = 0; arr[i] !== undefined; i++)
			sum -= arr[i] * Math.log(arr[i]);

		return sum;
	}

	function HvHv_ ( arr, freqBinCount ) {
		var sum = 0;

		for( var i = 0; arr[i] !== undefined; i++) {
			var X = (arr[i] + 2 / freqBinCount) / 2;
			sum -= X * Math.log(X);
		}

		return sum;

	}

	function jensenDiff( spectrum, freqBinCount ) {
		return HvHv_(spectrum, freqBinCount) - (Hv(spectrum) + Hv_) / 2;
	}

	module.exports = jensenDiff;

/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';

	var hasOwn = Object.prototype.hasOwnProperty;
	var toStr = Object.prototype.toString;

	var isArray = function isArray(arr) {
		if (typeof Array.isArray === 'function') {
			return Array.isArray(arr);
		}

		return toStr.call(arr) === '[object Array]';
	};

	var isPlainObject = function isPlainObject(obj) {
		if (!obj || toStr.call(obj) !== '[object Object]') {
			return false;
		}

		var hasOwnConstructor = hasOwn.call(obj, 'constructor');
		var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
		// Not own constructor property must be Object
		if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.
		var key;
		for (key in obj) {/**/}

		return typeof key === 'undefined' || hasOwn.call(obj, key);
	};

	module.exports = function extend() {
		var options, name, src, copy, copyIsArray, clone,
			target = arguments[0],
			i = 1,
			length = arguments.length,
			deep = false;

		// Handle a deep copy situation
		if (typeof target === 'boolean') {
			deep = target;
			target = arguments[1] || {};
			// skip the boolean and the target
			i = 2;
		} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
			target = {};
		}

		for (; i < length; ++i) {
			options = arguments[i];
			// Only deal with non-null/undefined values
			if (options != null) {
				// Extend the base object
				for (name in options) {
					src = target[name];
					copy = options[name];

					// Prevent never-ending loop
					if (target !== copy) {
						// Recurse if we're merging plain objects or arrays
						if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
							if (copyIsArray) {
								copyIsArray = false;
								clone = src && isArray(src) ? src : [];
							} else {
								clone = src && isPlainObject(src) ? src : {};
							}

							// Never move original objects, clone them
							target[name] = extend(deep, clone, copy);

						// Don't bring in undefined values
						} else if (typeof copy !== 'undefined') {
							target[name] = copy;
						}
					}
				}
			}
		}

		// Return the modified object
		return target;
	};



/***/ }
/******/ ]);