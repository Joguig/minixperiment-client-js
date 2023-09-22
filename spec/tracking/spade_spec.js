var Base64   = require('../../bower_components/crypto-js/enc-base64');
var Utf8     = require('../../bower_components/crypto-js/enc-utf8');
var ajax     = require('../../lib/ajax');
var spade    = require('../../lib/tracking/spade');

function b64_encode(str) {
	return Base64.stringify(Utf8.parse(str));
}

function b64_decode(b64_str) {
	return Utf8.stringify(Base64.parse(b64_str));
}

describe("Spade", function() {
	beforeEach(function() {
		spyOn(ajax, 'fetch');
	});

	describe("#sendEvent", function() {
		it("should send a base64-encoded version of the data to Spade", function() {
			var eventName = 'experimentBranch';
			var eventData = {
				"experiment_id":    "player_mode",
				"experiment_group": "html5"
			};
			var data = {
				event: eventName,
				properties: eventData
			};

			spade.sendEvent(spade.DEFAULT_SPADE_URL, [data]);

			expect(ajax.fetch).toHaveBeenCalled();

			var host = ajax.fetch.calls.mostRecent().args[0];
			var b64Data = ajax.fetch.calls.mostRecent().args[1].body.split('=')[1];
			expect(host).toBe(spade.DEFAULT_SPADE_URL);
			expect(JSON.parse(b64_decode(decodeURIComponent(b64Data)))).toEqual([{
				"event":      eventName,
				"properties": eventData
			}]);
		});
	});
});
