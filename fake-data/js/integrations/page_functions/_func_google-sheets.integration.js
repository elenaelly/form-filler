function _func_fdIntegrationsGoogleSheets() {
	window.fdOnPageLoaded = function() {
		parent.postMessage({
			event: 'fakedata:googleSheets',
			message: 'loaded'
		}, "*");
		
		window.addEventListener('message', function (event) {
			if (event.data.event) {
				switch (event.data.event) {
					case 'fakedata:googleDocsReceivedGenerators':
						window.vueObj.onExtGeneratorsReceived(event.data.fakers);
						break;
					
					case 'fakedata:googleDocsReceivedGeneratorValues':
						window.extension_fills[event.data.id].resolver(event.data.values);
						break;
				}
			}
		});
	}
}

// for MV3, _contentScripts is declared in background worker
if (typeof _contentScripts != 'undefined') {
	_contentScripts._func_fdIntegrationsGoogleSheets = _func_fdIntegrationsGoogleSheets;
}
