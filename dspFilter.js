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