module.exports = function(grunt){
	grunt.initConfig({
		jshint: {
			all: ['src/**/*.js', 'test/**/*.js'],
			options: {
				globals: {
					_: false,
					$: false,
					jasmine: false,
					describe: false,
					it: false,
					expect: false,
					beforeEach: false,
					afterEach: false,
					sinon: false
				},
				browser: true,
				devel: true
			}
		},

		testem: {
			unit: {
				options: {
					framework: 'jasmine2',
					launch_in_dev: ['PhantomJS'],
					before_tests: 'grunt jshint',
					serve_files: [
					'node_modules/sinon/pkg/sinon.js',
					'node_modules/lodash/index.js',
					'node_modules/jquery/dist/jquery.js',
					'src/**/*.js',
					'test/**/*.js'
					],
					watch_files: [
					'src/**/*.js',
					'test/**/*.js'
					]

				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-testem');
	//this makes grunt run the testem command automatically instead of having to type it in the terminal:
	grunt.registerTask('default', ['testem:run:unit']);
};