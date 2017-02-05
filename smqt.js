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