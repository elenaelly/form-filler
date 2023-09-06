function runGlobalFakeDataAPI(func, args, options = {}) {
	
	var promise_id = getNewDeferredPromise();
	
	sendDataToParent(Object.assign({
		type:       'call_fakedata_global_func',
		func:       func,
		args:       args,
		promise_id: promise_id,
	}, options));
	
	return getGlobalPromise(promise_id);
}

window.fakeData = {
	getGeneratorValue: function() {
		return runGlobalFakeDataAPI('getGeneratorValue', Array.from(arguments));
	},
	getFakeValue: function() {
		return runGlobalFakeDataAPI('getFakeValue', Array.from(arguments));
	},
	getLastGeneratedValue: function() {
		return runGlobalFakeDataAPI('getLastGeneratedValue', Array.from(arguments));
	},
	getGeneratorsList: function() {
		return runGlobalFakeDataAPI('getGeneratorsList', Array.from(arguments));
	},
	fillElement: function() {
		return runGlobalFakeDataAPI('fillElement', Array.from(arguments));
	},
	getUniqueSelector: function() {
		return runGlobalFakeDataAPI('getUniqueSelector', Array.from(arguments));
	},
	getGeneratorMatchForElement: function() {
		return runGlobalFakeDataAPI('getGeneratorMatchForElement', Array.from(arguments));
	},
	triggerInputChangeEvent: function() {
		return runGlobalFakeDataAPI('triggerInputChangeEvent', Array.from(arguments));
	},
	getFillSessionId: function() {
		return runGlobalFakeDataAPI('getFillSessionId', Array.from(arguments));
	},
	sendToBackground: function() {
		return runGlobalFakeDataAPI('sendToBackground', Array.from(arguments));
	},
	getDatasetValue: function() {
		return runGlobalFakeDataAPI('getDatasetValue', Array.from(arguments));
	},
	registerElement: function(label, options) {
		var registerId = getUuid();
		
		registeredElements[registerId] = {
			label: label,
			options: options,
		}
		
		sendDataToParent({
			type:    'fd_register_element_mv3',
			id:      registerId,
			label:   label,
			options: {
				isHTMLInput:    options.isHTMLInput || false,
				isValidElement: options.isValidElement || null,
			},
		});
	},
	
	ultra: {
		getLastSms: function() {
			return runGlobalFakeDataAPI('ultra.getLastSms', Array.from(arguments), {context: 'background'});
		},
		generators: {
			email: function() {
				return runGlobalFakeDataAPI('ultra.generators.emailAddress.callback', Array.from(arguments), {context: 'background'});
			},
			phone: function(format = '###-###-####') {
				let args = Array.from(arguments);
				if (!args.length) {
					args = [format];
				}
				return runGlobalFakeDataAPI('ultra.generators.phone.callback', args, {context: 'background'});
			},
			country: function() {
				return runGlobalFakeDataAPI('ultra.generators.country.callback', Array.from(arguments), {context: 'background'});
			},
			state: function() {
				return runGlobalFakeDataAPI('ultra.generators.state.callback', Array.from(arguments), {context: 'background'});
			},
			city: function() {
				return runGlobalFakeDataAPI('ultra.generators.city.callback', Array.from(arguments), {context: 'background'});
			},
			address: function() {
				return runGlobalFakeDataAPI('ultra.generators.address.callback', Array.from(arguments), {context: 'background'});
			},
			zip: function() {
				return runGlobalFakeDataAPI('ultra.generators.zip.callback', Array.from(arguments), {context: 'background'});
			},
		}
	}
};

async function onMessageReceived_RegisteredElementEvent(data) {
	
	if (!registeredElements[data.id]) {
		return;
	}
	
	if (['onFill', 'onQuery'].indexOf(data.event) < 0) {
		return;
	}
	
	if (data.data.element) {
		data.data.element = FakeDomElement.getOrCreateFakeDomElement({
			type:       'DOMProxyElement',
			element_id: data.data.element.id
		});
	}
	
	if (data.data.fill_session) {
		data.data.fill_session = data.data.fill_session.map(el => FakeDomElement.getOrCreateFakeDomElement({
			type:       'DOMProxyElement',
			element_id: el.id
		}));
	}
	
	if (data.data.event) {
		if (data.data.event.target) {
			data.data.event.target = FakeDomElement.getOrCreateFakeDomElement({
				type:       'DOMProxyElement',
				element_id: data.data.event.target.id
			});
		}
		
		if (data.data.event.srcElement) {
			data.data.event.srcElement = FakeDomElement.getOrCreateFakeDomElement({
				type:       'DOMProxyElement',
				element_id: data.data.event.srcElement.id
			});
		}
	}
	
	var result = await registeredElements[data.id].options[data.event](data.data);
	
	sendDataToParent({
		type:     'fd_register_element_event_response',
		id:       data.id,
		event:    data.event,
		response: result,
	});
}
