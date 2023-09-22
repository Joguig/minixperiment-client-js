//var XHR_READYSTATE_UNSENT = 0;
//var XHR_READYSTATE_OPENED = 1;
//var XHR_READYSTATE_HEADERS_RECEIVED = 2;
//var XHR_READYSTATE_LOADING = 3;
var XHR_READYSTATE_DONE = 4;

/**
 * Fetch the contents of the given url.
 *
 * @param {String} url The url to fetch
 * @param {Object} options Configuration options:
 *        `injectScript`: instead of using XMLHttpRequest, use an injected
 *                        script tag.
 * @param {function(Error?, String?):*=} callback Callback invoked with the
 *        response value, unless `injectScript` is true; then it will be invoked
 *        with an error or `null`, depending on the result.
 */
exports.fetch = function(url, options, callback) {
	if (options.injectScript) {
		injectScriptTag(url, callback || function() {});
	} else {
		fetchViaXHR(url, options, callback || function() {});
	}
}

/**
 * Initiates a GET request to a given url by injecting a script tag, effectively
 * bypassing CORS for endpoints that just need to be pinged with a GET request.
 *
 * @param {String} url
 * @param {function(Error?):*} callback
 */
function injectScriptTag(url, callback) {
	var head = document.head || document.getElementsByTagName('head')[0];

	if (!head) {
		callback(new Error("No head element to append script"));
	}

	var scriptTag = document.createElement('script');
	scriptTag.onload = function() {
		callback(null);

		setTimeout(function() {
			head.removeChild(scriptTag);
		}, 0);
	};
	scriptTag.onerror = function() {
		callback(new Error("Unable to load script"));
	};

	head.appendChild(scriptTag);
	scriptTag.src = url;
}

/**
 * Fetches the contents of a given URL by sending out an XMLHttpRequest, calling
 * the provided callback function with the contents when it returns, or an error
 * if the request failed.
 *
 * @param {String} url
 * @param {Object} options
 * @param {function(Error?, String?):*} callback
 */
function fetchViaXHR(url, options, callback) {
	var xhr = new XMLHttpRequest();

	xhr.open(options.method || 'GET', url, true);
	if (options.headers) {
		Object.keys(options.headers).forEach(function(key) {
			xhr.setRequestHeader(key, options.headers[key]);
		});
	}
	xhr.onreadystatechange = function() {
		switch (xhr.readyState) {
		case XHR_READYSTATE_DONE:
			if (200 <= xhr.status && xhr.status < 300) {
				callback(null, xhr.responseText);
			} else {
				callback(new Error("XHR error: " + xhr.status + " " + url), null);
			}
			return;
		}
	};
	xhr.send(options.body);
}
