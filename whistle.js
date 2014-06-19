/**
 * Whistlerr
 *
 * This program is an implementation of "Human Whistle Detection and Frequency Estimation"
 * by M. Nilsson and others. It is advised to understand the paper before this code.
 *
 * @author	   Shubham Jain (shubham@coffeecoder.net)
 * @license    MIT License
 */

function whistlerr(whistleCallback)
{	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();
	var freqBinCount = 512; 
	var BAND_PASS = 1, BAND_STOP = 0;

	/* The filter implemented is not really accurate since,
		the values outside the band have been attenuated to a fixed value but
		serves a very good usable approximation. */

	function filter(spectrum, type)
	{
		/* In a spectrum of 22.05 Khz mapped to a n element
		   array, each element correspond to freqPerBufferIndex frequncied */
		var freqPerBufferIndex = freqBinCount / (2 * 22050);
		
		// Clone the array as an object
		var clone = JSON.parse(JSON.stringify(spectrum));
		for( i = 0;typeof clone[i] != "undefined"; i++ )
			
			if( (type === BAND_PASS) && (i < freqPerBufferIndex * 500 || i > freqPerBufferIndex * 5000 ) )
				clone[i] = .15;
			else if( (type === BAND_STOP) &&  i > freqPerBufferIndex * 500 && i < freqPerBufferIndex * 5000 )
				clone[i] = .15;

		return clone;
	}

	function getUserMedia(dictionary, callback, error)
	{
		try {
			navigator.getUserMedia = 
			navigator.getUserMedia ||
			navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia;
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
		window.analyser.fftSize = freqBinCount;

		mediaStreamSource.connect( analyser );
		whistleFinder();
	}

	getUserMedia({audio: true}, gotStream, function(){
		alert("There was an error accessing audio input. Please check.");
	});

	function addUp(a, b, c)
	{
		catArr = b.concat(c);

		for(i = 0; i < catArr.length ; i++)
			a[i] += catArr[i];			

		return a;
	}

	var freq_buf = new Uint8Array( freqBinCount ); //frequency domain data
	var time_buf = new Uint8Array( freqBinCount ); //time domain data
	
	var max_level = 8;

	/* Successive Mean Quantization transform. Calculate mean and recursively partion
	   the array into two equal halveson basis of that. */
	function SMQT( time_arr, L )
	{
		if( L == max_level + 1)
			return [];

		var U = [], one_set, zero_set, sum_samples = 0, avg_samples = 0;
		one_set = [];
		zero_set = [];

		for( i = 0; i < time_arr.length; i++ )
			sum_samples += time_arr[i];

		avg_samples = sum_samples / time_arr.length;

		for( i = 0; i < time_arr.length; i++ )
		{
			if( time_arr[i] >= avg_samples )
			{
				U.push(1 << (max_level - L)); // 2 ^ (max_level - L)
				one_set.push(time_arr[i]);
			} else {
				U.push(0);
				zero_set.push(time_arr[i]);
			}
		}

		return addUp(U, SMQT(one_set, L + 1), SMQT(zero_set, L + 1));
	}

	function Normalize(arr, L)
	{
		for ( i = 0; i < arr.length; i++)
			arr[i] = ((arr[i] - Math.pow(2, L - 1)) / Math.pow(2, L - 1));
		
		return arr;
	}

	/* Implementation of Jensen Difference */
	Hv_ = 5.545177444479573;
	function Hv(arr)
	{
		var sum = 0;
		
		for( i = 0; typeof arr[i] != "undefined";i++)
			sum -= arr[i] * Math.log(arr[i]);

		return sum;
	}

	function HvHv_ ( arr )
	{
		var sum = 0;
		for( i = 0; typeof arr[i] != "undefined"; i++)
		{
			X = (arr[i] + 2/freqBinCount)/2;
			sum -= X * Math.log(X);
		}

		return sum;

	}

	function jensenDiff( spectrum )
	{ 
		return HvHv_(spectrum) - (Hv(spectrum) + Hv_)/2;
	}

	// Variables for keeping track of positive samples per 50 samples. 
	D = 0, T = 0;
	function whistleFinder()
	{
		analyser.getByteTimeDomainData(time_buf);
		normData = Normalize(SMQT(time_buf, 1), max_level);

		/* FFT calculation of nomralized data */
		var fft = new FFT(freqBinCount, 44100);

		fft.forward(normData);

		var pbp = filter(fft.spectrum, BAND_PASS),	
			pbs = filter(fft.spectrum, BAND_STOP);  


		/* Calculating mean(pbs) max(pbp) */ 
		maxpbp = 0, sumAmplitudes = 0, minpbp = 100;
		for(i = 0; i < freqBinCount / 2; i++)
		{			
			if( (pbp[i]) > maxpbp)
				maxpbp = pbp[i];

			if( pbp[i] < minpbp)
				minpbp = pbp[i];

			sumAmplitudes += Math.abs(pbs[i]);		
		}

		meanpbs = sumAmplitudes / (i - 1);

		/* Forming data for Jensen Difference */
		sumAmplitudes = 0;
		for( i = 0; i < freqBinCount / 2; i++)
		{
			pbp[i] = (pbp[i] - minpbp)  + 2/freqBinCount;
			sumAmplitudes += pbp[i];
		}

		for( i = 0; i < freqBinCount / 2; i++)
			pbp[i] /= sumAmplitudes;

		ratio = maxpbp / (meanpbs + 1);
		jDiff = jensenDiff(pbp);

		if( ratio > 25 && jDiff > .44 && ++T > 5)
			whistleCallback({
				ratio: ratio, 
				jDiff: jDiff
			});

		if ( D == 50 )
			D = 0, T = 0;
		else
			D++;

		window.requestAnimationFrame(whistleFinder);
	}
};
