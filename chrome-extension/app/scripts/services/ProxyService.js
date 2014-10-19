module.factory('ProxyService', ['$q', function ($q) {
	var bgPort = chrome.runtime.connect({
		name: 'devtools-page'
	});

	var postMessage = function (message) {
		var deferred = $q.defer();
		var requestId = Math.floor(Math.random() * 100000000000);

		var onBgPortMessage = function (response) {
			if (response._requestId === requestId) {
				bgPort.onMessage.removeListener(onBgPortMessage);
				delete response._requestId;

				if (response.errorCode) {
					deferred.reject(response);
				} else {
					deferred.resolve(response);
				}
			}
		};
		bgPort.onMessage.addListener(onBgPortMessage);

		message._requestId = requestId;
		bgPort.postMessage(message);

		return deferred.promise;
	};

	return {
		bgPort: bgPort,
		proxyStates: {
			PROXY_NOT_CONNECTED: 'not connected',
			PROXY_COULD_NOT_START_PORT_ERROR: 'could not start port error',
			PROXY_COULD_NOT_START_LIBS_ERROR: 'could not start libs error',
			PROXY_STARTED: 'proxy started',
			PROXY_CONNECTED: 'proxy connected',
			PROXY_DISCONNECTED: 'proxy disconnected'
		},
		cacheResponse: function (filename, content) {
			return postMessage({
				method: 'cache-response',
				filename: filename,
				responseContent: content
			});
		},
		updateRules: function (rules) {
			return postMessage({
				method: 'update-rules',
				rules: rules
			});
		},
		openFile: function (filename) {
			return postMessage({
				method: 'open-file',
				command: localStorage.getItem('editorCommandLine'),
				filename: filename
			});
		},
		openTestFile: function () {
			return postMessage({
				method: 'open-file',
				command: localStorage.getItem('editorCommandLine'),
				testFile: true
			});
		},
		restartProxy: function () {
			return postMessage({
				method: 'start-proxy',
				port: localStorage.getItem('proxyPort')
			});
		}
	};
}]);