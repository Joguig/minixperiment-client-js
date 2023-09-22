var experiments = require('./experiments');
var spade       = require('./tracking/spade');

module.exports = MinixperimentClient;

var MAX_BATCH_TIME = 60000;
var DEFAULT_BATCH_TIME = 1000;
var MAX_QUEUE_LENGTH = 50;
var MAX_THROTTLE_TIME = 60000;

/**
 * Create a new Minixperiment client object, from which assignments can be
 * determined.
 * @class
 *
 * @param {Object} config
 *        Configuration object for the library. Valid properties:
 *        `defaults` : an object mapping expected experiment UUIDs to their
 *                     default values, to be returned should an error occur
 *                     somewhere within the library. It is considered an error to
 *                     request an experimental treatment from an experiment
 *                     without a default value.
 *        `deviceID` : the unique ID associated with the device using this library
 *        `login`    : the username of the current user
 *        `overrides`: An object hash of experiment ID to forced assignment,
 *                      which causes the client to ignore any configuration and
 *                      simply return the overridden value. The value may be a
 *                      Promise, which is used if it resolves and is ignored if it
 *                      is rejected.
 *        `platform` : The consumer of this library (e.g. `web`, `xboxone`)
 *        `provider` : a minixperiment-defined Experiments provider
 *        `Promise`  : a Promises/A+-compliant implementation
 *     `batchTimeOut`: A value in ms to batch the spade events for experiment_branch
 *     `throttleTime`: A value in ms to throttle spade events. For a particular experiment - group combination only one
 *                       spade event will be sent `throttleTime` window
 */
function MinixperimentClient(config) {
	var configError = validateConfig(config);
	if (configError !== null) {
		throw configError;
	}

	this._config      = getExperimentsConfiguration(config);
	this._Promise     = config.Promise;
	this._deviceID    = config.deviceID;
	this._platform    = config.platform;
	this._username    = config.login || null;
	this._overrides   = config.overrides || {};
	this._defaults    = determineDefaults(config.Promise, config.defaults, this._overrides);
	this._assignments = determineAssignments(
		config.Promise,
		this._config,
		this._defaults,
		this._overrides,
		this._deviceID,
		this._username
	);
	this._spade_url   = determineSpadeUrl(
		this._config,
		spade.SPADE_URL_PROJECT_UUID
	);
	this._batchTimer = 0;
	this._eventQueue = [];
	this._resolveQueue = [];
	this._batchTimeOut = isNaN(config.batchTimeOut) ? DEFAULT_BATCH_TIME : Math.min(config.batchTimeOut, MAX_BATCH_TIME);
	this._throttleTime = isNaN(config.throttleTime) ? 0 : Math.min(config.throttleTime, MAX_THROTTLE_TIME);
	this._throttleCache = {};
}

/**
 * Get the treatment for a particular named experiment
 *
 * @param {String} experimentUUID
 *        The UUID of the experiment from which the client will draw a treatment
 * @param {Object} options
 *        `mustTrack` [default: false]: if true, then tracking must complete
 *            before the assignment is returned to the caller
 * @return {Promise}
 *         Resolves to the value of the treatment for the given experiment, or
 *         the provided default value in the event of an error
 */
MinixperimentClient.prototype.get = function(experimentUUID, opts) {
	var options = applyDefaults(opts || {}, {
		mustTrack: false,
		channel: null,
		printt: false,
	});

	var chanAssignment = this._Promise.all([this._config, this._assignments[experimentUUID]]).then(
		function(data) {
			var expConfig = data[0];
			var defaultAssignment = data[1];
			// if this is a channel_id experiment and channel is defined, fetch the treatment, if not, return default
			if (expConfig[experimentUUID].t == 3 && options.channel) {
				return experiments.selectTreatment(experimentUUID, expConfig[experimentUUID], options.channel);
			}
			return defaultAssignment
		},
		function(err) {
			console.warn(err)
			return this._defaults[experimentUUID] || null
		}.bind(this)
	).then(function(assignment) {
		// channel experiments must also respect overrides
		return this._Promise.resolve(this._overrides[experimentUUID]).then(function(override) {
			return (typeof override === 'string' ? override : assignment);
		}, function() {
			return assignment;
		});
	}.bind(this));

	var assignment = (chanAssignment || this._Promise.reject(new Error("No experiment with ID `" + experimentUUID + "`")));


	var trackedEvent = this._Promise.all([this._config, assignment, this._spade_url]).then(function(data) {
		var expConfig = data[0];
		var treatment = data[1];
		var spadeUrl = data[2];

		if (this._throttleTime > 0) { // See if tracking was already fired within the last throttleTime ms
			var cachedTimeStamp = this._throttleCache[experimentUUID + '_' + treatment];
			if (Date.now() < (cachedTimeStamp * 1000) + this._throttleTime) {
				return Promise.resolve();
			}
		}

		// only track assignments that are valid
		var trackingProperties = {
			// epoch time of the event, in seconds
			"client_time":      (new Date()).getTime() / 1000,
			// user's unique device ID
			"device_id":        this._deviceID,
			// experiment identifier
			"experiment_id":    experimentUUID,
			// which group the user was assigned to
			"experiment_group": treatment,
			// the platform from which this experiment was experienced
			"platform":         this._platform,
			// experiment version used
			"experiment_version": 0,
		};

		if(this._throttleTime > 0) { // cache the client_time for experiment if throttling is on
			this._throttleCache[experimentUUID + '_' + treatment] = trackingProperties['client_time'];
		}

		// if not a deprecated experiment
		if (expConfig[experimentUUID]) {
			trackingProperties.experiment_name = expConfig[experimentUUID].name
			trackingProperties.experiment_version = expConfig[experimentUUID].v

			switch(expConfig[experimentUUID].t) {
				case 1:
					trackingProperties.experiment_type = "device_id";
					break;
				case 2:
					trackingProperties.experiment_type = "user_id";
					break;
				case 3:
					trackingProperties.experiment_type = "channel_id";
			}
		}

		if (this._username !== null) {
			// the user's username, if logged in
			trackingProperties.login = this._username;
		}
		if (options.channel !== null) {
			// the channel the user's on, if provided
			trackingProperties.channel = options.channel;
		}

		var spadePromise;
		if (options.mustTrack || this._batchTimeOut === 0) {
			spadePromise = new this._Promise(function(resolve, _) {
				if(options.printt) console.log(trackingProperties)
				spade.sendEvent(spadeUrl, [{
					event: 'experiment_branch',
					properties: trackingProperties
				}], resolve);
				}).then(null, function() { return null; });
		} else {
			spadePromise = new this._Promise(function(resolve, _) {
				if(options.printt) console.log(trackingProperties)

				this._eventQueue.push({
					event: 'experiment_branch',
					properties: trackingProperties
				});
				this._resolveQueue.push(resolve);

				if (this._eventQueue.length >= MAX_QUEUE_LENGTH) { // Queue grown over 50, send all immediately
					clearTimeout(this._batchTimer);
					this._batchTimer = 0;
					this._sendQueuedEvents(spadeUrl, this._eventQueue, this._resolveQueue);
					this._eventQueue = [];
					this._resolveQueue = [];
					return;
				}

				if (this._batchTimer) {
					return;
				}

				this._batchTimer = setTimeout(function() {
					this._batchTimer = 0;
					this._sendQueuedEvents(spadeUrl, this._eventQueue, this._resolveQueue);
					this._eventQueue = [];
					this._resolveQueue = [];
				}.bind(this), this._batchTimeOut);
			}.bind(this)).then(null, function() { return null; });
		}

		return spadePromise;
	}.bind(this));

	return this._Promise.all([assignment, options.mustTrack ? trackedEvent : null]).then(
		function(data) {
			return data[0];
		},
		function(err) {
			console.warn(err);
			return this._defaults[experimentUUID] || null;
		}.bind(this)
	);
};

MinixperimentClient.prototype._sendQueuedEvents = function(spadeUrl, eventQueue, resolveQueue) {
	spade.sendEvent(spadeUrl, eventQueue, function() {
		resolveQueue.forEach(function(element) {
			element();
		});
	}.bind(this));
};

/**
 * Validate the Minixperiment client configuration, returning an error if there
 * are any issues, or `null` for "OK".
 *
 * @param {Object} config
 * @return {Error?}
 */
function validateConfig(config) {
	if (!config.defaults || Object.getPrototypeOf(config.defaults) !== Object.prototype) {
		return new Error("Invalid defaults; expected object, got " + JSON.stringify(config.defaults));
	} else if (typeof config.deviceID !== 'string' || config.deviceID.length === 0) {
		return new Error("Invalid device ID; expected non-empty string, got `" + config.deviceID + "`");
	} else if (typeof config.platform !== 'string' || config.platform.length === 0) {
		return new Error("Invalid platform; expected non-empty string, got `" + config.platform + "`");
	} else if (
		typeof config.provider !== 'object' ||
		typeof config.provider.getExperimentConfiguration !== 'function'
	) {
		return new Error("Invalid provider");
	} else if (typeof config.Promise !== 'function') {
		return new Error("Invalid Promise implementation");
	}

	return null;
}

function getExperimentsConfiguration(config) {
	return new config.Promise(function(resolve, reject) {
		config.provider.getExperimentConfiguration(resolve, reject);
	}).then(function(experimentConfig) {
		var error = experiments.validate(experimentConfig);
		if (error) {
			throw error;
		}

		return experimentConfig;
	});
}

/**
 * Combine overrides with the defaults to generate the actual set of defaults
 * used when an issue is encountered.
 *
 * @param {*} _Promise The Promises/A+ implementation object
 * @param {Object<String, String>} defaults
 * @param {Object<String, (String|Promise<String>)>} overrides
 * @return {Object<String, Promise<String>>}
 */
function determineDefaults(_Promise, defaults, overrides) {
	var actualDefaults = {};

	for (var uuid in defaults) {
		actualDefaults[uuid] = (function(expID) {
			return _Promise.resolve(overrides[uuid]).then(
				function(override) {
					// possibly an undefined override; ensure a valid value is given
					return (typeof override === 'string' ? override : defaults[expID]);
				},
				function() {
					return defaults[expID];
				}
			);
		})(uuid);
	}

	return actualDefaults;
}

/**
 * Translate the experiment configuration and client configuration into a set of
 * experiment treatment assignments. This is resolved during client instantiation,
 * which prevents any reconfiguration after the client is running.
 *
 * @param {*} _Promise The Promises/A+ implementation object
 * @param {Promise<Object<UUID, ExperimentConfig>>} experimentConfig
 * @param {Object<UUID, String>} defaults
 * @param {Object<UUID, (String|Promise<String>)>} overrides
 * @param {String} deviceID
 * @param {String} username
 * @return {Object<UUID, Promise<String>>}
 */
function determineAssignments(_Promise, experimentConfig, defaults, overrides, deviceID, username) {
	var assignments = {};

	for (var uuid in defaults) {
		if (!defaults.hasOwnProperty(uuid)) {
			continue;
		}
		assignments[uuid] = (function(expID) {
			return experimentConfig.then(
				function(cfg) {
					if (!cfg.hasOwnProperty(expID)) {
						throw new Error("Experiment `" + expID + "` is deprecated");
					}

					if (!cfg[expID].t) {
						throw new Error("Experiment `" + expID + "` does not have a type");
					}

					// if user_id experiment and username is defined
					if (cfg[expID].t == 1) {
						return experiments.selectTreatment(expID, cfg[expID], deviceID);
					}
					// if user_id experiment and username is defined
					if (username && cfg[expID].t == 2) {
						return experiments.selectTreatment(expID, cfg[expID], username);
					}

					// use default treatment if:
					// user_id experiment with no username, or
					// channel_id experiment (actual treatment will be generated at query time)
					return defaults[expID];
				},
				function(err) {
					return defaults[expID];
				}
			).then(function(assignment) {
				return _Promise.resolve(overrides[expID]).then(function(override) {
					return (typeof override === 'string' ? override : assignment);
				}, function() {
					return assignment;
				});
			});
		})(uuid);
	}

	return assignments;
}

/**
 * Determine the spade url for reporting events from the experiment configuration
 *
 * @param {Promise<Object<UUID, ExperimentConfig>>} experimentConfig
 * @param {String} The experiment uuid for the spade url project
 * @return {Promise<String>}
 */
function determineSpadeUrl(experimentConfig, spadeExp) {
	return experimentConfig.then(
		function(cfg) {
			if (cfg[spadeExp] && cfg[spadeExp].groups && cfg[spadeExp].groups[0]) {
				return cfg[spadeExp].groups[0].value;
			}
			return "";
		},
		function(err) {
			return "";
		});
}

/**
 * Creates a new object with the properties of the given source object, filling
 * in any missing/non-existent properties with values from the defaults object.
 *
 * @param {Object} src
 * @param {Object} defaults
 * @return {Object}
 */
function applyDefaults(src, defaults) {
	var prop;
	var rv = {};

	for (prop in src) {
		if (src.hasOwnProperty(prop)) {
			rv[prop] = src[prop];
		}
	}

	for (prop in defaults) {
		if (defaults.hasOwnProperty(prop) && !src.hasOwnProperty(prop)) {
			rv[prop] = defaults[prop];
		}
	}

	return rv;
}
