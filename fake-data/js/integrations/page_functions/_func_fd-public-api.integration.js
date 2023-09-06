function _func_fdIntegrationsPublicApiEnabled() {
	window.addEventListener('message', function(event) {
		if (event.data.event) {
			switch (event.data.event) {
				case 'fakedata:call_method_response':
					if (typeof returnPromises[event.data.promise] != 'undefined') {
						var return_promise = returnPromises[event.data.promise];
						delete returnPromises[event.data.promise];
						return_promise(event.data.data);
					}
					break;
				
				case 'fakedata:yo-yo':
					
					if (typeof window['fakeDataExtensionLoaded'] == 'function') { // check if onload function exists
						window['fakeDataExtensionLoaded'](fakeDataAPIWrapper);
					} else {
						window.addEventListener('load', function() { // if not, try again after page has been completely loaded
							if (typeof window['fakeDataExtensionLoaded'] == 'function') {
								window['fakeDataExtensionLoaded'](fakeDataAPIWrapper);
							}
						});
						
					}
					break;
			}
		}
	});
	
	var uniqeIdCounter = 1;
	var returnPromiseCounter = 1;
	var returnPromises = {};
	
	function sendMessageToFD(message) {
		return new Promise(resolve => {
			var return_promise_label = 'return-promise-' + (returnPromiseCounter++);
			returnPromises[return_promise_label] = resolve;
			
			message.promise = return_promise_label;
			
			window.postMessage(message, "*");
		});
	}
	
	var fakeDataAPIWrapper = {
		getGeneratorMatchForElement: function(element) {
			if (!(element instanceof Element)) {
				throw "Argument #1 must be a DOM element";
			}
			
			var uniqueAttributeName = 'data-fd-uniqueid-ref-' + (uniqeIdCounter++);
			element.setAttribute(uniqueAttributeName, 'true');
			
			return sendMessageToFD({
				event: 'fakedata:callMethod',
				method: 'getGeneratorMatchForElement',
				data: {
					element: uniqueAttributeName,
				}
			});
		},
		getLastGeneratedValue: function(generator) {
			
			if (!generator) {
				throw "Missing required argument #1 <generator>";
			}
			
			return sendMessageToFD({
				event: 'fakedata:callMethod',
				method: 'getLastGeneratedValue',
				data: {
					generator: generator
				}
			});
		},
		getGeneratorValue: function(generator, data) {
			
			if (!generator) {
				throw "Missing required argument #1 <generator>";
			}
			
			return sendMessageToFD({
				event: 'fakedata:callMethod',
				method: 'getGeneratorValue',
				data: {
					generator: generator,
					data: data
				}
			});
		},
		getFakeValue: function(selector) {
			
			if (!selector) {
				throw "Missing required argument #1 <selector>";
			}
			
			return sendMessageToFD({
				event: 'fakedata:callMethod',
				method: 'getFakeValue',
				data: {
					selector: selector
				}
			});
		},
		triggerInputChangeEvent: function(element, event) {
			
			if (!(element instanceof Element)) {
				throw "Argument #1 must be a DOM element";
			}
			
			var uniqueAttributeName = 'data-fd-uniqueid-ref-' + (uniqeIdCounter++);
			element.setAttribute(uniqueAttributeName, 'true');
			
			return sendMessageToFD({
				event: 'fakedata:callMethod',
				method: 'triggerInputChangeEvent',
				data: {
					element: uniqueAttributeName,
					event: event,
				}
			});
		},
		getUniqueSelector: function(element) {
			
			if (!(element instanceof Element)) {
				throw "Argument #1 must be a DOM element";
			}
			
			var uniqueAttributeName = 'data-fd-uniqueid-ref-' + (uniqeIdCounter++);
			element.setAttribute(uniqueAttributeName, 'true');
			
			return sendMessageToFD({
				event: 'fakedata:callMethod',
				method: 'getUniqueSelector',
				data: {
					element: uniqueAttributeName
				}
			});
		},
		fillElement: function(element) {
			
			if (!(element instanceof Element)) {
				throw "Argument #1 must be a DOM element";
			}
			
			var uniqueAttributeName = 'data-fd-uniqueid-ref-' + (uniqeIdCounter++);
			element.setAttribute(uniqueAttributeName, 'true');
			
			return sendMessageToFD({
				event: 'fakedata:callMethod',
				method: 'fillElement',
				data: {
					element: uniqueAttributeName
				}
			});
		},
	};
	
	window.fakeData = fakeDataAPIWrapper;
	
	sendMessageToFD({
		event:   'fakedata:public_api_trigger',
		message: 'yo'
	});
	
}

// for MV3, _contentScripts is declared in background worker
if (typeof _contentScripts != 'undefined') {
	_contentScripts._func_fdIntegrationsPublicApiEnabled = _func_fdIntegrationsPublicApiEnabled;
}
