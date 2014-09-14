var EXTENSION_ID = chrome.runtime.id;
var requestsContainer = document.getElementById('requestsContainer');
var rulesContainer = document.getElementById('rulesList');
var urlsDivsWaitingForApproval = {};
var requests = [];
var proxyRules = [];
var ws;
var isProxyEnabled = true;
var body = document.querySelector('body');

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

Utils.log('ChromeProxy');

/****************************/
/********* TOOLBAR **********/
/****************************/

function onProxyStateChanged() {
	if (ws.readyState === 1) {
		Utils.removeClassName(body, 'proxy-connection-error');
	} else {
		Utils.addClassName(body, 'proxy-connection-error');
	}
	if (isProxyEnabled) {
		Utils.addClassName(body, 'proxy-enabled');
	} else {
		Utils.removeClassName(body, 'proxy-enabled');
	}
}

function onToggleProxy(e) {
	isProxyEnabled = !isProxyEnabled;
	onProxyStateChanged();
	chrome.runtime.sendMessage(EXTENSION_ID, {'method': 'toggle-proxy', 'isEnabled': isProxyEnabled});
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
	Utils.removeClassName(body, 'resizing');
	body.removeEventListener('mousemove', onResizeMouseMove);
	body.removeEventListener('mouseup', onResizeMouseUp);
	localStorage.setItem('sidebarWidth', sidebar.style.width);
}

function onResizeMouseDown(e) {
	initX = e.offsetX;
	Utils.addClassName(body, 'resizing');
	body.addEventListener('mousemove', onResizeMouseMove);
	body.addEventListener('mouseup', onResizeMouseUp);
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
	ws.send(JSON.stringify({
		method: 'udpate-rule',
		url: rule.url,
		isEnabled: e.currentTarget.checked
	}));
}

function updateRulesList() {
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

	urlsDivsWaitingForApproval[url] = target;

	var ruleExists = false;
	for (var i = 0; i < proxyRules.length; i++) {
		if (proxyRules[i].url === url) {
			ruleExists = true;
			break;
		}
	}

	if (ruleExists) {
		ws.send(JSON.stringify({
			method: 'add-rule',
			url: url
		}));
	} else {
		Utils.addClassName(target, 'request-item-loading');
		request.getContent(function (content, encoding) {
			if (ws.readyState === 1) {
				ws.send(JSON.stringify({
					method: 'add-rule',
					url: url,
					responseHeaders: request.response.headers,
					responseContent: content
				}));
			}
		});
	}
}

function onDiscardChangesClick(e) {
	var target = e.currentTarget.parentNode.parentNode;

	var url = target.querySelector('.request-item-url').innerText;
	urlsDivsWaitingForApproval[url] = target;
	Utils.addClassName(target, 'request-item-removed');
	if (ws.readyState === 1) {
		ws.send(JSON.stringify({
			method: 'remove-rule',
			url: url
		}));
	}
}

function onRequestFinished(e) {
	// if (e.request.url.indexOf('facebook.com') > -1) {
	// 	console.log(e);
	// 	e.getContent(function (content, encoding) {
	// 		console.log(content);
	// 	});
	// }


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
	console.log(e.response.headers);
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
/********* MITMPROXY ********/
/****************************/

function connectToWebSocket() {
	ws = new WebSocket('ws://localhost:8001');
	var wasConnected = false;
	ws.onopen = function() {
		wasConnected = true;
		Utils.log('Connected to mitmproxy');
		onProxyStateChanged();
		ws.send(JSON.stringify({method: 'noop'}));
	};
	ws.onclose = function() {
		if (wasConnected) {
			Utils.log('Connection to mitmproxy lost!');
		}
		onProxyStateChanged();
		setTimeout(connectToWebSocket, 1000);
	};
	ws.onmessage = function(e) {
		Utils.log('Got message from proxy ' + e.data);
		var message = JSON.parse(e.data);
		switch (message.method) {
			case 'rule-added':
				console.log(urlsDivsWaitingForApproval[message.rule.url]);
				Utils.removeClassName(urlsDivsWaitingForApproval[message.rule.url], 'request-item-loading');
				Utils.addClassName(urlsDivsWaitingForApproval[message.rule.url], 'request-item-loaded');
				delete urlsDivsWaitingForApproval[message.rule.url];

				proxyRules.push(message.rule);
				updateRulesList();
				break;
			case 'rule-removed':
				for (var i = 0; i < proxyRules.length; i++) {
					if (proxyRules[i].url === message.rule.url) {
						proxyRules.splice(i, 1);
						break;
					}
				}
				updateRulesList();
				break;
			case 'rule-list':
				proxyRules = message.rules;
				updateRulesList();
				break;
		}
	};
	ws.onerror = function(e) {
		// log('Error connecting');
	};
}
connectToWebSocket();

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

var backgroundPageConnection = chrome.runtime.connect({
	name: 'devtools-page'
});

backgroundPageConnection.onMessage.addListener(function (message) {
	Utils.log(JSON.stringify(message));
	switch (message.method) {
		case 'toggle-proxy':
			isProxyEnabled = message.isEnabled;
			onProxyStateChanged();
			break;
	}
});
