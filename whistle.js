function whistlerr(whistleCallback){	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();

	function getUserMedia(dictionary, callback) {
		try {
			navigator.getUserMedia = 
			navigator.getUserMedia ||
			navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia;
			navigator.getUserMedia(dictionary, callback);
		} catch (e) {
			alert('getUserMedia threw exception :' + e);
		}
	}

	function gotStream(stream) {
		// Create an AudioNode from the stream.
		var mediaStreamSource = audioContext.createMediaStreamSource(stream);

		// Connect it to the destination.
		window.analyser = audioContext.createAnalyser();

		mediaStreamSource.connect( analyser );
		whistleFinder();
	}

	getUserMedia({audio: true}, gotStream);


	/*** Whistle Detection code ***/
	
	var freqBinCount = 1024; //default
	var freq_buf = new Uint8Array( freqBinCount ); //frequency domain data
	var time_buf = new Uint8Array( freqBinCount ); //time domain data
	
	non_positives = 0;
	WINDOW_SIZE = 5;	//Windowing to detect sudden spikes

	function whistleFinder()
	{

		analyser.getByteFrequencyData(freq_buf);

		max_energy = 0;
		prev_energy = 0;
		peak_samples = 0;	// Too many peak samples is probably a noise.
		max_energy_gap = 0; // We need to find the sharpest spike in sample


		// According to "Human Whistle Detection and Frequency Estimation" most human whistles 
		// lie between 600 Hz to 5000 Hz. For buffer length 1024 and 22.05 Khz Max frequency, each element in array will correspond to ~22.533 Hz and hence the corresponding values, 29 and 232.

		for (i = 29; i < 232; i+= WINDOW_SIZE)
		{

			energy = 0;
			for ( j = 0; j < WINDOW_SIZE; j++ )
			{
				if( freq_buf[i+j] > 200 )
					peak_samples++;
				energy += freq_buf[i+j];
			}

			if( (prev_energy - energy) > max_energy_gap)
				max_energy_gap = (prev_energy - energy);
			prev_energy = energy;				

			if( energy > max_energy ){
				max_energy = energy;
			}
		}

		// Values taken with trial and error 
		// non_positives condition is taken to ensure 
		// that many valid samples quantify only a single whistle.
		if( max_energy_gap > 250 && peak_samples < 20 && max_energy > 1100 && non_positives > 30)
		{
			whistleCallback();
			non_positives = 0;
		} else {
			non_positives++;
		}
		window.webkitRequestAnimationFrame(whistleFinder);
	}
};