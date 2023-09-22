module.exports = LocalProvider;

/**
 * Provides a consistent API for locally-defined (or otherwise injected from
 * an alternate source) experimental configuration.
 * @class
 *
 * @param {ExperimentsConfig} configuration
 */
function LocalProvider(configuration) {
	this._configuration = configuration;
}

/**
 * Yields the provided experiment configuration when requested.
 *
 * @param {function(ExperimentConfig):*} success
 *        Callback function invoked when the configuration is successfully retrieved.
 * @param {function(Error):*} failure
 *        Callback function invoked when an error is encountered while trying to
 *        retrieve the experiment configuration.
 */
LocalProvider.prototype.getExperimentConfiguration = function(success, failure) {
	success(this._configuration);
};
