var ajax                = require('../lib/ajax');
var experiments         = require('../lib/experiments');
var MinixperimentClient = require('../lib/client');
var LocalProvider       = require('../lib/providers/local');
var spade               = require('../lib/tracking/spade');

describe("client", function() {
	var specID   = 1;
	var platform = "test";
	var deviceID;
	var experimentID;
	var experimentName;
	var login;
	var defaultValue;

	beforeEach(function() {
		spyOn(console, 'error');
		spyOn(console, 'warn');
		spyOn(ajax, 'fetch').and.callFake(function(url, opts, callback) {
			var call = this.fetch.calls.mostRecent();

			call.requestComplete = false;
			setTimeout(function() {
				call.requestComplete = true;
				callback();
			}, 10);
		});

		specID++;
		deviceID     = "device_" + specID;
		experimentID = "experiment_" + specID;
		experimentName = "experiment name: " + specID;
		login        = "user_" + specID;
		defaultValue = "default value: " + specID;
		experimentVersion = specID;
	});

	describe("MinixperimentClient", function() {
		describe("instantiation", function() {
			it("should fail if the `defaults` property is missing", function() {
				expect(function() {
					new MinixperimentClient({
						// defaults: {},
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider({}),
						Promise:  Promise,
						login:    login,
					});
				}).toThrow(new Error("Invalid defaults; expected object, got undefined"));
			});

			it("should fail if the `defaults` property is not an object", function() {
				expect(function() {
					new MinixperimentClient({
						defaults: ["not", "an", "object"],
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider({}),
						Promise:  Promise,
						login:    login,
					});
				}).toThrow(new Error("Invalid defaults; expected object, got [\"not\",\"an\",\"object\"]"));
			});

			it("should fail if the `deviceID` property is missing", function() {
				expect(function() {
					new MinixperimentClient({
						defaults: {},
						// deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider({}),
						Promise:  Promise,
						login:    login,
					});
				}).toThrow(new Error("Invalid device ID; expected non-empty string, got `undefined`"));
			});

			it("should fail if the `deviceID` property is empty", function() {
				expect(function() {
					new MinixperimentClient({
						defaults: {},
						deviceID: "",
						platform: "test",
						provider: new LocalProvider({}),
						Promise:  Promise,
						login:    login,
					});
				}).toThrow(new Error("Invalid device ID; expected non-empty string, got ``"));
			});

			it("should fail if the `deviceID` property is not a string", function() {
				expect(function() {
					new MinixperimentClient({
						defaults: {},
						deviceID: 12345,
						platform: "test",
						provider: new LocalProvider({}),
						Promise:  Promise,
						login:    login,
					});
				}).toThrow(new Error("Invalid device ID; expected non-empty string, got `12345`"));
			});

			it("should fail if the `platform` property is missing", function() {
				expect(function() {
					new MinixperimentClient({
						defaults: {},
						deviceID: deviceID,
						// platform: "test",
						provider: new LocalProvider({}),
						Promise:  Promise,
						login:    login,
					});
				}).toThrow(new Error("Invalid platform; expected non-empty string, got `undefined`"));
			});

			it("should fail if the `platform` property is empty", function() {
				expect(function() {
					new MinixperimentClient({
						defaults: {},
						deviceID: deviceID,
						platform: "",
						provider: new LocalProvider({}),
						Promise:  Promise,
						login:    login,
					});
				}).toThrow(new Error("Invalid platform; expected non-empty string, got ``"));
			});

			it("should fail if the `platform` property is not a string", function() {
				expect(function() {
					new MinixperimentClient({
						defaults: {},
						deviceID: deviceID,
						platform: 12345,
						provider: new LocalProvider({}),
						Promise:  Promise,
						login:    login,
					});
				}).toThrow(new Error("Invalid platform; expected non-empty string, got `12345`"));
			});

			describe("configuration returned from the provider", function() {
				it("should use the provided configuration if it is valid", function(done) {
					var defaults = {};
					defaults[experimentID] = defaultValue;

					var experimentConfig = {};
					experimentConfig[experimentID] = {
						name: experimentName,
						v: experimentVersion,
						t: 2,
						s: 3,
						groups: [
							{ value: "control", weight: 100 }
						]
					};

					var client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(experimentConfig),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 0
					});

					var result = client.get(experimentID);

					result.then(function(value) {
						expect(value).toBe("control");
					}).then(function(assignment) {
						expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([{
							"event": "experiment_branch",
							"properties": {
								"device_id":        deviceID,
								"platform":         "test",
								"login":            login,
								"experiment_id":    experimentID,
								"experiment_name":  experimentName,
								"experiment_type":  "user_id",
								"experiment_group": "control",
								"experiment_version": experimentVersion,
							}
						}]);
					}).then(done, done.fail);
				});

				it("should use the provided configuration on channel experiment", function(done) {
					var defaults = {};
					defaults[experimentID] = defaultValue;

					var experimentConfig = {};
					experimentConfig[experimentID] = {
						name: experimentName,
						v: experimentVersion,
						t: 3,
						groups: [
							{ value: "control", weight: 100 }
						]
					};

					var client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(experimentConfig),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 0
					});

					var result = client.get(experimentID, {channel: "somechannel"});

					result.then(function(value) {
						expect(value).toBe("control");
					}).then(function(assignment) {
						expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([{
							"event": "experiment_branch",
							"properties": {
								"device_id":        deviceID,
								"platform":         "test",
								"login":            login,
								"experiment_id":    experimentID,
								"experiment_name":  experimentName,
								"experiment_type":  "channel_id",
								"experiment_group": "control",
								"experiment_version": experimentVersion,
							}
						}]);
					}).then(done, done.fail);
				});

				it("should use the default configuration if no user on user experiment", function(done) {
					var defaults = {};
					defaults[experimentID] = defaultValue;

					var experimentConfig = {};
					experimentConfig[experimentID] = {
						name: experimentName,
						v: experimentVersion,
						t: 2,
						s: 1,
						groups: [
							{ value: "control", weight: 100 }
						]
					};

					var client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(experimentConfig),
						Promise:  Promise,
						batchTimeOut: 0
					});

					var result = client.get(experimentID);

					result.then(function(value) {
						expect(value).toBe(defaultValue);
					}).then(function(assignment) {
						expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([{
							"event": "experiment_branch",
							"properties": {
								"device_id":        deviceID,
								"platform":         "test",
								"experiment_id":    experimentID,
								"experiment_name":  experimentName,
								"experiment_type":  "user_id",
								"experiment_group": defaultValue,
								"experiment_version": experimentVersion,
							}
						}]);
					}).then(done, done.fail);
				});

				it("should use the default configuration if no channel on channel experiment", function(done) {
					var defaults = {};
					defaults[experimentID] = defaultValue;

					var experimentConfig = {};
					experimentConfig[experimentID] = {
						name: experimentName,
						v: experimentVersion,
						t: 3,
						groups: [
							{ value: "control", weight: 100 }
						]
					};

					var client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(experimentConfig),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 0
					});

					var result = client.get(experimentID);

					result.then(function(value) {
						expect(value).toBe(defaultValue);
					}).then(function(assignment) {
						expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([{
							"event": "experiment_branch",
							"properties": {
								"device_id":        deviceID,
								"platform":         "test",
								"login":            login,
								"experiment_id":    experimentID,
								"experiment_name":  experimentName,
								"experiment_type":  "channel_id",
								"experiment_group": defaultValue,
								"experiment_version": experimentVersion,
							}
						}]);
					}).then(done, done.fail);
				});

				it("should use the default configuration if experimentConfig does not define the experiment", function(done) {
					var defaults = {};
					defaults[experimentID] = defaultValue;
					defaults["deprecated"] = "deprecate_default_value";

					var experimentConfig = {};
					experimentConfig[experimentID] = {
						name: experimentName,
						v: experimentVersion,
						t: 1,
						groups: [
							{ value: "control", weight: 100 }
						]
					};

					var client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(experimentConfig),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 0
					});

					var result = client.get("deprecated");

					result.then(function(value) {
						expect(value).toBe("deprecate_default_value");
					}).then(function(assignment) {
						expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([{
							"event": "experiment_branch",
							"properties": {
								"device_id":        deviceID,
								"platform":         "test",
								"login":            login,
								"experiment_id":    "deprecated",
								"experiment_group": "deprecate_default_value",
								"experiment_version": 0,
							}
						}]);
					}).then(done, done.fail);
				});

				it("should use the default value if the configuration is invalid", function(done) {
					var defaults = {};
					defaults[experimentID] = defaultValue;

					var experimentConfig = {};
					experimentConfig[experimentID] = {
						name: experimentName,
						v: experimentVersion,
						t: 3,
						s: 2,
						groups: [
							{ value: "control", weight: -1 }
						]
					};

					var client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(experimentConfig),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 0
					});

					var result = client.get(experimentID);

					result.then(function(value) {
						expect(value).toBe(defaultValue);
					}).then(done, done.fail);
				});
			});

			describe("when experiments have overrides", function() {
				var client;
				var overrideValue;

				beforeEach(function() {
					overrideValue = "override_" + specID;

					var defaults = {};
					defaults[experimentID] = defaultValue;

					var config = {};
					config[experimentID] = {
						name: experimentName,
						v: experimentVersion,
						t: 1,
						groups: [
							{ value: "group a", weight: 1 },
							{ value: "group b", weight: 1 },
						],
					};

					var overrides = {};
					overrides[experimentID] = overrideValue

					client = new MinixperimentClient({
						defaults:  defaults,
						deviceID:  deviceID,
						overrides: overrides,
						platform:  "test",
						provider:  new LocalProvider(config),
						Promise:   Promise,
						login:     login,
						batchTimeOut: 0
					});
				});

				describe("when the experimental treatment assignment has not been overridden", function() {
					// This case should be covered by the `#get` tests below
				});

				describe("when the experimental treatment assignment has been overridden", function() {
					describe("when the experimental configuration has the listed experiment", function() {
						it("should return the override value", function(done) {
							var result = client.get(experimentID);

							result.then(function(assignment) {
								expect(assignment).toBe(overrideValue);
							}).then(done, done.fail);
						});

						it("should send the correct event to Spade", function(done) {
							var result = client.get(experimentID);
							result.then(function(assignment) {
								expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([{
									"event": "experiment_branch",
									"properties": {
										"device_id":        deviceID,
										"platform":         "test",
										"login":            login,
										"experiment_id":    experimentID,
										"experiment_name":  experimentName,
										"experiment_type":  "device_id",
										"experiment_group": overrideValue,
										"experiment_version": experimentVersion,
									}
								}]);
							}).then(done, done.fail);
						});
					});

					describe("when the experimental configuration does not have the listed experiment", function() {
						var missingExperimentID;
						var missingExperimentDefaultValue;

						beforeEach(function() {
							missingExperimentID = 'other_experiment_' + specID;
							missingExperimentDefaultValue = 'missing default: ' + specID;

							var defaults = {};
							defaults[experimentID] = defaultValue;
							defaults[missingExperimentID] = missingExperimentDefaultValue;

							var config = {};
							config[experimentID] = {
								name: experimentName,
								v: experimentVersion,
								t: 1,
								groups: [
									{ value: "group a", weight: 1 },
									{ value: "group b", weight: 1 },
								],
							};

							var overrides = {};
							overrides[missingExperimentID] = overrideValue

							client = new MinixperimentClient({
								defaults:  defaults,
								deviceID:  deviceID,
								overrides: overrides,
								platform:  "test",
								provider:  new LocalProvider(config),
								Promise:   Promise,
								login:     login,
								batchTimeOut: 0
							});
						});

						it("should still return the override value", function(done) {
							var result = client.get(missingExperimentID);

							result.then(function(assignment) {
								expect(assignment).toBe(overrideValue);
							}).then(done, done.fail);
						});

						it("should an event to Spade with version 0", function(done) {
							var result = client.get(missingExperimentID);
							result.then(function(assignment) {
								expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([{
									"event": "experiment_branch",
									"properties": {
										"device_id":        deviceID,
										"platform":         "test",
										"login":            login,
										"experiment_id":    missingExperimentID,
										"experiment_group": overrideValue,
										"experiment_version": 0,
									}
								}]);
							}).then(done, done.fail);
						});
					});
				});

				describe("when the override is a Promise", function() {
					describe("when it is resolved", function() {
						it("should use the resolved value", function(done) {
							var defaults = {};
							defaults[experimentID] = defaultValue;

							var config = {};
							config[experimentID] = {
								name: experimentName,
								v: 47,
								t: 2,
								groups: [
									{ value: "group a", weight: 1 },
									{ value: "group b", weight: 1 },
								],
							};

							var overrides = {};
							overrides[experimentID] = Promise.resolve(overrideValue);

							client = new MinixperimentClient({
								defaults:  defaults,
								deviceID:  deviceID,
								overrides: overrides,
								platform:  "test",
								provider:  new LocalProvider(config),
								Promise:   Promise,
								login:     login,
								batchTimeOut: 0
							});

							var result = client.get(experimentID);
							result.then(function(assignment) {
								expect(assignment).toBe(overrideValue);
							}).then(done, done.fail);
						});
					});

					describe("when it is rejected", function() {
						it("should use the regular default", function(done) {
							var defaults = {};
							defaults[experimentID] = defaultValue;

							var config = {};
							config[experimentID] = {
								name: experimentName,
								v: 28,
								t: 1,
								s: 1,
								groups: [
									{ value: "control",   weight: 100 },
									{ value: "treatment", weight: 0 },
								],
							};

							var overrides = {};
							overrides[experimentID] = Promise.reject(overrideValue);

							client = new MinixperimentClient({
								defaults:  defaults,
								deviceID:  deviceID,
								overrides: overrides,
								platform:  "test",
								provider:  new LocalProvider(config),
								Promise:   Promise,
								login:     login,
								batchTimeOut: 0
							});

							var result = client.get(experimentID);
							result.then(function(assignment) {
								expect(assignment).toBe("control");
							}).then(done, done.fail);
						});
					});
				});
			});
		});

		describe("#get", function() {
			it("should expose the `get` method", function() {
				var client = new MinixperimentClient({
					defaults: {},
					deviceID: deviceID,
					platform: "test",
					provider: new LocalProvider({}),
					Promise:  Promise,
					login:    login,
					batchTimeOut: 0
				});
				expect(typeof client.get).toBe('function');
			});

			/////
			describe("Multiple gets", function() {
				var client;

				beforeEach(function() {
					var defaults = {};
					defaults['experiment_1'] = defaultValue;
					defaults['experiment_2'] = defaultValue;

					var config = {};
					config['experiment_1'] = {
						name: experimentName,
						v: 12,
						t: 1,
						groups: [
							{ value: "5",  weight: 100 },
						]
					};
					config['experiment_2'] = {
						name: experimentName,
						v: 12,
						t: 1,
						groups: [
							{ value: "10", weight: 100 },
						]
					};

					client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(config),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 1000,
						throttleTime: 60000,
					});
				});

				it("should batch EB events", function() {
					var result = Promise.all([client.get('experiment_1'), client.get('experiment_2')]);

					return result.then(function(values) {
						expect(values[0]).toBe("5");
						expect(values[1]).toBe("10");
					}).then(function() {
						return new Promise(function(r) {
							setTimeout(r, 2000);
						})
					}).then(function(){
						expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([
							{
								"event": "experiment_branch",
								"properties": {
									"device_id":        deviceID,
									"platform":         "test",
									"login":            login,
									"experiment_id":    'experiment_1',
									"experiment_name":  experimentName,
									"experiment_group": "5",
									"experiment_version": 12,
								}
							},
							{
								"event": "experiment_branch",
								"properties": {
									"device_id":        deviceID,
									"platform":         "test",
									"login":            login,
									"experiment_id":    'experiment_2',
									"experiment_name":  experimentName,
									"experiment_group": "10",
									"experiment_version": 12,
								}
							}
						]);
					});
				});

				it("should batch EB events but throttle duplicate get calls to same experiment id", function() {
					var result = Promise.all([client.get('experiment_1'), client.get('experiment_2'), client.get('experiment_1')]);

					return result.then(function(values) {
						expect(values[0]).toBe("5");
						expect(values[1]).toBe("10");
					}).then(function() {
						return new Promise(function(r) {
							setTimeout(r, 2000);
						});
					}).then(function() {
						expect(ajax.fetch).toHaveNotifiedDefaultSpadeWith([
							{
								"event": "experiment_branch",
								"properties": {
									"device_id":        deviceID,
									"platform":         "test",
									"login":            login,
									"experiment_id":    'experiment_1',
									"experiment_name":  experimentName,
									"experiment_group": "5",
									"experiment_version": 12,
								}
							},
							{
								"event": "experiment_branch",
								"properties": {
									"device_id":        deviceID,
									"platform":         "test",
									"login":            login,
									"experiment_id":    'experiment_2',
									"experiment_name":  experimentName,
									"experiment_group": "10",
									"experiment_version": 12,
								}
							}
						]);
					});
				});
			});
			/////

			describe("when requesting a value for an existing experiment", function() {
				var client;

				beforeEach(function() {
					var defaults = {};
					defaults[experimentID] = defaultValue;

					var config = {};
					config[experimentID] = {
						name: experimentName,
						v: 12,
						t: 1,
						groups: [
							{ value: "5",  weight: 10 },
							{ value: "10", weight: 5 },
							{ value: "15", weight: 0 }
						]
					};

					client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(config),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 0
					});
				});

				it("should select a treatment based on the configured device ID", function(done) {
					var result = client.get(experimentID);

					result.then(function(assignment) {
						expect(assignment).toBeOneOf(["5", "10", "15"]);
					}).then(done, done);
				});

				it("should report an experimental treatment application to Spade", function(done) {
					var result = client.get(experimentID);

					result.then(function(_) {
						expect(ajax.fetch).toHaveBeenCalled();
						expect(ajax.fetch).toHaveNotifiedDefaultSpade();
					}).then(done, done);
				});

				describe("with the option `mustTrack` set to `true`", function() {
					it("should complete the report to Spade before returning the assignment", function(done) {
						var result = client.get(experimentID, { mustTrack: true });

						result.then(function(_) {
							expect(ajax.fetch).toHaveNotifiedDefaultSpadeSynchronously();
						}).then(done, done.fail);
					});
				});

				describe("with the option `mustTrack` set to `false`", function() {
					it("should return the assignment before the call to Spade completes", function(done) {
						var result = client.get(experimentID, { mustTrack: false });

						result.then(function(_) {
							expect(ajax.fetch).not.toHaveNotifiedDefaultSpadeSynchronously();
						}).then(done, done.fail);
					});
				});
			});

			describe("when requesting a value for an existing experiment with spade url override", function() {
				var client;

				beforeEach(function() {
					var defaults = {};
					defaults[experimentID] = defaultValue;

					var config = {};
					config[experimentID] = {
						name: experimentName,
						v: 15,
						t: 1,
						groups: [
							{ value: "5",  weight: 10 },
							{ value: "10", weight: 5 },
							{ value: "15", weight: 0 }
						]
					};
					config[spade.SPADE_URL_PROJECT_UUID] = {
						name: "spade_url",
						t: 1,
						groups: [{ value: "//video-edge-ed6ddc.sjc01.hls.ttvnw.net", weight: 1 }]
					};

					client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(config),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 0
					});
				});

				it("should report an experimental treatment application to non-default Spade", function(done) {
					var result = client.get(experimentID);

					result.then(function(_) {
						expect(ajax.fetch).toHaveBeenCalled();
						expect(ajax.fetch).toHaveNotifiedNonDefaultSpade();
					}).then(done, done);
				});
			});

			describe("when requesting a value for an experiment missing from the configuration", function() {
				var client;
				var missingExperimentID;
				var missingExperimentDefaultValue;

				beforeEach(function() {
					missingExperimentID = "missing_experiment_" + specID;
					missingExperimentDefaultValue = "missing_default_" + specID;

					var defaults = {};
					defaults[experimentID] = defaultValue;
					defaults[missingExperimentID] = missingExperimentDefaultValue;

					var config = {};
					config[experimentID] = {
						name: experimentName,
						v: 52,
						t: 1,
						s: 5,
						groups: [
							{ value: "5",  weight: 10 },
							{ value: "10", weight: 5 },
							{ value: "15", weight: 0 }
						]
					};

					client = new MinixperimentClient({
						defaults: defaults,
						deviceID: deviceID,
						platform: "test",
						provider: new LocalProvider(config),
						Promise:  Promise,
						login:    login,
						batchTimeOut: 0
					});
				});

				it("should report an error", function() {
					// TODO
				});

				it("should return the provided default value, if one is given", function(done) {
					var result = client.get(missingExperimentID);

					result.then(function(assignment) {
						expect(assignment).toEqual(missingExperimentDefaultValue);
					}).then(done, done);
				});

				it("should return `null`, if no default value is given", function(done) {
					var missingExperimentWithNoDefaultID = "missing, no default " + specID;
					var result = client.get(missingExperimentWithNoDefaultID);

					result.then(function(assignment) {
						expect(assignment).toBe(null);
					}).then(done, done);
				});

				it("should write a warning to the console indicating that the experiment is misconfigured", function(done) {
					var result = client.get(missingExperimentID);

					result.then(function() {
						expect(console.warn).toHaveBeenCalled();
					}).then(done, done);
				});
			});
		});

	});
});
