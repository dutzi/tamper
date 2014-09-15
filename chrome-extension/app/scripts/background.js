/*global alert*/
'use strict';

var nativeMessagingPort;
var EXTENSION_ID = chrome.runtime.id;
var isProxyEnabled;
var ruleList;

/*************************/
/******** SETTINGS *******/
/*************************/

var settings = {};
var defaultSettings = {
	isProxyEnabled: true,
	pacScript: 	'function FindProxyForURL(url, host) {\n' +
				'    if (host == "localhost")\n' +
				'        return "DIRECT";\n' +
				'    return "PROXY localhost:8889";\n' +
				'}',
	sidebarWidth: '250px'
}
if (window.navigator.appVersion.match(/OS X/)) {
	defaultSettings.editorCommandLine = 'subl $1';
} else if (window.navigator.appVersion.match(/win/i)) {
	defaultSettings.editorCommandLine = null;
}

for (var key in defaultSettings) {
	if (localStorage.getItem(key)) {
		settings[key] = localStorage.getItem(key);
	} else {
		settings[key] = defaultSettings[key];
		localStorage.setItem(key, settings[key]);
	}
	localStorage.setItem('default.' + key, defaultSettings[key]);
}

// chrome.tabs.onUpdated.addListener(function (tabId) {
// 	if (chrome.pageAction) {
// 		chrome.pageAction.show(tabId);
// 	}
// });

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
			data: settings.pacScript
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
	if (!settings.isProxyEnabled || !isConnectedToProxy) {
		chrome.proxy.settings.set({value: config.system, scope: 'regular'}, function() {});
	} else {
		chrome.proxy.settings.set({value: config.chromeproxyPac, scope: 'regular'}, function() {});
	}
	localStorage.setItem('isProxyEnabled', settings.isProxyEnabled);
}

function updateProxyIcon() {
	if (!isConnectedToProxy) {
		chrome.browserAction.setIcon({'path': {'19': 'images/icon_error.png', '38': 'images/icon_error@2x.png'}});
		chrome.browserAction.setTitle({title: 'Error connecting to proxy'});
	} else if (settings.isProxyEnabled) {
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
	sendMessageToAllPorts({method: 'toggle-proxy', 'isEnabled': settings.isProxyEnabled});
}

chrome.runtime.onConnect.addListener(function (port) {
	console.log(port);
	if (port.name === 'devtools-page') {
		openCount++;
		console.log('hye');
		ports.push(port);
		onProxyStateChange();

		port.onDisconnect.addListener(function(port) {
			console.log('bye');
			openCount--;
			ports.splice(ports.indexOf(port), 1);
			onProxyStateChange();
		});

		port.onMessage.addListener(function (message) {
			switch (message.method) {
				case 'update-settings':
					settings['editorCommandLine'] = localStorage.getItem('default.editorCommandLine');
					settings['pacScript'] = localStorage.getItem('default.pacScript');
					updateProxyConfig();
					updateProxyIcon();
					break;
				default:
					console.log('posting mesasge to proxy', message);
					nativeMessagingPort.postMessage(message);
					break;
			}
		});
	}

	chrome.runtime.sendMessage(EXTENSION_ID, {'method': 'toggle-proxy', 'isEnabled': settings.isProxyEnabled});
});

chrome.runtime.onMessage.addListener(function (message) {
	console.log(message);
	switch (message.method) {
		case 'toggle-proxy':
			settings.isProxyEnabled = message.isEnabled;
			onProxyStateChange();
			break;
	}
});

chrome.browserAction.onClicked.addListener(function () {
	settings.isProxyEnabled = !settings.isProxyEnabled;
	onProxyStateChange();
});

function connectToProxy() {
	console.log('connecting to proxy');
	nativeMessagingPort = chrome.runtime.connectNative('com.dutzi.chromeproxy');

	setTimeout(function () {
		if (nativeMessagingPort) {
			nativeMessagingPort.postMessage({'method': 'hello'});
			nativeMessagingPort.postMessage({'method': 'rule-list'});
		}
	}, 1000);

	nativeMessagingPort.onMessage.addListener(function(msg) {
		console.log('Got message: ', msg.msg);
		switch (msg.msg.method) {
			case 'log':
				// console.log(msg.msg.message);
				break;
			case 'rule-list':
				ruleList = msg.msg.rules;
				sendMessageToAllPorts(msg.msg);
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

settings.isProxyEnabled = localStorage.getItem('isProxyEnabled') === 'true';
onProxyStateChange();
