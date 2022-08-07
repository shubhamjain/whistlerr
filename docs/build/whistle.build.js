/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./demo.js":
/*!*****************!*\
  !*** ./demo.js ***!
  \*****************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

eval("window.whistlerr = __webpack_require__(/*! ./ */ \"./index.js\");\n\n//# sourceURL=webpack://whistlerr/./demo.js?");

/***/ }),

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("/**\r\n * A whistle detector based on the research paper  --\r\n * \"Human Whistle Detection and Frequency Estimation\" by M. Nilsson and others.\r\n *\r\n * @author\t   Shubham Jain (hi@shubhamjain.co)\r\n * @license    MIT License\r\n */\r\n\r\nvar SMQT = __webpack_require__(/*! ./lib/smqt */ \"./lib/smqt.js\"),\r\n\tFFT = __webpack_require__(/*! ./lib/fft */ \"./lib/fft.js\"),\r\n\tdspFilter = __webpack_require__(/*! ./lib/dspFilter */ \"./lib/dspFilter.js\"),\r\n\tjensenDiff = __webpack_require__(/*! ./lib/jensenDiff */ \"./lib/jensenDiff.js\");\r\n\r\nvar raf = __webpack_require__(/*! raf */ \"./node_modules/raf/index.js\")\r\n\r\nvar config = {\r\n\tsampleRate: 44100,  // Audio Input sample rate\r\n\tmaxLevel: 8,        // Maximum level of SMQT\r\n\tfreqBinCount: 512,   // Size of FFT\r\n\r\n\tjDiffThreshold: 0.45,   // Jensen Difference Threshold\r\n\twhistleBlockThreshold: 25, // Ratio of bandpass and bandstop blocks for 500-5000Hz\r\n\r\n\tsampleThreshold: 10 // Threshold for postive samples / 50 samples\r\n\r\n};\r\n\r\nvar setConfig = function (initConfig = {}) {\r\n\tconfig = {...config, ...initConfig};\r\n};\r\n\r\nvar totalSamples = 0, positiveSamples = 0,\r\nnormData, fft, pbp,\r\npbs, maxpbp, sumAmplitudes,\r\nminpbp, ratio, jDiff, i;\r\n\r\nvar timeBuf = new Uint8Array(config.freqBinCount); //time domain data\r\n\r\nfunction whistleFinder(analyser, whistleCallback) {\r\n\tanalyser.getByteTimeDomainData(timeBuf);\r\n\r\n\tSMQT.init(timeBuf, config.maxLevel).calculate();\r\n\r\n\t// FFT calculation of nomralized data\r\n\tfft = new FFT(config.freqBinCount, config.sampleRate);\r\n\r\n\tfft.forward(SMQT.normalize());\r\n\r\n\tpbp = dspFilter.bandpass(fft.spectrum, {\r\n\t\tsampleRate: config.sampleRate,\r\n\t\tfLower: 500,\r\n\t\tfUpper: 5000\r\n\t});\r\n\r\n\tpbs = dspFilter.bandstop(fft.spectrum, {\r\n\t\tsampleRate: config.sampleRate,\r\n\t\tfLower: 500,\r\n\t\tfUpper: 5000\r\n\t});\r\n\r\n\t// Calculating mean(pbs) max(pbp)\r\n\tmaxpbp = 0; sumAmplitudes = 0; minpbp = 100;\r\n\r\n\tfor (i = 0; i < config.freqBinCount / 2; i++) {\r\n\r\n\t\t// Since it's a TypedArray, we can't use _Math._ operations\r\n\t\tif (pbp[i] > maxpbp)\r\n\t\t\tmaxpbp = pbp[i];\r\n\r\n\t\tif (pbp[i] < minpbp)\r\n\t\t\tminpbp = pbp[i];\r\n\r\n\t\tsumAmplitudes += Math.abs(pbs[i]);\r\n\t}\r\n\r\n\tmeanpbs = sumAmplitudes / (i - 1);\r\n\r\n\t// Forming data for Jensen Difference\r\n\tsumAmplitudes = 0;\r\n\tfor (i = 0; i < config.freqBinCount / 2; i++) {\r\n\t\tpbp[i] = (pbp[i] - minpbp) + 2 / config.freqBinCount;\r\n\t\tsumAmplitudes += pbp[i];\r\n\t}\r\n\r\n\tfor (i = 0; i < config.freqBinCount / 2; i++)\r\n\t\tpbp[i] /= sumAmplitudes;\r\n\r\n\tratio = maxpbp / (meanpbs + 1);\r\n\tjDiff = jensenDiff(pbp, config.freqBinCount);\r\n\r\n\tif (ratio > config.whistleBlockThreshold && jDiff > config.jDiffThreshold) {\r\n\t\tpositiveSamples++;\r\n\r\n\t\tif (positiveSamples > config.sampleThreshold) {\r\n\t\t\twhistleCallback({\r\n\t\t\t\tratio: ratio,\r\n\t\t\t\tjDiff: jDiff\r\n\t\t\t});\r\n\t\t}\r\n\t}\r\n\r\n\tif (totalSamples === 50) {\r\n\t\ttotalSamples = 0;\r\n\t\tpositiveSamples = 0;\r\n\t} else {\r\n\t\ttotalSamples += 1;\r\n\t}\r\n\r\n\traf(whistleFinder.bind(this, analyser, whistleCallback));\r\n}\r\n\r\nvar whistlerr = function (whistleCallback) {\r\n\tvar audioContext = new AudioContext();\r\n\r\n\tnavigator.getUserMedia = (navigator.getUserMedia ||\r\n\t\tnavigator.webkitGetUserMedia ||\r\n\t\tnavigator.mozGetUserMedia ||\r\n\t\tnavigator.msGetUserMedia);\r\n\r\n\tfunction getUserMedia(dictionary, callback, error) {\r\n\t\ttry {\r\n\t\t\tif (!navigator.getUserMedia) {\r\n\t\t\t\tnavigator.mediaDevices.getUserMedia(dictionary).then(callback).catch(error);\r\n\t\t\t} else {\r\n\t\t\t\tnavigator.getUserMedia(dictionary, callback, error);\r\n\t\t\t}\r\n\t\t} catch (e) {\r\n\t\t\talert('getUserMedia threw exception :' + e);\r\n\t\t}\r\n\t}\r\n\r\n\tfunction gotStream(stream) {\r\n\t\t// Create an AudioNode from the stream.\r\n\t\tvar mediaStreamSource = audioContext.createMediaStreamSource(stream);\r\n\t\t// Connect it to the destination.\r\n\t\tvar analyser = audioContext.createAnalyser();\r\n\t\tanalyser.fftSize = config.freqBinCount;\r\n\r\n\t\tmediaStreamSource.connect(analyser);\r\n\t\twhistleFinder(analyser, whistleCallback);\r\n\t}\r\n\r\n\tgetUserMedia({ audio: true }, gotStream, function () {\r\n\t\talert(\"There was an error accessing audio input. Please check.\");\r\n\t});\r\n};\r\n\r\n\r\nmodule.exports = {\r\n\tsetConfig,\r\n\tdetect: whistlerr,\r\n\twhistleFinder\r\n};\n\n//# sourceURL=webpack://whistlerr/./index.js?");

/***/ }),

/***/ "./lib/dspFilter.js":
/*!**************************!*\
  !*** ./lib/dspFilter.js ***!
  \**************************/
/***/ ((module) => {

eval("function bandPassFilter(spectrum, config){\n\tvar spectrumClone = spectrum.slice(); // spectrumClone the Array\n\n\tvar freqPerSpectrumElement = config.sampleRate / (spectrumClone.length * 2);\n\n\tfor( var i = 0; spectrumClone[i] !== undefined; i++ ) {\n\t\tif( i * freqPerSpectrumElement < config.fLower || i * freqPerSpectrumElement > config.fUpper )\n\t\t\tspectrumClone[i] = 0.15;\n\t}\n\n\treturn spectrumClone;\n}\n\nfunction bandStopFilter(spectrum, config){\n\tvar spectrumClone = spectrum.slice(); // spectrumClone the Array\n\n\tvar freqPerSpectrumElement = config.sampleRate / (spectrumClone.length * 2);\n\n\tfor( var i = 0; spectrumClone[i] !== undefined; i++ ) {\n\n\t\tif( i * freqPerSpectrumElement > config.fLower && i * freqPerSpectrumElement < config.fUpper )\n\t\t\tspectrumClone[i] = 0.15;\n\t}\n\n\treturn spectrumClone;\n}\n\nmodule.exports = {\n\tbandpass: bandPassFilter,\n\tbandstop: bandStopFilter\n};\n\n//# sourceURL=webpack://whistlerr/./lib/dspFilter.js?");

/***/ }),

/***/ "./lib/fft.js":
/*!********************!*\
  !*** ./lib/fft.js ***!
  \********************/
/***/ ((module) => {

eval("/*\n *  Trimmed down version of DSP.js to calculate FFT.\n *\n *  Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.\n *  Copyright 2010 Corban Brook. All rights reserved.\n *\n */\n\n// Setup arrays for platforms which do not support byte arrays\nfunction setupTypedArray(name, fallback) {\n  // check if TypedArray exists\n  // typeof on Minefield and Chrome return function, typeof on Webkit returns object.\n  if (typeof this[name] !== \"function\" && typeof this[name] !== \"object\") {\n    // nope.. check if WebGLArray exists\n    if (typeof this[fallback] === \"function\" && typeof this[fallback] !== \"object\") {\n      this[name] = this[fallback];\n    } else {\n      // nope.. set as Native JS array\n      this[name] = function(obj) {\n        if (obj instanceof Array) {\n          return obj;\n        } else if (typeof obj === \"number\") {\n          return new Array(obj);\n        }\n      };\n    }\n  }\n}\n\nsetupTypedArray(\"Float32Array\", \"WebGLFloatArray\");\nsetupTypedArray(\"Int32Array\",   \"WebGLIntArray\");\nsetupTypedArray(\"Uint16Array\",  \"WebGLUnsignedShortArray\");\nsetupTypedArray(\"Uint8Array\",   \"WebGLUnsignedByteArray\");\n\n\n\n// Fourier Transform Module used by DFT, FFT, RFFT\nfunction FourierTransform(bufferSize, sampleRate) {\n  this.bufferSize = bufferSize;\n  this.sampleRate = sampleRate;\n  this.bandwidth  = 2 / bufferSize * sampleRate / 2;\n\n  this.spectrum   = new Float32Array(bufferSize/2);\n  this.real       = new Float32Array(bufferSize);\n  this.imag       = new Float32Array(bufferSize);\n\n  this.peakBand   = 0;\n  this.peak       = 0;\n\n  /**\n   * Calculates the *middle* frequency of an FFT band.\n   *\n   * @param {Number} index The index of the FFT band.\n   *\n   * @returns The middle frequency in Hz.\n   */\n  this.getBandFrequency = function(index) {\n    return this.bandwidth * index + this.bandwidth / 2;\n  };\n\n  this.calculateSpectrum = function() {\n    var spectrum  = this.spectrum,\n        real      = this.real,\n        imag      = this.imag,\n        bSi       = 2 / this.bufferSize,\n        sqrt      = Math.sqrt,\n        rval,\n        ival,\n        mag;\n\n    for (var i = 0, N = bufferSize/2; i < N; i++) {\n      rval = real[i];\n      ival = imag[i];\n      mag = sqrt(rval * rval + ival * ival);\n\n      if (mag > this.peak) {\n        this.peakBand = i;\n        this.peak = mag;\n      }\n\n      spectrum[i] = mag;\n    }\n  };\n}\n\n\n\n/**\n * FFT is a class for calculating the Discrete Fourier Transform of a signal\n * with the Fast Fourier Transform algorithm.\n *\n * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2\n * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)\n *\n * @constructor\n */\nfunction FFT(bufferSize, sampleRate) {\n  FourierTransform.call(this, bufferSize, sampleRate);\n\n  this.reverseTable = new Uint32Array(bufferSize);\n\n  var limit = 1;\n  var bit = bufferSize >> 1;\n\n  var i;\n\n  while (limit < bufferSize) {\n    for (i = 0; i < limit; i++) {\n      this.reverseTable[i + limit] = this.reverseTable[i] + bit;\n    }\n\n    limit = limit << 1;\n    bit = bit >> 1;\n  }\n\n  this.sinTable = new Float32Array(bufferSize);\n  this.cosTable = new Float32Array(bufferSize);\n\n  for (i = 0; i < bufferSize; i++) {\n    this.sinTable[i] = Math.sin(-Math.PI/i);\n    this.cosTable[i] = Math.cos(-Math.PI/i);\n  }\n}\n\n/**\n * Performs a forward transform on the sample buffer.\n * Converts a time domain signal to frequency domain spectra.\n *\n * @param {Array} buffer The sample buffer. Buffer Length must be power of 2\n *\n * @returns The frequency spectrum array\n */\nFFT.prototype.forward = function(buffer) {\n  // Locally scope variables for speed up\n  var bufferSize      = this.bufferSize,\n      cosTable        = this.cosTable,\n      sinTable        = this.sinTable,\n      reverseTable    = this.reverseTable,\n      real            = this.real,\n      imag            = this.imag,\n      spectrum        = this.spectrum;\n\n  var k = Math.floor(Math.log(bufferSize) / Math.LN2);\n\n  if (Math.pow(2, k) !== bufferSize) { throw \"Invalid buffer size, must be a power of 2.\"; }\n  if (bufferSize !== buffer.length)  {\n    throw \"Supplied buffer is not the same size as defined FFT. FFT Size: \" + bufferSize + \" Buffer Size: \" + buffer.length;\n  }\n\n  var halfSize = 1,\n      phaseShiftStepReal,\n      phaseShiftStepImag,\n      currentPhaseShiftReal,\n      currentPhaseShiftImag,\n      off,\n      tr,\n      ti,\n      tmpReal,\n      i;\n\n  for (i = 0; i < bufferSize; i++) {\n    real[i] = buffer[reverseTable[i]];\n    imag[i] = 0;\n  }\n\n  while (halfSize < bufferSize) {\n    //phaseShiftStepReal = Math.cos(-Math.PI/halfSize);\n    //phaseShiftStepImag = Math.sin(-Math.PI/halfSize);\n    phaseShiftStepReal = cosTable[halfSize];\n    phaseShiftStepImag = sinTable[halfSize];\n\n    currentPhaseShiftReal = 1;\n    currentPhaseShiftImag = 0;\n\n    for (var fftStep = 0; fftStep < halfSize; fftStep++) {\n      i = fftStep;\n\n      while (i < bufferSize) {\n        off = i + halfSize;\n        tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);\n        ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);\n\n        real[off] = real[i] - tr;\n        imag[off] = imag[i] - ti;\n        real[i] += tr;\n        imag[i] += ti;\n\n        i += halfSize << 1;\n      }\n\n      tmpReal = currentPhaseShiftReal;\n      currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);\n      currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);\n    }\n\n    halfSize = halfSize << 1;\n  }\n\n  return this.calculateSpectrum();\n};\n\nmodule.exports = FFT;\n\n\n\n//# sourceURL=webpack://whistlerr/./lib/fft.js?");

/***/ }),

/***/ "./lib/jensenDiff.js":
/*!***************************!*\
  !*** ./lib/jensenDiff.js ***!
  \***************************/
/***/ ((module) => {

eval("// Implemnetation of Jensen difference.\n\nvar Hv_ = 5.545177444479573;\n\nfunction Hv(arr) {\n\tvar sum = 0;\n\n\tfor( var i = 0; arr[i] !== undefined; i++)\n\t\tsum -= arr[i] * Math.log(arr[i]);\n\n\treturn sum;\n}\n\nfunction HvHv_ ( arr, freqBinCount ) {\n\tvar sum = 0;\n\n\tfor( var i = 0; arr[i] !== undefined; i++) {\n\t\tvar X = (arr[i] + 2 / freqBinCount) / 2;\n\t\tsum -= X * Math.log(X);\n\t}\n\n\treturn sum;\n\n}\n\nfunction jensenDiff( spectrum, freqBinCount ) {\n\treturn HvHv_(spectrum, freqBinCount) - (Hv(spectrum) + Hv_) / 2;\n}\n\nmodule.exports = jensenDiff;\n\n//# sourceURL=webpack://whistlerr/./lib/jensenDiff.js?");

/***/ }),

/***/ "./lib/smqt.js":
/*!*********************!*\
  !*** ./lib/smqt.js ***!
  \*********************/
/***/ ((module) => {

eval("// Successive Mean Quantization transform is used to remove gain / bias\n// form the signal data. Here's an execellent explaination of the\n// algorithim : https://www.toptal.com/algorithms/successive-mean-quantization-transform\n//\n// To quote the research paper —\n// 'It reduces or removes the effect of different microphones, different dynamic range,\n// bias shift and gain shift'.\n\nvar SMQT = {\n\ttimeArr : [],\n\tsmqtArr : [],\n\n\tmaxLevel : 0,\n\n\tinit : function( timeArr, maxLevel){\n\t\tthis.timeArr = timeArr;\n\t\tthis.maxLevel = maxLevel;\n\n\t\treturn this;\n\t},\n\n\tcalculate : function(){\n\t\tthis.smqtArr = this.SMQT( this.timeArr, 1);\n\n\t\treturn this;\n\t},\n\n\taddUp : function(a, b, c) {\n\t\tvar catArr = b.concat(c);\n\n\t\tfor(var i = 0; i < catArr.length ; i++) {\n\t\t\ta[i] += catArr[i];\n\t\t}\n\n\t\treturn a;\n\t},\n\n\tSMQT : function( time_arr, currLevel )\n\t{\n\t\tif( currLevel === this.maxLevel + 1)\n\t\t\treturn [];\n\n\t\tvar U = [], one_set = [], zero_set = [], sum_samples = 0, avg_samples;\n\n\t\t// Step 1: Calculate the mean of all samples\n\t\tfor( var i = 0; i < time_arr.length; i++ ) {\n\t\t\tsum_samples += time_arr[i];\n\t\t}\n\n\t\tavg_samples = sum_samples / time_arr.length;\n\n\t\t// Step 2 : Divide the samples into two set, one\n\t\t// above average and other below average.\n\t\tfor( i = 0; i < time_arr.length; i++ ) {\n\t\t\tif( time_arr[i] >= avg_samples ) {\n\t\t\t\tU.push( 1 * Math.pow(2, this.maxLevel - currLevel) ); // conversion from binary \"1\" to its integer form\n\t\t\t\tone_set.push(time_arr[i]);\n\t\t\t} else {\n\t\t\t\tU.push(0);\n\t\t\t\tzero_set.push(time_arr[i]);\n\t\t\t}\n\t\t}\n\n\t\treturn this.addUp(U, this.SMQT(one_set, currLevel + 1), this.SMQT(zero_set, currLevel + 1));\n\t},\n\n\t// The result of SMQT is in the range of [0, 255]\n\t// normalization makes it in the range [-1, 1]\n\tnormalize : function(){\n\t\tfor ( var i = 0; i < this.smqtArr.length; i++)\n\t\t\tthis.smqtArr[i] = (this.smqtArr[i] - Math.pow(2, this.maxLevel - 1)) / Math.pow(2, this.maxLevel - 1);\n\n\t\treturn this.smqtArr;\n\t}\n\n};\n\nmodule.exports = SMQT;\n\n//# sourceURL=webpack://whistlerr/./lib/smqt.js?");

/***/ }),

/***/ "./node_modules/performance-now/lib/performance-now.js":
/*!*************************************************************!*\
  !*** ./node_modules/performance-now/lib/performance-now.js ***!
  \*************************************************************/
/***/ (function(module) {

eval("// Generated by CoffeeScript 1.12.2\n(function() {\n  var getNanoSeconds, hrtime, loadTime, moduleLoadTime, nodeLoadTime, upTime;\n\n  if ((typeof performance !== \"undefined\" && performance !== null) && performance.now) {\n    module.exports = function() {\n      return performance.now();\n    };\n  } else if ((typeof process !== \"undefined\" && process !== null) && process.hrtime) {\n    module.exports = function() {\n      return (getNanoSeconds() - nodeLoadTime) / 1e6;\n    };\n    hrtime = process.hrtime;\n    getNanoSeconds = function() {\n      var hr;\n      hr = hrtime();\n      return hr[0] * 1e9 + hr[1];\n    };\n    moduleLoadTime = getNanoSeconds();\n    upTime = process.uptime() * 1e9;\n    nodeLoadTime = moduleLoadTime - upTime;\n  } else if (Date.now) {\n    module.exports = function() {\n      return Date.now() - loadTime;\n    };\n    loadTime = Date.now();\n  } else {\n    module.exports = function() {\n      return new Date().getTime() - loadTime;\n    };\n    loadTime = new Date().getTime();\n  }\n\n}).call(this);\n\n//# sourceMappingURL=performance-now.js.map\n\n\n//# sourceURL=webpack://whistlerr/./node_modules/performance-now/lib/performance-now.js?");

/***/ }),

/***/ "./node_modules/raf/index.js":
/*!***********************************!*\
  !*** ./node_modules/raf/index.js ***!
  \***********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("var now = __webpack_require__(/*! performance-now */ \"./node_modules/performance-now/lib/performance-now.js\")\n  , root = typeof window === 'undefined' ? __webpack_require__.g : window\n  , vendors = ['moz', 'webkit']\n  , suffix = 'AnimationFrame'\n  , raf = root['request' + suffix]\n  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]\n\nfor(var i = 0; !raf && i < vendors.length; i++) {\n  raf = root[vendors[i] + 'Request' + suffix]\n  caf = root[vendors[i] + 'Cancel' + suffix]\n      || root[vendors[i] + 'CancelRequest' + suffix]\n}\n\n// Some versions of FF have rAF but not cAF\nif(!raf || !caf) {\n  var last = 0\n    , id = 0\n    , queue = []\n    , frameDuration = 1000 / 60\n\n  raf = function(callback) {\n    if(queue.length === 0) {\n      var _now = now()\n        , next = Math.max(0, frameDuration - (_now - last))\n      last = next + _now\n      setTimeout(function() {\n        var cp = queue.slice(0)\n        // Clear queue here to prevent\n        // callbacks from appending listeners\n        // to the current frame's queue\n        queue.length = 0\n        for(var i = 0; i < cp.length; i++) {\n          if(!cp[i].cancelled) {\n            try{\n              cp[i].callback(last)\n            } catch(e) {\n              setTimeout(function() { throw e }, 0)\n            }\n          }\n        }\n      }, Math.round(next))\n    }\n    queue.push({\n      handle: ++id,\n      callback: callback,\n      cancelled: false\n    })\n    return id\n  }\n\n  caf = function(handle) {\n    for(var i = 0; i < queue.length; i++) {\n      if(queue[i].handle === handle) {\n        queue[i].cancelled = true\n      }\n    }\n  }\n}\n\nmodule.exports = function(fn) {\n  // Wrap in a new function to prevent\n  // `cancel` potentially being assigned\n  // to the native rAF function\n  return raf.call(root, fn)\n}\nmodule.exports.cancel = function() {\n  caf.apply(root, arguments)\n}\nmodule.exports.polyfill = function(object) {\n  if (!object) {\n    object = root;\n  }\n  object.requestAnimationFrame = raf\n  object.cancelAnimationFrame = caf\n}\n\n\n//# sourceURL=webpack://whistlerr/./node_modules/raf/index.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./demo.js");
/******/ 	
/******/ })()
;