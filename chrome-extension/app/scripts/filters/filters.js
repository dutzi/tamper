/*global module*/
module.filter('getFilename', function () {
	return function (url) {
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
	};
}).filter('getPath', function () {
	return function (url) {
		return url.substring(url.indexOf('//') + 2, url.lastIndexOf('/'));
	};
}).filter('fixDash', function () {
	//if path is empty, set it to the subtring of url's previous encounter with /
	//so that: 
	//		http://www.google.com/ -> www.google.com
	//		http://www.google.com/folder/ -> folder/ (for folders add the last slash)
	return function (url) {
		return url.replace(/-/g, '&#8209;');
	};
});
