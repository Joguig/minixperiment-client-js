var LocalProvider = require('../../lib/providers/local');

describe("LocalProvider", function() {
	var specID = 1;
	var experimentID;

	beforeEach(function() {
		specID++;
		experimentID = 'LocalProvider_experiment_' + specID;
	});

	describe("#getExperimentConfiguration", function() {
		it("should have a `getExperimentConfiguration` method", function() {
			var provider = new LocalProvider({});

			expect(typeof provider.getExperimentConfiguration).toBe('function');
		});

		it("should return the given configuration", function(done) {
			// TODO give a more complicated one and test that it rejects
			// poorly formatted configs. Requires a defined config...
			var experimentConfiguration = {};
			experimentConfiguration[experimentID] = {
				groups: [
					{ value: 'control', weight: 10 },
					{ value: 'group A', weight: 20 },
					{ value: 'group B', weight: 15 }
				]
			};

			var provider = new LocalProvider(experimentConfiguration);

			provider.getExperimentConfiguration(
				function success(configuration) {
					expect(configuration).toEqual(experimentConfiguration);
					done();
				},
				done.fail
			);
		});
	});
});
