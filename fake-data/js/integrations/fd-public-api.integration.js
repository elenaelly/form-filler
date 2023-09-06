function fdIntegrationsPublicApiEnabled() {
	
	var fdApiTabEventSource = null;
	var fdApiTabEventOrigin = null;
	
	fakeData.addEventListener('public_api_trigger', function(event) {
		if (event.data.message == 'yo') {
			fdApiTabEventSource = event.source;
			fdApiTabEventOrigin = event.origin;
			
			try {
				fdApiTabEventSource.postMessage({
					event: 'fakedata:yo-yo',
				}, fdApiTabEventOrigin);
			} catch (e) {
			}
		}
	});
	
	fakeData.addEventListener('callMethod', async function(event) {
		
		switch (event.data.method) {
			case 'fillElement':
				var $el = $('['+event.data.data.element+']');
				if (!$el.length) {
					return; // throw error
				}
				
				$el.removeAttr(event.data.data.element);
				
				fakeData.fillElement($el.get(0)).then(response => {
					fdApiTabEventSource.postMessage({
						event: 'fakedata:call_method_response',
						data: response.parsed_text,
						promise: event.data.promise
					}, fdApiTabEventOrigin);
				});
				break;
				
			case 'getUniqueSelector':
				var $el = $('['+event.data.data.element+']');
				if (!$el.length) {
					return; // throw error
				}
				
				$el.removeAttr(event.data.data.element);
				
				var response_selector = fakeData.getUniqueSelector($el.get(0));
				
				fdApiTabEventSource.postMessage({
					event: 'fakedata:call_method_response',
					data: response_selector,
					promise: event.data.promise
				}, fdApiTabEventOrigin);
				
				break;
				
			case 'getLastGeneratedValue':
				
				if (!event.data.data.generator) {
					return null;
				}
				
				var last_generated_value_response = await fakeData.getLastGeneratedValue(event.data.data.generator);
				
				fdApiTabEventSource.postMessage({
					event: 'fakedata:call_method_response',
					data: last_generated_value_response,
					promise: event.data.promise
				}, fdApiTabEventOrigin);
				
				break;
			
			case 'getGeneratorValue':
				
				if (!event.data.data.generator) {
					return; // throw error
				}
				
				var response = await fakeData.getGeneratorValue(event.data.data.generator, event.data.data.data);
				
				fdApiTabEventSource.postMessage({
					event: 'fakedata:call_method_response',
					data: response,
					promise: event.data.promise
				}, fdApiTabEventOrigin);
				
				break;
			
			case 'getFakeValue':
				
				if (!event.data.data.selector) {
					return; // throw error
				}
				
				var response = await fakeData.getFakeValue(event.data.data.selector);
				
				fdApiTabEventSource.postMessage({
					event: 'fakedata:call_method_response',
					data: response,
					promise: event.data.promise
				}, fdApiTabEventOrigin);
				
				break;
			
			case 'triggerInputChangeEvent':
				var $el = $('['+event.data.data.element+']');
				if (!$el.length) {
					return; // throw error
				}
				
				$el.removeAttr(event.data.data.element);
				
				fakeData.triggerInputChangeEvent($el.get(0), event.data.data.event);
				
				fdApiTabEventSource.postMessage({
					event: 'fakedata:call_method_response',
					data: true,
					promise: event.data.promise
				}, fdApiTabEventOrigin);
				
				break;
				
			case 'getGeneratorMatchForElement':
				var $el = $('['+event.data.data.element+']');
				if (!$el.length) {
					return; // throw error
				}
				
				$el.removeAttr(event.data.data.element);
				
				var response_data = await fakeData.getGeneratorMatchForElement($el.get(0));
				
				fdApiTabEventSource.postMessage({
					event: 'fakedata:call_method_response',
					data: response_data,
					promise: event.data.promise
				}, fdApiTabEventOrigin);
				
				break;
		}
	});
	
	if (fakeData.getManifestVersion() < 3) {
		var function_to_execute = _func_fdIntegrationsPublicApiEnabled.toString();
		
		var script         = document.createElement('script');
		script.textContent = '(' + function_to_execute + ')()';
		(document.head || document.documentElement).appendChild(script);
		script.remove();
	}
}
