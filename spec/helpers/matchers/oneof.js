beforeEach(function() {
	jasmine.addMatchers({
		toBeOneOf: function(util, customEqualityTesters) {
			return {
				compare: function(actual, expected) {
					var result     = {};
					result.pass    = (expected.indexOf(actual) > -1);
					result.message = (
						result.pass ?
							"Expected " + jasmine.pp(actual) + " not to be one of " + expected.join(', ') :
							"Expected " + jasmine.pp(actual) + " to be one of " + expected.join(', ')
					);

					return result;
				}
			};
		}
	});
});
