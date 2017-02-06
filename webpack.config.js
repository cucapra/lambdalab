var webpack = require('webpack');
module.exports = {
    entry: {
      index: __dirname + '/build/lambdalab.js'
    },
    devtool: 'source-map',
    output: {
        filename: 'lambdalab.bundle.js'
    }
}
