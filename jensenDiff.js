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