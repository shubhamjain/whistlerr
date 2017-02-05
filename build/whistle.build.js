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
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 9);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * A whistle detector based on the research paper  --
 * "Human Whistle Detection and Frequency Estimation" by M. Nilsson and others.
 *
 * @author	   Shubham Jain (hi@shubhamjain.co)
 * @license    MIT License
 */

var SMQT = __webpack_require__(4),
	  FFT = __webpack_require__(2),
	  dspFilter = __webpack_require__(1),
	  jensenDiff = __webpack_require__(3),
	  raf = __webpack_require__(6);


var defaultConfig = {
	sampleRate : 44100,  // Audio Input sample rate
	maxLevel : 8,        // Maximum level of SMQT
	freqBinCount: 512,   // Size of FFT

	jDiffThreshold : 0.45,   // Jensen Difference Threshold
	whistleBlockThreshold : 25, // Ratio of bandpass and bandstop blocks for 500-5000Hz

	sampleThreshold : 10 // Threshold for postive samples / 50 samples
};


module.exports = function whistlerr(whistleCallback, config) {

	// config argument is optional. set it to an empty object if not present
	if (typeof config === 'undefined' || config === null) {
  	config = {};
	}

	// fill in all omitted config parameters with default values
	config = Object.assign({}, defaultConfig, config)

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
		config.analyser = audioContext.createAnalyser();
		config.analyser.fftSize = config.freqBinCount;

		mediaStreamSource.connect( config.analyser );
		whistleFinder();
	}

	if (!config.analyser) {
		getUserMedia({ audio: true, video: false }, gotStream, function(){
			alert('There was an error accessing audio input. Please check.');
		});
	}

	var timeBuf = new Uint8Array( config.freqBinCount ); //time domain data

	var totalSamples = 0, positiveSamples = 0,
		normData, fft, pbp,
		pbs, maxpbp, sumAmplitudes,
		minpbp, ratio, jDiff, i;

	function whistleFinder() {
		config.analyser.getByteTimeDomainData(timeBuf);

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

		raf(whistleFinder); // cross platform requestAnimationFrame
	}
};


/***/ }),
/* 1 */
/***/ (function(module, exports) {

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

/***/ }),
/* 2 */
/***/ (function(module, exports) {

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



/***/ }),
/* 3 */
/***/ (function(module, exports) {

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

/***/ }),
/* 4 */
/***/ (function(module, exports) {

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

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {// Generated by CoffeeScript 1.7.1
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(8)))

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {var now = __webpack_require__(5)
  , root = typeof window === 'undefined' ? global : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = root['request' + suffix]
  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]

for(var i = 0; !raf && i < vendors.length; i++) {
  raf = root[vendors[i] + 'Request' + suffix]
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(root, fn)
}
module.exports.cancel = function() {
  caf.apply(root, arguments)
}
module.exports.polyfill = function() {
  root.requestAnimationFrame = raf
  root.cancelAnimationFrame = caf
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(7)))

/***/ }),
/* 7 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 8 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

window.whistlerr = __webpack_require__(0);

/***/ })
/******/ ]);