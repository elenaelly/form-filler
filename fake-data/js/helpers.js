var cached_data = {};

function objectToNameSpace(obj, root = '') {
	var returnObj = {};
	for (var i in obj) {
		if (typeof obj[i] == 'object' && obj[i] !== null && obj[i].constructor !== Array) {
			Object.assign(returnObj, objectToNameSpace(obj[i], i));
		} else {
			returnObj[(root ? root + '.' : '') + i.toLowerCase()] = obj[i];
		}
	}
	
	return returnObj;
}

function cache(key, val) {
	if (arguments.length == 2) {
		cached_data[key] = val;
	}
	
	return cached_data[key];
}

function fakerFromLocale(locale_key, fallback_function) {
	
	var namespacedObjects = cache('namespaced_' + faker.locale + '_' + faker.localeFallback + '_' + locale_key);
	
	if (!namespacedObjects) {
		var localeObj = faker._parent.allLocales[faker.locale];
		var localeObjParent = faker._parent.allLocales[faker.locale];
		var localeObjFallback = faker._parent.allLocales[faker.localeFallback];
		var localeObjParentFallback = faker._parent.allLocales[faker.localeFallback];
		
		locale_key.split('.').forEach(function(key) {
			localeObjParent = localeObj;
			localeObjParentFallback = localeObjFallback;
			localeObj = localeObj && localeObj[key] ? localeObj[key] : null;
			localeObjFallback = localeObjFallback && localeObjFallback[key] ? localeObjFallback[key] : null;
		});
		
		var formats = localeObj || localeObjFallback;
		
		if (!formats || !formats.length) {
			namespacedObjects = cache('namespaced_' + faker.locale + '_' + faker.localeFallback + '_' + locale_key, 'na');
		} else {
			var vars = JSON.parse(JSON.stringify(localeObjParentFallback));
			Object.assign(vars, JSON.parse(JSON.stringify(localeObjParent)));
			Object.assign(vars, JSON.parse(JSON.stringify(faker._parent.allLocales[faker.localeFallback] || {})));
			Object.assign(vars, JSON.parse(JSON.stringify(faker._parent.allLocales[faker.locale] || {})));
			
			namespacedObjects = cache('namespaced_' + faker.locale + '_' + faker.localeFallback + '_' + locale_key, {
				formats: formats,
				namespaces: objectToNameSpace(vars)
			});
		}
	}
	
	if (namespacedObjects === 'na') {
		return typeof fallback_function == 'function' ? faker.helpers.replaceSymbolWithNumber(fallback_function()) : null;
	}
	
	var format = faker.datatype.number(namespacedObjects.formats.length - 1);
	
	return faker.helpers.replaceSymbolWithNumber(faker.helpers.templateString(namespacedObjects.formats[format], namespacedObjects.namespaces));
}

function deferredPromise() {
	var returnObj = {};
	
	Object.assign(returnObj, {
		status: 'pending',
		isPending: function() {
			return returnObj.status == 'pending';
		},
		isResolved: function() {
			return returnObj.status == 'resolved';
		},
		isRejected: function() {
			return returnObj.status == 'rejected';
		},
		resolve: function(data) {
			returnObj.status = 'resolved';
			returnObj.promiseResolve(data);
		},
		reject: function(data) {
			returnObj.status = 'rejected';
			returnObj.promiseReject(data);
		},
		then: function(callback) {
			return returnObj.promisePromise.then(callback);
		},
		promise: function() {
			return returnObj.promisePromise;
		},
		promiseResolve: returnObj.resolve,
		promiseReject: returnObj.reject
	});
	
	returnObj.promisePromise = new Promise((resolve, reject) => {
		returnObj.promiseResolve = resolve;
		returnObj.promiseReject = reject;
	});
	
	return returnObj;
}

async function fdSandboxIframeContentScriptRunner(js_code, sender, element_id) {
	
	var has_permission = await new Promise(resolve => {
		_chrome.permissions.contains({
			permissions: ['scripting']
		}, resolve)
	});
	
	if (!has_permission) {
		console.log('Scripting permission is required for running Custom Code');
		return;
	}
	
	
	var eval_promise = deferredPromise();
	var promise_id = fakeData._addEvalPromise(eval_promise);
	
	
	var self_origin = "chrome-extension://" + chrome.runtime.id;
	
	if (sender?.origin?.substr(0, self_origin.length) == self_origin) {
		if (!sender.tab) {
			// noinspection JSVoidFunctionReturnValueUsed
			chrome.runtime.sendMessage({
				type: 'run_sandbox_iframe_code',
				js_code: js_code,
				promise_id: promise_id,
				element_id: Number.isInteger(element_id) ? element_id : null,
				for_popup: true,
			}).catch(err => {});
		} else {
			// noinspection JSVoidFunctionReturnValueUsed
			chrome.tabs.sendMessage(sender.tab.id, {
				type: 'run_sandbox_iframe_code',
				js_code: js_code,
				promise_id: promise_id,
				element_id: Number.isInteger(element_id) ? element_id : null,
			}).catch(err => {});
		}
	} else {
		let target = {tabId: sender.tab.id};
		if (sender.frameId) {
			target.frameIds = [sender.frameId];
		}
		
		try {
			await _chrome.scripting.executeScript({
				target: target,
				func:   declareRequestFakeDomDataFunction,
			});
			
			await _chrome.scripting.executeScript({
				target: target,
				func:   fdSandboxContentScriptRunnerFunction,
				args:   [js_code, promise_id, Number.isInteger(element_id) ? element_id : null],
			});
		} catch (e) {
			eval_promise.reject(e)
		}
	}
	
	return eval_promise.promise();
}

function fdEvaluateCodeBackground() {
	var args = Array.from(arguments);
	
	var js_code = 	args.shift();
	
	if (!js_code) {
		return js_code;
	}
	
	if (getManifestVersion() <= 2) {
		return new Function(js_code).apply(this, args);
	} else if (getManifestVersion() == 3) {
		// console.log('Running code', js_code, this);
		if (!this?.sender?.tab?.id) {
			// console.trace('No tab_id passed for running code');
		}
		return fdSandboxIframeContentScriptRunner(js_code, this.sender, this.element_id);
	}
}

function isObject(item) {
	return (item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDeep(target, ...sources) {
	if (!sources.length) return target;
	const source = sources.shift();
	
	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}
	
	return mergeDeep(target, ...sources);
}

function isDebugVersion() {
	return chrome.runtime.id == 'cigakipoicicmibpnnmplpdfghckploa';
}
