var Base64 = require('../../../bower_components/crypto-js/enc-base64');
var Utf8   = require('../../../bower_components/crypto-js/enc-utf8');
var spade  = require('../../../lib/tracking/spade');

beforeEach(function() {
	jasmine.addMatchers({
		toHaveNotifiedDefaultSpade: function(util, customEqualityMatchers) {
			return createMatcher("Spade", spade.DEFAULT_SPADE_URL);
		},
		toHaveNotifiedNonDefaultSpade: function(util, customEqualityMatchers) {
			return createMatcher("Non-Default Spade", "//video-edge-ed6ddc.sjc01.hls.ttvnw.net");
		},
		toHaveNotifiedDefaultSpadeWith: function(util, customEqualityMatchers) {
			return createMatcher("Spade", spade.DEFAULT_SPADE_URL);
		},
		toHaveNotifiedDefaultSpadeSynchronously: function(util, customEqualityMatchers) {
			return createSynchronousCallMatcher("Spade", spade.DEFAULT_SPADE_URL);
		},
	});

	/**
	 * Create a synchronous call matcher for a named tracking service.
	 *
	 * @param {String} name
	 *        Name of the service
	 * @param {String} url
	 *        URL prefix to quality as a matched XHR call
	 * @return {Object}
	 */
	function createSynchronousCallMatcher(name, url) {
		return {
			compare: function(actual, expected) {
				if (!jasmine.isSpy(actual)) {
					throw new Error("Expected a spy, but got " + jasmine.pp(actual) + ".");
				}

				var call       = findCall(actual, url);
				var result     = {};
				result.pass    = call.requestComplete;
				result.message = (
					result.pass
						? "Expected " + jasmine.pp(actual) + " not to have notified " + name + " synchronously."
						: "Expected " + jasmine.pp(actual) + " to have notified " + name + " synchronously."
				);
				return result;
			}
		}
	}

	/**
	 * Create a matcher object for a named tracking service.
	 *
	 * @param {String} name
	 *        Name of the service
	 * @param {String} url
	 *        URL prefix to quality as a matched XHR call
	 * @return {Object}
	 */
	function createMatcher(name, url) {
		return {
			compare: function(actual, expected) {
				if (!jasmine.isSpy(actual)) {
					throw new Error("Expected a spy, but got " + jasmine.pp(actual) + ".");
				}

				var call = findCall(actual, url);
				if (!call) {
					return {
						pass:    false,
						message: "Expected " + jasmine.pp(actual) + " to have notified " + name + "."
					}
				}

				var result = {};
				result.pass    = matchPayload(call, url, expected);
				result.message = (
					result.pass
						? "Expected " + jasmine.pp(actual) + " not to have notified " + name + " with " + jasmine.pp(expected) + "."
						: "Expected " + jasmine.pp(actual) + " to have notified " + name + " with " + jasmine.pp(expected) + "."
				);
				return result;
			}
		}
	}

	/**
	 * Locate the call to the specified service by matching the given URL prefix
	 * against the arguments to the spy.
	 *
	 * @param {jasmine.Spy} spy
	 * @param {String} url
	 * @return {Object}
	 */
	function findCall(spy, url) {
		var call, i;
		for (i = 0; i < spy.calls.count(); i++) {
			call = spy.calls.all()[i];
			if (call.args[0].substring(0, url.length) === url) {
				return call;
			}
		}

		return null;
	}

	/**
	 * Match the payload of a given call to a tracking service against the
	 * expected payload.
	 *
	 * @param {Object} call
	 * @param {String} url
	 * @param {Object?} expected
	 * @return {Boolean}
	 */
	function matchPayload(call, url, expected) {
		var b64data = call.args[1].body.split('=')[1];
		var data = JSON.parse(Utf8.stringify(Base64.parse(decodeURIComponent(b64data))));

		return partialObjectMatch(data, expected);
	}

	/**
	 * Compare objects by keys to verify the actual object contains at least
	 * all of the properties specified by the expected object.
	 *
	 * @param {Object} actual
	 *        The actual object to consider
	 * @param {Object} expected
	 *        The subset of key-value pairs to verify exist in the actual object
	 * @return {Boolean}
	 */
	function partialObjectMatch(actual, expected) {
		for (var prop in expected) {
			if (!partialEquals(actual[prop], expected[prop])) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Compares partial equality of an actual potential-object with the expected
	 * value; if the actual value is an object, compares partial equality as
	 * above, otherwise compares strict equality.
	 *
	 * @param {Object} actual
	 *        The actual object to consider
	 * @param {Object} expected
	 *        The subset of key-value pairs to verify exist in the actual object
	 * @return {Boolean}
	 */
	function partialEquals(actual, expected) {
		switch (typeof actual) {
		case 'object':
			return (actual
					? partialObjectMatch(actual, expected)
					: actual === expected);
		default:
			return actual === expected;
		}
	}
});
