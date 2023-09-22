var experiments = require('../lib/experiments');

describe("experiments", function() {
	var specID = 1;
	var deviceID;
	var experimentID;

	beforeEach(function() {
		specID++;
		deviceID = 'experiments_deviceid_' + specID;
		experimentID = 'experiments_expid_' + specID;
	});

	describe("#validate", function() {
		var failingCases = [
			{
				config: {
					"no_groups_property": { v: 1,  t: 1, "not": "empty"}
				},
				expectedError: "missing a `groups` property"
			},
			{
				config: {
					"no_groups_members": { v: 4, t: 2, groups: [] }
				},
				expectedError: "`groups` has no members"
			},
			{
				config: {
					"no_value_property": {
						v: 2,
						t: 1,
						groups: [
							{ not_value: 1, weight: 10 }
						]
					}
				},
				expectedError: "missing a `value` property"
			},
			{
				config: {
					"no_weight_property": {
						v: 9,
						t: 2,
						groups: [
							{ value: 1, not_weight: 10 }
						]
					}
				},
				expectedError: "missing a `weight` property"
			},
			{
				config: {
					"negative_weight": {
						v: 1,
						t: 3,
						groups: [
							{ value: 1, weight: -1 }
						]
					}
				},
				expectedError: "has a negative weight"
			},
			{
				config: {
					"non-integer_weight": {
						v: 3,
						t: 1,
						groups: [
							{ value: 1, weight: 0.3 }
						]
					}
				},
				expectedError: "has a non-integer weight"
			},
			{
				config: {
					"valid-group": {
						v: 4,
						groups: [
							{ value: 1, weight: 3 }
						]
					}
				},
				expectedError: "missing a `t` property"
			},
			{
				config: {
					"valid-group": {
						v: 3,
						t: 4,
						groups: [
							{ value: 1, weight: 3 }
						]
					}
				},
				expectedError: "undefined experiment type"
			}
		];

		failingCases.forEach(function(testCase) {
			var experimentName = Object.keys(testCase.config)[0];

			it("should return an error when " + experimentName, function() {
				var error = experiments.validate(testCase.config);

				expect(error.message).toContain(testCase.expectedError);
			});
		});

		var passingCases = [
			{
				// empty
			},
			{
				one_treatment: {
					v: 5,
					t: 1,
					groups: [
						{ value: 1, weight: 3 }
					]
				}
			},
			{
				disabled_treatment: {
					v: 1,
					t: 1,
					groups: [
						{ value: 1, weight: 0 },
						{ value: 2, weight: 1 }
					]
				}
			},
			{
				string_value: {
					v: 2,
					t: 3,
					groups: [
						{ value: "one", weight: 1 },
						{ value: "two", weight: 1 }
					]
				}
			},
			{
				boolean_value: {
					v: 3,
					t: 2,
					groups: [
						{ value: true,  weight: 1 },
						{ value: false, weight: 1 }
					]
				}
			}
		];

		passingCases.forEach(function(testCase) {
			var experimentName = Object.keys(testCase)[0];

			it("should successfully validate experiments with " + experimentName, function() {
				var error = experiments.validate(testCase);

				expect(error).toBe(null);
			});
		});
	});

	describe("#selectTreatment", function() {
		it("should select a treatment from the set of configured treatments", function() {
			var experiment = {
				groups: [
					{ value: "1", weight: 1 },
					{ value: "2", weight: 1 },
					{ value: "3", weight: 1 }
				]
			};

			var result = experiments.selectTreatment(experimentID, experiment, deviceID);

			expect(result).toBeOneOf(["1", "2", "3"]);
		});

		it("should give a reasonably uniform distribution of selections", function() {
			var trials           = 10000;
			var tolerance        = 0.05;
			var experimentConfig = {
				groups: [
					{ value: "0", weight: 1 },
					{ value: "1", weight: 3 },
					{ value: "2", weight: 5 },
					{ value: "3", weight: 7 }
				]
			};
			var results = [0, 0, 0, 0];
			for (var i = 0; i < trials; i++) {
				var assignment = experiments.selectTreatment(
					experimentID,
					experimentConfig,
					"device_" + i
				);
				// use the assignment as the index to increment
				results[parseInt(assignment, 10)]++;
			}

			var totalWeight = experimentConfig.groups.reduce(function(sum, treatment) {
				return sum + treatment.weight;
			}, 0);
			for (var i = 0; i < experimentConfig.groups.length; i++) {
				var actual   = (results[i] / trials);
				var expected = (experimentConfig.groups[i].weight / totalWeight);
				var residual = (actual - expected);
				expect(Math.abs(residual)).toBeLessThan(tolerance);
			}
		});

		it("smoothly increases and decreases feature use rather than randomly redistributing", function() {
			var experiment = {
				groups: [
					{ value: "1", weight: 15 },
					{ value: "2", weight: 85 }
				]
			};

			// For this test we want to prove the selection is deterministic so we use
			// static values for experiment and device id.
			var treatmentValue = experiments.selectTreatment('exp-id', experiment, 'device-id');

			// It just happens that this user is in this group based on the inputs.
			expect(treatmentValue).toBe("1");

			// One small decrease in value 1 weight and the user is no longer in the group.
			experiment.groups = [
				{ value: "1", weight: 14 },
				{ value: "2", weight: 86 }
			];

			treatmentValue = experiments.selectTreatment('exp-id', experiment, 'device-id');

			expect(treatmentValue).toBe("2");

			// Increasing the weight of value 1 will always keep the user in group 1.
			experiment.groups = [
				{ value: "1", weight: 16 },
				{ value: "2", weight: 84 }
			];

			treatmentValue = experiments.selectTreatment('exp-id', experiment, 'device-id');

			expect(treatmentValue).toBe("1");
		});

		it("might change assignments when shuffle id changes", function() {
			var experiment = {
				groups: [
					{ value: "1", weight: 1 },
					{ value: "2", weight: 1 }
				]
			};

			// If salt is not selected...
			var treatmentValue = experiments.selectTreatment('exp-id', experiment, 'device-id');
			// It just happens that this user is in this group based on the inputs.
			expect(treatmentValue).toBe("1");

			// If we add a salt,
			experiment.s = 1
			treatmentValue = experiments.selectTreatment('exp-id', experiment, 'device-id');
			// We might get a different treatment (not always as it is a random shuffle, but in this case it is)
			expect(treatmentValue).toBe("2");

			// If we shuffle again...
			experiment.s = 2
			treatmentValue = experiments.selectTreatment('exp-id', experiment, 'device-id');
			// we might get another value that we've already seen - which is okay!
			expect(treatmentValue).toBe("1");

			// If we shuffle again...
			experiment.s = 3
			treatmentValue = experiments.selectTreatment('exp-id', experiment, 'device-id');
			// we might get the same value twice in a row - which is also okay!
			expect(treatmentValue).toBe("1");
		});
	});
});
