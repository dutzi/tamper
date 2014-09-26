'use strict';

chrome.devtools.panels.create('Tamper',
	'MyPanelIcon.png',
	'panel.html',
	function(panel) {
		console.log('Creating panel', panel);
		// code invoked on panel creation
	}
);
