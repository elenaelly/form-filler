function fdIntegrationsGoogleSheets() {
	
	if (window.location.href.split('/').length < 3 || !window.location.href.split('/')[2].match(/googleusercontent.com$/)) {
		return;
	}
	
	var tabEventSource = null;
	var tabEventOrigin = null;
	
	fakeData.addEventListener('googleSheets', function(event) {
		if (event.data.message == 'loaded') {
			tabEventSource = event.source;
			tabEventOrigin = event.origin;
			
			googleSheetsLoaded()
		} else if (event.data.message == 'getFakerValuesForCells') {
			googleSheetsGetFakerValues(event.data);
		}
	});
	
	if (fakeData.getManifestVersion() < 3) {
		var function_to_execute = _func_fdIntegrationsGoogleSheets.toString();
		
		var script = document.createElement('script');
		script.textContent = '(' + function_to_execute + ')()';
		(document.head || document.documentElement).appendChild(script);
		script.remove();
	}
	
	function googleSheetsLoaded() {
		if (!tabEventSource) {
			return;
		}
		
		fakeData.getGeneratorsList().then(data => {
			tabEventSource.postMessage({
				event: 'fakedata:googleDocsReceivedGenerators',
				fakers: data.fakers
			});
		});
	}
	
	function googleSheetsGetFakerValues(data) {
		var promises = [];
		var cells = {};
		
		for (var i in data.range) {
			promises.push(new Promise((function(fkr) {
				return function(resolve) {
					var cell = i.match(/([a-zA-Z]+)([0-9]+)/i);
					var session_id = 'fd-goglsheet-' + cell[2];
					
					if (data.fuzzy) {
						fakeData.getFakeValue(data.range[fkr], session_id).then((result) => {
							cells[fkr] = result;
							resolve();
						});
					} else {
						fakeData.getGeneratorValue(data.range[fkr], null, session_id).then((result) => {
							cells[fkr] = result;
							resolve();
						});
					}
				};
			})(i)));
		}
		
		Promise.all(promises).then(values => {
			tabEventSource.postMessage({
				event: 'fakedata:googleDocsReceivedGeneratorValues',
				values: cells,
				id: data.id
			});
		});
	}
}
