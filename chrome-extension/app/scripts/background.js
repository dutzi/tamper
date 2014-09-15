/*global alert*/
'use strict';

var nativeMessagingPort;
var EXTENSION_ID = chrome.runtime.id;
var isProxyEnabled;

chrome.tabs.onUpdated.addListener(function (tabId) {
	if (chrome.pageAction) {
		chrome.pageAction.show(tabId);
	}
});

var isConnectedToProxy = true;

/*************************/
/********* PROXY *********/
/*************************/

var config = {
	system: {
		mode: 'system'
	},
	chromeproxy: {
		mode: 'fixed_servers',
		rules: {
			proxyForHttp: {
				host: 'localhost',
				port: 8889
			},
			proxyForHttps: {
				host: 'localhost',
				port: 8889
			},
			bypassList: ['localhost:8001', 'localhost:35729']
		}
	},
	chromeproxyPac: {
		mode: 'pac_script',
		pacScript: {
			data: 'function FindProxyForURL(url, host) {\n' +
			'    if (host == "localhost")\n' +
			'        return "DIRECT";\n' +
			'    return "PROXY localhost:8889";\n' +
			'}'
		}
	}
};

chrome.proxy.settings.set({value: config.system, scope: 'regular'}, function() {});

var openCount = 0;
var ports = [];

function sendMessageToAllPorts(message) {
	for (var i = 0; i < ports.length; i++) {
		ports[i].postMessage(message);
	}
}

function updateProxyConfig() {
	// if (!isProxyEnabled || !openCount) {
	if (!isProxyEnabled || !isConnectedToProxy) {
		chrome.proxy.settings.set({value: config.system, scope: 'regular'}, function() {});
	} else {
		chrome.proxy.settings.set({value: config.chromeproxyPac, scope: 'regular'}, function() {});
	}
	localStorage.setItem('isProxyEnabled', isProxyEnabled);
}

function updateProxyIcon() {
	if (!isConnectedToProxy) {
		chrome.browserAction.setIcon({'path': {'19': 'images/icon_error.png', '38': 'images/icon_error@2x.png'}});
		chrome.browserAction.setTitle({title: 'Error connecting to proxy'});
	} else if (isProxyEnabled) {
		chrome.browserAction.setIcon({'path': {'19': 'images/icon_on.png', '38': 'images/icon_on@2x.png'}});
		chrome.browserAction.setTitle({title: 'Chrome Proxy is enabled'});
	} else {
		chrome.browserAction.setIcon({'path': {'19': 'images/icon_off.png', '38': 'images/icon_off@2x.png'}});
		chrome.browserAction.setTitle({title: 'Chrome Proxy is disabled'});
	}
}

function onProxyStateChange() {
	updateProxyConfig();
	updateProxyIcon();
	sendMessageToAllPorts({method: 'toggle-proxy', 'isEnabled': isProxyEnabled});
}

chrome.runtime.onConnect.addListener(function (port) {
	console.log(port);
	if (port.name === 'devtools-page') {
		openCount++;
		ports.push(port);
		onProxyStateChange();

		port.onDisconnect.addListener(function(port) {
			openCount--;
			ports.splice(ports.indexOf(port), 1);
			onProxyStateChange();
		});

		port.onMessage.addListener(function (message) {
			console.log('posting mesasge to proxy', message);
			nativeMessagingPort.postMessage(message);
		});
	}

	chrome.runtime.sendMessage(EXTENSION_ID, {'method': 'toggle-proxy', 'isEnabled': isProxyEnabled});
});

chrome.runtime.onMessage.addListener(function (message) {
	console.log(message);
	switch (message.method) {
		case 'toggle-proxy':
			isProxyEnabled = message.isEnabled;
			onProxyStateChange();
			break;
	}
});

chrome.browserAction.onClicked.addListener(function () {
	isProxyEnabled = !isProxyEnabled;
	onProxyStateChange();
});

function connectToProxy() {
	console.log('connecting to proxy');
	nativeMessagingPort = chrome.runtime.connectNative('com.dutzi.chromeproxy');

	setTimeout(function () {
		if (nativeMessagingPort) {
			nativeMessagingPort.postMessage({'method': 'hello'});
		}
	}, 100);

	nativeMessagingPort.onMessage.addListener(function(msg) {
		console.log('Got message: ', msg.msg);
		switch (msg.msg.method) {
			case 'log':
				// console.log(msg.msg.message);
				break;
			default:
				sendMessageToAllPorts(msg.msg);
				break;
		}
		isConnectedToProxy = true;
		onProxyStateChange();
	});
	
	nativeMessagingPort.onDisconnect.addListener(function() {
		console.log('Disconnected');
		isConnectedToProxy = false;
		nativeMessagingPort = null;
		onProxyStateChange();
		setTimeout(connectToProxy, 1000);
	});
}

connectToProxy();

isProxyEnabled = localStorage.getItem('isProxyEnabled') === 'true';
onProxyStateChange();
