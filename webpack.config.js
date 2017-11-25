var webpack = require('webpack');
module.exports = {
    entry: './lambdalab.ts',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                'configFile': 'tsconfig.web.json',
              },
            }
          ],
          exclude: /node_modules/,
        }
      ]
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ]
    },
    devtool: 'source-map',
    output: {
        filename: 'lambdalab.bundle.js'
    }
}
