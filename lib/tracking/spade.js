var Base64 = require('../../bower_components/crypto-js/enc-base64');
var Utf8   = require('../../bower_components/crypto-js/enc-utf8');
var ajax   = require('../ajax');

/**
 * Spade beacon URL
 * @var {String}
 */
exports.DEFAULT_SPADE_URL = '//trowel.twitch.tv/';

/**
 * Spade URL experiment UUID
 * @var {String}
 */
exports.SPADE_URL_PROJECT_UUID = '4badc757-13a7-468c-99b6-e42aef7fc286';

/**
 * Send an event to the Spade service
 *
 * @param {String} event
 * @param {Object} payload
 * @param {Function} callback
 */
exports.sendEvent = function(spadeUrl, payload, callback) {
	var b64Payload = Base64.stringify(Utf8.parse(JSON.stringify(payload)));
	var url = spadeUrl || exports.DEFAULT_SPADE_URL;

	ajax.fetch(url, {
		method: 'post',
		headers: { 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
		body: 'data=' + encodeURIComponent(b64Payload)
		}, callback);
}
