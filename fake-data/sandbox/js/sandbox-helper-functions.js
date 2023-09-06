var _storage;
var communication_port = null;
const global_promises = [];
const fakeDom  = new FakeDom();
var first_init = false;
const registeredElements = {};

function sendDataToParent(data) {
	data.from_fakedata = true;

	try {
		communication_port.postMessage(data);
	} catch (e) {
		console.error(e);
	}
}

function runLoadedLibraries() {
	if (!_storage.loaded_libraries) {
		return;
	}
	
	for (var i = 0; i < _storage.loaded_libraries.length; i++) {
		if (_storage.loaded_libraries[i].type == 'sandbox') {
			try {
				eval.call(window, _storage.loaded_libraries[i].contents);
			} catch (e) {
				console.error(e);
			}
		}
	}
}

function initStorage(storage) {
	_storage = storage;
	
	if (!first_init) {
		runLoadedLibraries();
		first_init = true;
	}
}

function getStorage() {
	return _storage;
}

async function runCode(js_code, element) {
	// var result = (new Function(js_code))(element);
	
	try {
		var result = await (new Function("return (async () => {" + "\n" + js_code + "\n" + "})()"))(element);
	} catch (e) {
		console.error(e);
		console.log(js_code);
		throw e;
		return;
	}
	
	// some backwards compatibility with previous versions of Fake Data....
	if (typeof result == 'function') {
		result = result(element);
	} else if (typeof result == 'object' && result.constructor == Array && result[0] && typeof result[0] == 'function') {
		let call_function = result[0];
		result[0] = element;
		
		result = call_function.apply(null, result);
	}
	
	if (typeof result == 'object' && result instanceof Promise) {
		result = await result;
	}
	
	if (typeof result == 'object') {
		result = result.toString();
	}
	
	return result;
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

function getNewDeferredPromise() {
	global_promises.push(deferredPromise());
	
	return global_promises.length-1;
}

function getGlobalPromise(id) {
	return global_promises[id];
}

function getUuid() {
	if (window.crypto && window.crypto.randomUUID) {
		return window.crypto.randomUUID();
	} else {
		let result, i, j;
		result = '';
		for(j=0; j<32; j++) {
			if( j == 8 || j == 12 || j == 16 || j == 20)
				result = result + '-';
			i = Math.floor(Math.random()*16).toString(16).toUpperCase();
			result = result + i;
		}
		
		return result;
	}
}
