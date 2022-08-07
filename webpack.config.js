const path = require('path');

module.exports = {
    entry: './demo.js',
    mode: 'development',
    output: {
        path: path.resolve(__dirname, './docs/build'),
        filename: 'whistle.build.js'
    }
};