function whistlerr(whistleCallback){	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContext();

	//Band pass butterworth filter order=1 alpha1=500 alpha2=50000 
	Filter = {
		v: [],
		init: function(type)
		{
			this.v[0]=0.0;
			this.v[1]=0.0;
			this.type = type; //1 : bandpass, 0: bandstop
		},
		step: function(x) //class II 
		{
			this.v[0] = this.v[1];
			
			if( this.type == 0)
			{
				this.v[2] = (7.507378577944e-1 * x) + ( -0.5014757156 * this.v[0]) + (  1.4621836430 * this.v[1]);
				this.v[1] = this.v[2];
				return  this.v[0] + this.v[2] - 1.947662 * this.v[1];
			} else {
				this.v[2] = (2.676654076798e-1 * x) + ( -0.5014757156 * this.v[0]) + (  1.4621836430 * this.v[1]);
				this.v[1] = this.v[2];
				return (this.v[2] - this.v[0]);
				
			}

		},

		exec: function(spectrum, type)
		{
			this.init(type);
			for( i = 0;i < spectrum.length; i++ )
				if( i < 6 && i > 58 && type == 1)
					spectrum[i] = this.step(spectrum[i]);
				else if( type == 0 &&  i > 6 && i < 58 )
					spectrum[i] = this.step(spectrum[i]);
			return spectrum;
		}
	};


	function getUserMedia(dictionary, callback, error) {
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

	function gotStream(stream) {
		// Create an AudioNode from the stream.
		var mediaStreamSource = audioContext.createMediaStreamSource(stream);

		// Connect it to the destination.
		window.analyser = audioContext.createAnalyser();
		window.analyser.fftSize = 512;

		//mediaStreamSource.connect( filter );
		mediaStreamSource.connect( analyser );
		whistleFinder();
	}

	function addUp(a, b, c)
	{
		catArr = b.concat(c);

		for(i = 0; i < catArr.length ; i++)
		{		
			a[i] += catArr[i];			
		}

		return a;
	}

	getUserMedia({audio: true}, gotStream, function(){
		alert("There was an error accessing audio input. Please check.");
	});


	/*** Whistle Detection code ***/
	
	var freqBinCount = 512; 
	var freq_buf = new Uint8Array( freqBinCount ); //frequency domain data
	var time_buf = new Uint8Array( freqBinCount ); //time domain data
	
	var max_level = 8;
	/* Successive Mean Quantization transform.
	To remove any bais, gain from audio data */
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
				U.push(1 << (max_level - L));
				one_set.push(time_arr[i]);
			} else {
				U.push(0);
				zero_set.push(time_arr[i]);
			}
		}

		return  addUp(U, SMQT(one_set, L + 1), SMQT(zero_set, L + 1));
	}


	function Normalize(arr, L)
	{
		for ( i = 0; i < arr.length; i++)
			arr[i] = ((arr[i] - Math.pow(2, L - 1)) / Math.pow(2, L - 1)).toFixed(2);
		
		return arr;
	}


	/*function paintArray( arr, options )
	{
		canvasEl = document.getElementById('ss');
		var ctx     = canvasEl.getContext( '2d' ),
      h       = canvasEl.height,
      w       = canvasEl.width,
      width   = options.width || 2,
      spacing = options.spacing || 0,
      count   = options.count || 1024;

    ctx.lineWidth   = options.strokeWidth || 1;
    ctx.strokeStyle = options.strokeStyle || "black";


      var waveform = arr;
      ctx.clearRect( 0, 0, w, h );
      ctx.beginPath();
      ctx.moveTo( 0, h / 2 );
      for ( var i = 0, l = waveform.length; i < l && i < count; i++ ) {
        ctx.lineTo( i * ( spacing + width ), ( h / 2 ) + waveform[ i ] * 10 * ( h / 2 ));
      }
      ctx.stroke();
      ctx.closePath();

	}
	*/
	/* Implementation of Jensen Difference */
	Hv_ = 5.545177444479573;
	function Hv(arr)
	{
		sum = 0;
		
		for( i =0; i < arr.length;i++)
			sum -= arr[i] * Math.log(arr[i]);

		return sum;
	}

	function HvHv_ ( arr )
	{
		sum = 0;
		for( i = 0; i < arr.length; i++)
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

	D = 0, T = 0;
	freqPerBufferIndex = freqBinCount / (2 * 22050);
	function whistleFinder()
	{
		analyser.getByteTimeDomainData(time_buf);
		normData = Normalize(SMQT(time_buf, 1), max_level);

		/* FFT calculation of nomralized data */
		var fft = new FFT(freqBinCount, 44100);

		fft.forward(normData);

		var pbp = Filter.exec(fft.spectrum, 1),	
			pbs = Filter.exec(fft.spectrum, 0);

			//console.log(pbp, pbs);

		/* Calculating mean(pbs) max(pbp) */ 
		maxpbp = 0, sumAmplitudes = 0, minpbp = 100;
		for(i = 0; i < freqBinCount / 2; i++)
		{
			
			if( (pbp[i]) > maxpbp)
				maxpbp = (pbp[i]);

			if( pbp[i] < minpbp)
				minpbp = pbp[i];

			sumAmplitudes += Math.abs(pbs[i]);
				
		
	}

	meanpbs = sumAmplitudes / (i - 1);

	/* Forming data for Jensen function */
	sumAmplitudes = 0;
	for( i = 0; i < freqBinCount / 2; i++)
	{
		pbp[i] = (pbp[i] - minpbp)  + 2/freqBinCount;
		sumAmplitudes += pbp[i];
	}

	for( i = 0; i < freqBinCount / 2; i++)
	{
		pbp[i] /= sumAmplitudes;
	}

	ratio = maxpbp / (meanpbs + 1);
	jDiff = jensenDiff(pbp);

	if( ratio < .15 && ratio > .10 && jDiff < .002 && D > 25)
	console.log(ratio, jDiff,D, fft.spectrum);

	if ( D == 50 )
		D = 0, T = 0;
	else
		D++;

	window.requestAnimationFrame(whistleFinder);
}
};
