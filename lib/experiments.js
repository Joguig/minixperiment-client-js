var SHA1 = require('../bower_components/crypto-js/sha1');

/**
 * Error representing invalid experiment configurations
 * @class
 * @private
 *
 * @param {String} name
 *        Name of the experiment
 * @param {*} config
 *        Invalid configuration for an experiment
 * @param {String} message
 *        Detailed message of the invalid component of the configuration
 */
function InvalidExperimentConfigurationError(name, config, message) {
	this.name    = 'InvalidExperimentConfigurationError';
	this.message = "Invalid configuration for experiment \"" + name + "\": " + message;
	this.stack   = (new Error()).stack;
}

/**
 * Verifies that the argument conforms to the experimental configuration
 * structure. Experiment configurations should contain the following structure:
 *
 * {
 *   groups: [
 *     {
 *       value: "some string",
 *       weight: 5
 *     }
 *   ]
 * }
 *
 * where groups may have any string in the `value` field, and any non-negative
 * integer weight
 * @private
 *
 * @param {String} name
 *        Name of experiment
 * @param {Object} config
 *        Configuration for experiment
 * @return {?Error}
 */
function validateExperimentalConfiguration(name, config) {
	if (!config.hasOwnProperty('t')) {
		return new InvalidExperimentConfigurationError(
			name,
			config,
			"missing a `t` property for experiment type"
		);
	}
	if (config.t != 1 && config.t != 2  && config.t != 3 ) {
		return new InvalidExperimentConfigurationError(
			name,
			config,
			"undefined experiment type"
		);
	}


	if (!config.hasOwnProperty('groups')) {
		return new InvalidExperimentConfigurationError(
			name,
			config,
			"missing a `groups` property"
		);
	}

	if (config.groups.length === 0) {
		return new InvalidExperimentConfigurationError(
			name,
			config,
			"`groups` has no members"
		);
	}

	var i, groupError;

	for (i = 0; i < config.groups.length; i++) {
		if (!config.groups[i].hasOwnProperty('value')) {
			groupError = "is missing a `value` property";
		} else if (!config.groups[i].hasOwnProperty('weight')) {
			groupError = "is missing a `weight` property";
		} else if (config.groups[i].weight !== Math.floor(config.groups[i].weight)) {
			groupError = "has a non-integer weight";
		} else if (config.groups[i].weight < 0) {
			groupError = "has a negative weight";
		}

		if (groupError) {
			return new InvalidExperimentConfigurationError(
				name,
				config,
				"Group " + (config.groups[i].value) + " " + groupError
			);
		}
	}

	return null;
}

/**
 * Validate an experimental config; returns `null` or an error, if the provided
 * configuration is not valid.
 *
 * @param {Object<String, ExperimentalConfig>} config
 * @return {?Error}
 */
exports.validate = function(config) {
	for (var experimentUUID in config) {
		if (!config.hasOwnProperty(experimentUUID)) {
			continue;
		}
		var configError = validateExperimentalConfiguration(
			experimentUUID,
			config[experimentUUID]
		);
		if (configError !== null) {
			return configError;
		}
	}

	return null;
}

/**
 * Select a treatment from a specific experimental configuration
 *
 * @param {String} experimentUUID
 * @param {ExperimentalConfig} config
 * @param {String} treatmentID
 * @return {String}
 */
exports.selectTreatment = function(experimentUUID, config, treatmentID) {
	var rng_seed;
	if (config.s) {
		rng_seed = experimentUUID + treatmentID + config.s
	} else {
		rng_seed = experimentUUID + treatmentID
	}
	var hashed_seed = SHA1(rng_seed);
	// CryptoJS gives back a hash object, with a WordArray that contains bytes.
	// The described algorithm takes the first 8 bytes and parses them as
	// hexadecimal; this is equivalent to the first word in the returned hash.
	var rand_int   = hashed_seed.words[0] >>> 0;
	var rand_float = rand_int / Math.pow(2, 32);

	// TODO implement according to Spencer's suggestion, when available
	var total = config.groups.reduce(function(sum, treatment) {
		return sum + treatment.weight;
	}, 0);
	return config.groups.reduce(function(data, treatment) {
		if (data.value === null) {
			data.current -= (treatment.weight / total);
			if (data.current <= 0) {
				data.value = treatment.value
			}
		}

		return data;
	}, {
		value:   null,
		current: rand_float
	}).value;
}
