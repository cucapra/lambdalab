var webpack = require('webpack');
module.exports = {
    entry: {
      index: __dirname + '/build/lambdalab.js'
    },
    output: {
        filename: 'lambdalab.bundle.js'
    }
}
