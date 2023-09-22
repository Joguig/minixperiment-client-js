beforeEach(function() {
	jasmine.addMatchers({
		toHaveBeenCalledAtLeastOnceWith: function(util, customEqualityTesters) {

			function findMatch(spy, fn) {
				for (var i = 0; i < spy.calls.count(); i++) {
					var args = spy.calls.argsFor(i);
					if (fn(args)) {
						return true;
					}
				}

				return false;
			}

			return {
				compare: function(actual, expected) {
					if (!jasmine.isSpy(actual)) {
						throw new Error('Expected a spy, but got ' + jasmine.pp(actual) + '.');
					}

					var result     = {};
					result.pass    = findMatch(actual, expected);
					result.message = (
						result.pass ?
							"Expected " + jasmine.pp(actual) + " not to be called with matching args.":
							"Expected " + jasmine.pp(actual) + " to be called with matching args."
					);

					return result;
				}
			};
		}
	});
});
