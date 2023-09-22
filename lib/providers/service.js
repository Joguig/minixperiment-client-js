var ajax = require('../ajax');

module.exports = ServiceProvider;

/**
 * Provides the experimental configuration defined by the backend service.
 * @class
 *
 * @param {String} url Location of the experiment configuration
 */
function ServiceProvider(url) {
	this._url = url;
}

/**
 * Defines the location of the Minixperiment backend where most experiments
 * actually live.
 * @const {String}
 */
ServiceProvider.SERVICE_URL = "//www.twitch.tv/experiments.json";

/**
 * Retrieves the experimental configuration from the remote service.
 *
 * @param {function(ExperimentConfig):*} success
 *        Callback function invoked when the configuration is successfully retrieved.
 * @param {function(Error):*} failure
 *        Callback function invoked when an error is encountered while trying to
 *        retrieve the experiment configuration.
 */
ServiceProvider.prototype.getExperimentConfiguration = function(success, failure) {
	ajax.fetch(this._url, {}, function(err, jsonString) {
		if (err !== null) {
			failure(err);
			return;
		}

		try {
			success(JSON.parse(jsonString));
		} catch (e) {
			failure(new Error("Invalid JSON response from server: " + jsonString));
		}
	});
};
