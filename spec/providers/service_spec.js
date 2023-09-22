var ajax = require('../../lib/ajax');
var ServiceProvider = require('../../lib/providers/service');

describe("ServiceProvider", function() {
	var specID = 1;
	var experimentID;

	beforeEach(function() {
		specID++;
		experimentID = 'ServiceProvider_experiment_' + specID;
	});

	describe("#getExperimentConfiguration", function() {
		it("should have a `getExperimentConfiguration` method", function() {
			var provider = new ServiceProvider(ServiceProvider.SERVICE_URL);

			expect(typeof provider.getExperimentConfiguration).toBe('function');
		});

		it("should return the configuration from the specified url", function(done) {
			var experimentConfiguration = {};
			experimentConfiguration[experimentID] = {
				groups: [
					{ value: 'control', weight: 98 },
					{ value: 'new and different', weight: 2 }
				],
			};

			spyOn(ajax, 'fetch').and.callFake(function(url, options, callback) {
				if (url === ServiceProvider.SERVICE_URL) {
					callback(null, JSON.stringify(experimentConfiguration));
				} else {
					fail("Unexpected URL call: " + url);
				}
			});

			var provider = new ServiceProvider(ServiceProvider.SERVICE_URL);

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
