/*global module*/
module.controller('PanelCtrl', ['$scope', '$filter', '$window', 'ProxyService', 'MimeTypesService', 'focus', 
	function ($scope, $filter, $window, ProxyService, MimeTypesService, focus) {

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
		if (request.error) { return; }

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
		var url = request.url;

		for (var i = 0; i < $scope.proxyRules.length; i++) {
			if ($scope.proxyRules[i].url === url) {
				$scope.proxyRules.splice(i, 1);
				break;
			}
		}

		localStorage.setItem('rules', JSON.stringify($scope.proxyRules));
		ProxyService.updateRules($scope.proxyRules);
	};

	function onRequestFinished(e) {
		var request = {
			url: e.request.url,
			requestEvent: e
		};

		if (e.response._error) {
			request.error = e.response._error;
		} else {
		}

		for (var i = 0; i < e.response.headers.length; i++) {
			if (e.response.headers[i].name.toLowerCase() === 'via' && e.response.headers[i].value.indexOf('tamper') > -1) {
				request.isModified = true;
				break;
			}
		}

		$scope.requests.push(request);
		console.log(request);
		$scope.$digest();
	}

	function onNavigated(e) {
		$scope.requests = [];
	}

	chrome.devtools.network.onRequestFinished.addListener(onRequestFinished);
	chrome.devtools.network.onNavigated.addListener(onNavigated);

	/****************************/
	/******** SPLIT VIEW ********/
	/****************************/

	var initX;

	$scope.onResizeMouseMove = function (e) {
		$scope.sidebarWidth = Math.min(Math.max(e.pageX - initX, 20), $window.innerWidth - 20);
		$scope.$digest();
	};

	$scope.onResizeMouseUp = function (e) {
		$scope.isResizing = false;
		$window.removeEventListener('mousemove', $scope.onResizeMouseMove);
		$window.removeEventListener('mouseup', $scope.onResizeMouseUp);
		localStorage.setItem('sidebarWidth', $scope.sidebarWidth);
		$scope.$digest();
	};

	$scope.onResizeMouseDown = function (e) {
		initX = e.offsetX;
		$scope.isResizing = true;
		$window.addEventListener('mousemove', $scope.onResizeMouseMove);
		$window.addEventListener('mouseup', $scope.onResizeMouseUp);
	};

	if (localStorage.getItem('sidebarWidth')) {
		$scope.sidebarWidth = localStorage.getItem('sidebarWidth');
	} else {
		$scope.sidebarWidth = 170;
	}

	/****************************/
	/********* SETTINGS *********/
	/****************************/

	$scope.onRestoreDefaults = function () {
		$scope.settings.editorCommandLine = localStorage.getItem('default.editorCommandLine');
		$scope.settings.pacScript = localStorage.getItem('default.pacScript');
		$scope.settings.proxyPort = localStorage.getItem('default.proxyPort');
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
	
	$scope.saveSettings = function () {
		localStorage.setItem('editorCommandLine', $scope.settings.editorCommandLine);
		localStorage.setItem('pacScript', $scope.settings.pacScript);
		localStorage.setItem('proxyPort', $scope.settings.proxyPort);
	};

	$scope.showSettings = function () {
		$scope.isShowingSettings = true;

		$scope.loadSettings();
		$scope.$watch('settings', function() {
			$scope.saveSettings();
			ProxyService.bgPort.postMessage({
				method: 'update-settings'
			});
		}, true);
	};

	$scope.closeSettings = function () {
		$scope.isShowingSettings = false;
		$scope.saveSettings();
	};

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
				$scope.showSettings();
			}
		} else if ((e.metaKey || e.ctrlKey) && e.keyCode === 70) {
			focus('focusFilter');
			e.stopPropagation();
			e.preventDefault();
		} else if (e.keyCode === 27) {
			$scope.requestFilter = null;
			$scope.closeSettings();
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

	var mitmproxyExtensionVersion = localStorage.getItem('mitmproxyExtensionVersion');
	if (mitmproxyExtensionVersion) {
		mitmproxyExtensionVersion = mitmproxyExtensionVersion.split('.');
		var chromeExtensionVersion = chrome.runtime.getManifest().version.split('.');

		if (mitmproxyExtensionVersion[0] !== chromeExtensionVersion[0] || 
			mitmproxyExtensionVersion[1] !== chromeExtensionVersion[1]) {
			$scope.updateAvailable = true;
		}
	}

	if ($window.navigator.appVersion.match(/OS X/)) {
		$scope.isOSX = true;
	} else if ($window.navigator.appVersion.match(/win/i)) {
		$scope.isWindows = true;
	}
}]);
