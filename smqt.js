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
				U.push( Math.pow(2, this.maxLevel - currLevel) ); // 2 ^ (config.maxLevel - L)
				one_set.push(time_arr[i]);
			} else {
				U.push(0);
				zero_set.push(time_arr[i]);
			}
		}

		return this.addUp(U, this.SMQT(one_set, currLevel + 1), this.SMQT(zero_set, currLevel + 1));
	},

	normalize : function(){
		for ( var i = 0; i < this.smqtArr.length; i++)
			this.smqtArr[i] = (this.smqtArr[i] - Math.pow(2, this.maxLevel - 1)) / Math.pow(2, this.maxLevel - 1);

		return this.smqtArr;
	}

};


// Successive Mean Quantization transform. Calculate mean and recursively partion
// the array into two equal halves on basis of that.
//
module.exports = SMQT;