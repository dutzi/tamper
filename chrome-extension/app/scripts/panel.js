/* jshint ignore:start */
/*jshint latedef: false*/
/*global Q, MimeTypes*/

/****************************/
/********** UTILS ***********/
/****************************/

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
/********** RESIZE **********/
/****************************/

function onResize (e) {
	document.getElementById('sidebar').style.height = window.innerHeight + 'px';
}

window.onresize = onResize;
onResize();

/****************************/
/*********** INIT ***********/
/****************************/

if (window.navigator.appVersion.match(/OS X/)) {
	Utils.addClassName($body, 'os-osx');
} else if (window.navigator.appVersion.match(/win/i)) {
	Utils.addClassName($body, 'os-windows');
}

var mitmproxyExtensionVersion = localStorage.getItem('mitmproxyExtensionVersion');
if (mitmproxyExtensionVersion && mitmproxyExtensionVersion !== chrome.runtime.getManifest().version) {
	Utils.addClassName($body, 'update-available');
}
/* jshint ignore:end */