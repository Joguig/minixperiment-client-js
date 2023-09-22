var path = require('path');

module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-webpack');

	var source_path = path.join(__dirname, 'lib');
	var dest_path   = path.join(__dirname, 'dist');

	grunt.initConfig({
		webpack: {
			options: {
				resolve: {
					modulesDirectories: ['node_modules'],
					root:               __dirname
				},
				resolveLoader: {
					root: __dirname
				}
			},
			"amd": {
				entry: {
					client:           path.join(source_path, 'client.js'),
					"provider-local": path.join(source_path, 'providers', 'local.js'),
					"provider-service": path.join(source_path, 'providers', 'service.js'),
				},
				output: {
					path:          dest_path,
					filename:      'minixperiment.[name].js',
					library:       "minixperiment/[name]",
					libraryTarget: 'amd'
				}
			},
			"umd-client": {
				entry: {
					client: path.join(source_path, 'client.js')
				},
				output: {
					path:          dest_path,
					filename:      'minixperiment.[name].js',
					library:       ["Minixperiment", "Client"],
					libraryTarget: 'umd'
				}
			},
			"umd-providers": {
				entry: {
					"local": path.join(source_path, 'providers', 'local.js'),
					"service": path.join(source_path, 'providers', 'service.js')
				},
				output: {
					path:          dest_path,
					filename:      'minixperiment.providers.[name].js',
					library:       ["Minixperiment", "providers", "[name]"],
					libraryTarget: 'umd'
				}
			}
		}
	});

	grunt.registerTask('build:amd', ['webpack:amd']);
	grunt.registerTask('build:umd', ['webpack:umd-client', 'webpack:umd-providers']);
};
