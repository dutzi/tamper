/*global Q*/

var PROXY_NOT_CONNECTED = 'not connected';
var PROXY_COULD_NOT_START = 'could not start';
var PROXY_STARTED = 'proxy started';
var PROXY_CONNECTED = 'proxy connected';
var PROXY_DISCONNECTED = 'proxy disconnected';

var requestsContainer = document.getElementById('requestsContainer');
var rulesContainer = document.getElementById('rulesList');
var requests = [];
var proxyRules = [];
var bgPort;
var isProxyEnabled = true;
var proxyState;
var $body = document.querySelector('body');
var $filter = document.querySelector('#txtFilter');

/****************************/
/********** UTILS ***********/
/****************************/

var Utils = {
	addClassName: function (element, className) {
		if (element.className.indexOf(className) === -1) {
			element.className += ' ' + className;
		}
	},

	hasClassName: function (element, className) {
		return element.className && element.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
	},

	removeClassName: function (element, className) {
		//TODO fix this stupid regexp that doesn't actually work
		element.className = element.className.replace(new RegExp('\\b\\s*' + className + '\\b', 'g'),'');
	},
	log: function (data) {
		// var divLog = document.createElement('div');
		// divLog.className = 'log-item';
		// divLog.innerText = data;
		// requestsContainer.appendChild(divLog);
	},
	getFilename: function (url) {
		var ret = url.substr(url.lastIndexOf('/') + 1);
		if (ret === '') {
			var splitName = url.split('/');
			if (splitName.length === 4) {
				return splitName[splitName.length - 2];
			} else {
				return splitName[splitName.length - 2] + '/';
			}
		} else {
			return ret;
		}

	},
	getPath: function (url) {
		return url.substring(url.indexOf('//') + 2, url.lastIndexOf('/'));
	}
};

/****************************/
/******** PROXY API *********/
/****************************/

var proxy = {
	postMessage: function (message) {
		var deferred = Q.defer();
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
	},
	cacheResponse: function (filename, content) {
		return proxy.postMessage({
			method: 'cache-response',
			filename: filename,
			responseContent: content
		});
	},
	updateRules: function (rules) {
		return proxy.postMessage({
			method: 'update-rules',
			rules: rules
		});
	},
	openFile: function (filename) {
		return proxy.postMessage({
			method: 'open-file',
			filename: filename
		});
	},
	restartProxy: function () {
		return proxy.postMessage({
			method: 'start-proxy',
			port: localStorage.getItem('proxyPort')
		});
	}
};

/****************************/
/********* TOOLBAR **********/
/****************************/

function onProxyStateChanged() {
	if (proxyState !== PROXY_STARTED) {
		Utils.addClassName($body, 'proxy-connection-error');
	}  else {
		Utils.removeClassName($body, 'proxy-connection-error');
	}

	if (isProxyEnabled) {
		Utils.addClassName($body, 'proxy-enabled');
	} else {
		Utils.removeClassName($body, 'proxy-enabled');
	}
}

function onToggleProxy(e) {
	isProxyEnabled = !isProxyEnabled;
	onProxyStateChanged();
	chrome.runtime.sendMessage(chrome.runtime.id, {'method': 'toggle-proxy', 'isEnabled': isProxyEnabled});
}

function onFilterChange(e) {
	var filter = document.querySelector('#txtFilter').value;
	var numDisplayed = 0;
	for (var i = 0; i < requests.length; i++) {
		if (filter === '') {
			requests[i].div.style.display = 'initial';
			requests[i].div.style.background = null;
		} else if (requests[i].request.request.url.indexOf(filter) > -1) {
			requests[i].div.style.display = 'initial';
			if (numDisplayed++ % 2 === 0) {
				requests[i].div.style.background = '#eee';
			} else {
				requests[i].div.style.background = 'white';
			}
		} else {
			requests[i].div.style.display = 'none';
		}
	}
}

document.querySelector('.toggle-proxy').addEventListener('click', onToggleProxy);
document.querySelector('#txtFilter').addEventListener('keyup', onFilterChange);

// setTimeout(function () {
// 	document.querySelector('#txtFilter').focus();
// }, 10);

/****************************/
/******** SPLIT VIEW ********/
/****************************/

var initX;
var splitViewResize = document.querySelector('.split-view-resizer');
var sidebar = document.querySelector('#sidebar');

function onResizeMouseMove(e) {
	var width = Math.min(Math.max(e.pageX - initX, 20), window.innerWidth - 20);
	splitViewResize.style.left = width + 'px';
	sidebar.style.width = width + 'px';

}

function onResizeMouseUp(e) {
	Utils.removeClassName($body, 'resizing');
	$body.removeEventListener('mousemove', onResizeMouseMove);
	$body.removeEventListener('mouseup', onResizeMouseUp);
	localStorage.setItem('sidebarWidth', sidebar.style.width);
}

function onResizeMouseDown(e) {
	initX = e.offsetX;
	Utils.addClassName($body, 'resizing');
	$body.addEventListener('mousemove', onResizeMouseMove);
	$body.addEventListener('mouseup', onResizeMouseUp);
}

splitViewResize.addEventListener('mousedown', onResizeMouseDown);

if (localStorage.getItem('sidebarWidth')) {
	splitViewResize.style.left = sidebar.style.width = localStorage.getItem('sidebarWidth');
}

/****************************/
/******** RULES LIST ********/
/****************************/

function onToggleRuleEnable(e) {
	var rule = proxyRules[e.currentTarget.parentNode.parentNode.id.substr(5)];
	rule.isEnabled = e.currentTarget.checked;

	localStorage.setItem('rules', JSON.stringify(proxyRules));
	proxy.updateRules(proxyRules);
}

function updateRulesListView() {
	rulesContainer.innerHTML = '';

	for (var i = 0; i < proxyRules.length; i++) {
		var currentRule = proxyRules[i];
		var listItem = document.getElementById('rulesListItem').cloneNode(true);

		listItem.id = 'rule-' + i;
		listItem.title = currentRule.url;
		listItem.querySelector('.sidebar-list-item-checkbox input').checked = currentRule.isEnabled;
		listItem.querySelector('.sidebar-list-item-checkbox input').addEventListener('change', onToggleRuleEnable);
		listItem.querySelector('.sidebar-list-item-title').innerText = Utils.getFilename(currentRule.url);
		listItem.querySelector('.sidebar-list-item-subtitle').innerText = Utils.getPath(currentRule.url);


		rulesContainer.appendChild(listItem);
	}
}

/****************************/
/****** NETWORK PANEL *******/
/****************************/

function onQuickEditClick(e) {
	var target = e.currentTarget.parentNode;
	if (!Utils.hasClassName(target, 'request-item')) { 
		target = target.parentNode;
	}
	var request = requests[target.id.substr(4)].request;
	var url = target.querySelector('.request-item-url').innerText;

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
	for (var i = 0; i < proxyRules.length; i++) {
		if (proxyRules[i].url === url) {
			ruleExists = true;
			rule = proxyRules[i];
			break;
		}
	}

	if (ruleExists) {
		proxy.openFile(rule.cachedFilename);
	} else {
		Utils.addClassName(target, 'request-item-loading');
		request.getContent(function (content, encoding) {
			Utils.removeClassName(target, 'request-item-loading');
			Utils.addClassName(target, 'request-item-loaded');

			// TODO guess file ext by Content-Type
			var filename = Utils.getFilename(url);
			if (filename.indexOf('?') > -1) {
				filename = filename.substr(0, filename.indexOf('?'));
			}

			proxy.cacheResponse(filename, content).then(function (response) {
				proxy.openFile(response.cachedFilename);
				proxyRules.push({
					url: url,
					responseHeaders: request.response.headers,
					cachedFilename: response.cachedFilename,
					isEnabled: true
				});
				localStorage.setItem('rules', JSON.stringify(proxyRules));
				proxy.updateRules(proxyRules);
				updateRulesListView();
			});
		});
	}
}

function onDiscardChangesClick(e) {
	var target = e.currentTarget.parentNode.parentNode;

	Utils.addClassName(target, 'request-item-removed');
	var url = target.querySelector('.request-item-url').innerText;

	for (var i = 0; i < proxyRules.length; i++) {
		if (proxyRules[i].url === url) {
			proxyRules.splice(i, 1);
			break;
		}
	}

	localStorage.setItem('rules', JSON.stringify(proxyRules));
	proxy.updateRules(proxyRules);
	updateRulesListView();
}

function onRequestFinished(e) {
	var listItem = document.getElementById('requestItem').cloneNode(true);
	var url = e.request.url;
	var path = Utils.getFilename(url);
	//if path is empty, set it to the subtring of url's previous encounter with /
	//so that: 
	//		http://www.google.com/ -> www.google.com
	//		http://www.google.com/folder/ -> folder/ (for folders add the last slash)
	var requestText = path.replace(/-/g, '&#8209;');

	listItem.id = 'req-' + (requests.length);
	listItem.title = url;
	listItem.querySelector('a').innerHTML = requestText;
	listItem.querySelector('a').href = e.request.url;
	listItem.querySelector('a').addEventListener('click', function (e) { e.preventDefault(); });
	listItem.querySelector('a').addEventListener('click', onQuickEditClick);
	listItem.querySelector('.request-item-discard-changes').addEventListener('click', onDiscardChangesClick);
	listItem.querySelector('.request-item-url').innerText = e.request.url;

	for (var i = 0; i < e.response.headers.length; i++) {
		if (e.response.headers[i].name.toLowerCase() === 'via' && e.response.headers[i].value.indexOf('chrome-proxy') > -1) {
			Utils.addClassName(listItem, 'request-item-modified');
			break;
		}
	}

	requests.push({request: e, div: listItem});
	requestsContainer.appendChild(listItem);
}

function onNavigated(e) {
	requests = [];
	requestsContainer.innerHTML = '';
}

chrome.devtools.network.onRequestFinished.addListener(onRequestFinished);
chrome.devtools.network.onNavigated.addListener(onNavigated);

/****************************/
/********* SETTINGS *********/
/****************************/

var $settings = document.querySelector('#settings');

function populateSettingsScreen() {
	document.querySelector('#txtEditorCommand').value = localStorage.getItem('editorCommandLine');
	document.querySelector('#txtPACFile').value = localStorage.getItem('pacScript');
	document.querySelector('#txtProxyPort').value = localStorage.getItem('proxyPort');
}

function saveSettings() {
	localStorage.setItem('editorCommandLine', document.querySelector('#txtEditorCommand').value);
	localStorage.setItem('pacScript', document.querySelector('#txtPACFile').value);
	localStorage.setItem('proxyPort', document.querySelector('#txtProxyPort').value);
	bgPort.postMessage({
		method: 'update-settings'
	});
}

function saveAndCloseSettings() {
	saveSettings();
	$settings.style.display = 'none';
}

function showSettings() {
	$settings.style.display = 'initial';
	document.querySelector('.proxy-restarted-notification').style.display = 'none';
	
	populateSettingsScreen();
	function onBodyKeyDown(e) {
		if (e.keyCode === 27) {
			e.preventDefault();
			e.stopPropagation();
			saveAndCloseSettings();
			$body.removeEventListener('keydown', onBodyKeyDown);
		}
	}
	$body.addEventListener('keydown', onBodyKeyDown);
}

document.querySelector('.settings-button').addEventListener('click', function (e) {
	showSettings();
});

document.querySelector('#btnRestoreDefaults').addEventListener('click', function (e) {
	localStorage.setItem('editorCommandLine', localStorage.getItem('default.editorCommandLine'));
	localStorage.setItem('pacScript', localStorage.getItem('default.pacScript'));
	localStorage.setItem('proxyPort', localStorage.getItem('default.proxyPort'));
	populateSettingsScreen();
	saveSettings();
});

document.querySelector('#btnRestartProxy').addEventListener('click', function (e) {
	document.querySelector('.proxy-restarted-notification').style.display = 'none';
	proxy.restartProxy().then(function () {
		document.querySelector('.proxy-restarted-notification').style.display = 'initial';
	});
});

document.querySelector('#txtEditorCommand').addEventListener('keyup', saveSettings);
document.querySelector('#txtPACFile').addEventListener('keyup', saveSettings);
document.querySelector('#txtProxyPort').addEventListener('keyup', saveSettings);
document.querySelector('#settings .close-button').addEventListener('click', saveAndCloseSettings);

/****************************/
/********** RESIZE **********/
/****************************/

function onResize (e) {
	document.getElementById('sidebar').style.height = window.innerHeight + 'px';
}

window.onresize = onResize;
onResize();

/****************************/
/***** BACKGROUND PAGE ******/
/****************************/

bgPort = chrome.runtime.connect({
	name: 'devtools-page'
});

function onBgMessage (message) {
	console.log(message);
	Utils.log(JSON.stringify(message));
	switch (message.method) {
		case 'proxy-state-update':
			isProxyEnabled = message.isProxyEnabled;
			proxyState = message.proxyState;
			onProxyStateChanged();
			break;
		case 'update-rules':
			proxyRules = JSON.parse(localStorage.getItem('rules'));
			updateRulesListView();
			break;
	}
}

bgPort.onMessage.addListener(onBgMessage);

/****************************/
/***** KEYBOARD CONTROL *****/
/****************************/

function onBodyKeyDown(e) {
	if (e.shiftKey && e.keyCode === 191) {
		if (document.activeElement.tagName !== 'input' && document.activeElement.tagName !== 'textarea') {
			showSettings();
		}
	} else if ((e.metaKey || e.ctrlKey) && e.keyCode === 70) {
		$filter.focus();
		e.stopPropagation();
		e.preventDefault();
	} else if (e.keyCode === 27 && document.activeElement === $filter) {
		$filter.value = '';
		onFilterChange();
		e.preventDefault();
		e.stopPropagation();
	}
}
$body.addEventListener('keydown', onBodyKeyDown);


/****************************/
/*********** INIT ***********/
/****************************/

proxyRules = localStorage.getItem('rules');
if (!proxyRules) {
	proxyRules = [];
} else {
	proxyRules = JSON.parse(proxyRules);
}
// proxy.updateRules();

updateRulesListView();
