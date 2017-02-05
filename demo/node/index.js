'use strict'

const Analyser  = require('audio-analyser')
const mic       = require('mic')
const whistlerr = require('../../index')


const CHANNEL_COUNT = 1
const SAMPLE_RATE = 44100

const analyser = new Analyser({
  // same settings as pcm-util
  channels: CHANNEL_COUNT,
  sampleRate: SAMPLE_RATE,

  // Magnitude diapasone, in dB 
  minDecibels: -100,
  maxDecibels: -30,

  // Number of time samples to transform to frequency 
  fftSize: 1024,

  // Number of frequencies, twice less than fftSize 
  frequencyBinCount: 1024/2,

  // Smoothing, or the priority of the old data over the new data 
  smoothingTimeConstant: 0.2,

  // Number of channel to analyse 
  channel: 0,

  // Size of time data to buffer 
  bufferSize: SAMPLE_RATE,

  // Windowing function for fft, https://github.com/scijs/window-functions 
  applyWindow: function (sampleNumber, totalSamples) {
  }
})

const micInstance = mic({ 'rate': SAMPLE_RATE.toString(), 'channels': CHANNEL_COUNT.toString(), 'debug': false, 'exitOnSilence': 0 })
const micInputStream = micInstance.getAudioStream()
micInputStream.pipe(analyser)

micInstance.start()

const config = {
  sampleThreshold: 8,
  analyser: analyser,
  sampleRate: SAMPLE_RATE,
  freqBinCount: analyser.frequencyBinCount
}

whistlerr(function(result) {
  console.log('Whistle (' + result.ratio + ', ' + result.jDiff + ')')
}, config)
