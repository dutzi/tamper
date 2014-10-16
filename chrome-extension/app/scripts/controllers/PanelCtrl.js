/*global module*/
module.controller('PanelCtrl', ['$scope', '$filter', 'ProxyService', 'MimeTypesService', 'focus', 
	function ($scope, $filter, ProxyService, MimeTypesService, focus) {

	$scope.proxyStates = {
		PROXY_NOT_CONNECTED: 'not connected',
		PROXY_COULD_NOT_START_PORT_ERROR: 'could not start port error',
		PROXY_COULD_NOT_START_LIBS_ERROR: 'could not start libs error',
		PROXY_STARTED: 'proxy started',
		PROXY_CONNECTED: 'proxy connected',
		PROXY_DISCONNECTED: 'proxy disconnected'
	};

	function onBgMessage(message) {
		switch (message.method) {
			case 'proxy-state-update':
				$scope.isProxyEnabled = message.isProxyEnabled;
				$scope.proxyState = message.proxyState;
				$scope.$digest();
				break;
			case 'update-rules':
				$scope.proxyRules = JSON.parse(localStorage.getItem('rules'));
				$scope.$digest();
				break;
		}
	}

	ProxyService.bgPort.onMessage.addListener(onBgMessage);

	/****************************/
	/********* TOOLBAR **********/
	/****************************/

	$scope.onToggleProxy = function(e) {
		$scope.isProxyEnabled = !$scope.isProxyEnabled;
		chrome.runtime.sendMessage(chrome.runtime.id, {'method': 'toggle-proxy', 'isEnabled': $scope.isProxyEnabled});
	};

	/****************************/
	/******** RULES LIST ********/
	/****************************/

	$scope.onDeleteRuleClick = function(rule) {
		$scope.proxyRules.splice($scope.proxyRules.indexOf(rule), 1);
		localStorage.setItem('rules', JSON.stringify($scope.proxyRules));
		ProxyService.updateRules($scope.proxyRules);
	};

	$scope.onToggleRuleEnabled = function(rule) {
		localStorage.setItem('rules', JSON.stringify($scope.proxyRules));
		ProxyService.updateRules($scope.proxyRules);
	};


	/****************************/
	/****** NETWORK PANEL *******/
	/****************************/

	$scope.onQuickEditClick = function(request, e) {
		// var target = e.currentTarget.parentNode;
		// if (!Utils.hasClassName(target, 'request-item')) { 
		// 	target = target.parentNode;
		// }
		// var request = requests[target.id.substr(4)].request;
		// var url = target.querySelector('.request-item-url').innerText;
		var url = request.url;

		if (e.metaKey) {
			if (e.altKey) {
				window.open(url);
			} else {
				window.open('view-source:' + url);
			}
			return;
		}

		var ruleExists = false;
		var rule;
		for (var i = 0; i < $scope.proxyRules.length; i++) {
			if ($scope.proxyRules[i].url === url) {
				ruleExists = true;
				rule = $scope.proxyRules[i];
				break;
			}
		}

		if (ruleExists) {
			ProxyService.openFile(rule.cachedFilename);
		} else {
			request.status = 'loading';
			request.requestEvent.getContent(function (content, encoding) {
				request.status = 'loaded';

				if (content === null) { return; }

				var filename = $filter('getFilename')(url).replace(/\//g, '');
				if (filename.indexOf('?') > -1) {
					filename = filename.substr(0, filename.indexOf('?'));
				}

				var fileExtension;
				for (var i = 0; i < request.requestEvent.response.headers.length; i++) {
					var currentHeader = request.requestEvent.response.headers[i];
					if (currentHeader.name.toLowerCase() === 'content-type') {
						var mimeType = currentHeader.value;
						if (mimeType.indexOf(';') > -1) {
							mimeType = mimeType.substr(0, mimeType.indexOf(';'));
						}
						fileExtension = MimeTypesService.getFileExtension(mimeType);
						break;
					}
				}
				if (fileExtension) {
					if (filename.indexOf(fileExtension) !== filename.length - fileExtension.length) {
						filename += '.' + fileExtension;
					}
				} else {
					filename += '.tamper';
				}

				ProxyService.cacheResponse(filename, content).then(function (response) {
					ProxyService.openFile(response.cachedFilename);
					$scope.proxyRules.push({
						url: url,
						responseHeaders: request.requestEvent.response.headers,
						cachedFilename: response.cachedFilename,
						isEnabled: true
					});
					localStorage.setItem('rules', JSON.stringify($scope.proxyRules));
					ProxyService.updateRules($scope.proxyRules);
					// updateRulesListView();
				});
			});
		}
	};

	$scope.onDiscardChangesClick = function(request, e) {
		// Utils.addClassName(target, 'request-item-removed');
		// var url = target.querySelector('.request-item-url').innerText;
		var url = request.url;

		for (var i = 0; i < $scope.proxyRules.length; i++) {
			if ($scope.proxyRules[i].url === url) {
				$scope.proxyRules.splice(i, 1);
				break;
			}
		}

		localStorage.setItem('rules', JSON.stringify($scope.proxyRules));
		ProxyService.updateRules($scope.proxyRules);
		// updateRulesListView();
	};

	function onRequestFinished(e) {
		var request = {
			url: e.request.url,
			requestEvent: e
		};

		if (e.response._error) {
			// requestText += ' (' + e.response._error + ')';
			// Utils.addClassName(listItem, 'request-item-error');
		} else {
			// listItem.querySelector('a').addEventListener('click', function (e) { e.preventDefault(); });
			// listItem.querySelector('a').addEventListener('click', onQuickEditClick);
			// listItem.querySelector('.request-item-discard-changes').addEventListener('click', onDiscardChangesClick);
		}

		// listItem.id = 'req-' + (requests.length);
		// listItem.title = url;
		// listItem.querySelector('a').innerHTML = requestText;
		// listItem.querySelector('a').href = e.request.url;
		// listItem.querySelector('.request-item-url').innerText = e.request.url;


		for (var i = 0; i < e.response.headers.length; i++) {
			if (e.response.headers[i].name.toLowerCase() === 'via' && e.response.headers[i].value.indexOf('tamper') > -1) {
				request.isModified = true;
				break;
			}
		}

		$scope.requests.push(request);
		console.log(request);
		$scope.$digest();
		// requests.push({request: e, div: listItem});
		// requestsContainer.appendChild(listItem);
	}

	function onNavigated(e) {
		$scope.requests = [];
	}

	chrome.devtools.network.onRequestFinished.addListener(onRequestFinished);
	chrome.devtools.network.onNavigated.addListener(onNavigated);

	/****************************/
	/********* SETTINGS *********/
	/****************************/

	$scope.onRestoreDefaults = function () {
		localStorage.setItem('editorCommandLine', localStorage.getItem('default.editorCommandLine'));
		localStorage.setItem('pacScript', localStorage.getItem('default.pacScript'));
		localStorage.setItem('proxyPort', localStorage.getItem('default.proxyPort'));
		$scope.loadSettings();
		$scope.saveSettings();
	};

	$scope.loadSettings = function () {
		$scope.settings = {
			editorCommandLine: localStorage.getItem('editorCommandLine'),
			pacScript: localStorage.getItem('pacScript'),
			proxyPort: localStorage.getItem('proxyPort'),
			hasProxyRestarted: false
		};
	};
	
	$scope.onShowSettings = function () {
		$scope.loadSettings();
		$scope.$watch('settings', function() {
			$scope.saveSettings();
			ProxyService.bgPort.postMessage({
				method: 'update-settings'
			});
		}, true);
	};

	$scope.saveSettings = function () {
		localStorage.setItem('editorCommandLine', $scope.settings.editorCommandLine);
		localStorage.setItem('pacScript', $scope.settings.pacScript);
		localStorage.setItem('proxyPort', $scope.settings.proxyPort);
	};

	$scope.$watch('showSettings', function (newValue) {
		if (newValue) {
			$scope.onShowSettings();
		} else {
			$scope.saveSettings();
		}
	});

	$scope.onRestartProxy = function () {
		ProxyService.restartProxy().then(function () {
			$scope.settings.hasProxyRestarted = true;
		});
	};

	/****************************/
	/***** KEYBOARD CONTROL *****/
	/****************************/

	$scope.onBodyKeyDown = function(e) {
		if (e.shiftKey && e.keyCode === 191) {
			if (document.activeElement.tagName !== 'input' && document.activeElement.tagName !== 'textarea') {
				$scope.showSettings = true;
			}
		} else if ((e.metaKey || e.ctrlKey) && e.keyCode === 70) {
			focus('focusFilter');
			e.stopPropagation();
			e.preventDefault();
		} else if (e.keyCode === 27) {
			$scope.requestFilter = null;
			$scope.showSettings = false;
			e.preventDefault();
			e.stopPropagation();
		}
	};

	/****************************/
	/*********** INIT ***********/
	/****************************/

	$scope.proxyRules = localStorage.getItem('rules');
	if (!$scope.proxyRules) {
		$scope.proxyRules = [];
	} else {
		$scope.proxyRules = JSON.parse($scope.proxyRules);
	}

	$scope.requests = [];

}]);