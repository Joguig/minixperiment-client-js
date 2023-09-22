var path = require('path');

module.exports = {
	entry: {
		app: ['./src/app.js'],
	},
	output: {
		path:     path.resolve(__dirname, 'public'),
		filename: 'app.js'
	}
};
