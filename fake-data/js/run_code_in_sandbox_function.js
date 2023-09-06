function declareRequestFakeDomDataFunction() {
	if (typeof window.requestFakeDomData == 'undefined') {
		window.requestFakeDomData = function(data) {
			return new Promise(async function(resolve) {
				
				var parent;
				
				if (data.parent.type == 'NativeWindowObject') {
					parent = window;
					
					data.parent.object.split('.').forEach(p => {
						parent = parent[p];
					});
					
				} else if (data.parent.type == 'DOMProxyElement') {
					parent = window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_id.get(data.parent.element_id)?.el
				} else {
					console.warn('[listener] Failed to identify element for FakeDOM proxy', data)
					return;
				}
				
				var resolve_response;
				var result;
				
				if (data.trigger == 'call_method') {
					var method = data.method;
					var parent_method = parent;
					
					method.split('.').forEach(mth => {
						parent = parent_method;
						parent_method = parent_method[mth];
					});
					
					result = parent_method.apply(parent, data.args);
				} else if (data.trigger == 'set_attribute') {
					let attr = data.attribute.split('.');
					result   = parent;
					for (var i = 0; i < attr.length; i++) {
						if (i == attr.length - 1) {
							break;
						}
						result = result[attr[i]];
					}
					result[attr[i]] = data.value;
				} else if (data.trigger == 'get_attribute') {
					let attr = data.attribute.split('.');
					result   = parent;
					for (var i = 0; i < attr.length; i++) {
						result = result[attr[i]];
					}
				} else if (data.trigger == 'unregister_event') {
					if (data.uuid && window.$$$$$_____fakedata_global_store_____$$$$$.dom_events[data.event_type]) {
						for (var i in window.$$$$$_____fakedata_global_store_____$$$$$.dom_events[data.event_type]) {
							if (window.$$$$$_____fakedata_global_store_____$$$$$.dom_events[data.event_type][i].uuid == data.uuid) {
								parent.removeEventListener(data.event_type, window.$$$$$_____fakedata_global_store_____$$$$$.dom_events[data.event_type][i].handler, data.event_options);
							}
						}
					}
				} else if (data.trigger == 'register_event') {
					if (typeof window.$$$$$_____fakedata_global_store_____$$$$$.dom_events[data.event_type] == 'undefined') {
						window.$$$$$_____fakedata_global_store_____$$$$$.dom_events[data.event_type] = [];
					}
					
					let _evt = {
						uuid: data.uuid,
						handler: function(e) {
							
							if (data.event_options && data.event_options.preventDefault) {
								e.preventDefault();
							}
							
							if (!e.$$$$$_____fakedata_event_hash_____$$$$$) {
								e.$$$$$_____fakedata_event_hash_____$$$$$ = window.$$$$$_____fakedata_global_store_____$$$$$.getUuid();
							}
							
							var _e_serialized = {};
							for (var i in e) {
								var _e_val = e[i];
								
								if (i == 'target' || i == 'srcElement') {
									
									let el_object = getOrAddElementToGlobalStoreMap(e[i]);
									
									_e_val = {
										type: 'HTMLElement',
										id:   el_object.id,
									}
								} else if (i == 'path') continue;
								else if (typeof e[i] == 'object' || typeof e[i] == 'function') continue;
								
								_e_serialized[i] = _e_val;
							}
							
							window.$$$$$_____fakedata_global_store_____$$$$$.postMessageToIframe({
								type:               'dom_event_triggered',
								element:            {
									type: data.parent.type == 'NativeWindowObject' ? 'HTMLNativeElement' : 'HTMLElement',
									id:   data.parent.type == 'NativeWindowObject' ? data.parent.object : data.parent.element_id,
								},
								event_type:         data.event_type,
								event_data:         JSON.parse(JSON.stringify(_e_serialized)),
								uuid: 				data.uuid,
								event_hash: e.$$$$$_____fakedata_event_hash_____$$$$$,
								proxy_element_keys: ['target', 'srcElement']
							});
						}
					};
					window.$$$$$_____fakedata_global_store_____$$$$$.dom_events[data.event_type].push(_evt);
					
					parent.addEventListener(data.event_type, _evt.handler, data.event_options);
				} else {
					console.warn('[listener] Invalid method for FakeDOM proxy received', data)
					return;
				}
				
				if (result instanceof Promise) {
					result = await result;
				}
				
				if (result instanceof HTMLElement) {
					
					let el_object = getOrAddElementToGlobalStoreMap(result);
					
					resolve_response = {
						type: 'HTMLElement',
						id:   el_object.id,
					}
				} else if (result instanceof NodeList || result instanceof HTMLCollection) {
					
					var _node_list = [];
					
					for (var i = 0; i < result.length; i++) {
						
						let el_object = getOrAddElementToGlobalStoreMap(result[i]);
						
						_node_list.push({
							type: 'HTMLElement',
							id:   el_object.id,
						});
					}
					
					resolve_response = {
						type: 'NodeList',
						ids:  _node_list,
					}
					
				} else if (result instanceof DOMTokenList) {
					resolve_response = {
						type: 'DOMTokenList',
						values: Array.from(result),
					}
				} else {
					resolve_response = {
						type:   'native_type',
						typeof: typeof result,
						value:  result
					}
				}
				
				resolve(resolve_response);
			});
		}
	}
}

function fdSandboxContentScriptRunnerFunction(js_code, promise_id, element_id) {
	
	if (typeof window.getOrAddElementToGlobalStoreMap == 'undefined') {
		window.getOrAddElementToGlobalStoreMap = function(element) {
			if (window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_element.has(element)) {
				return window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_element.get(element);
			} else {
				var el_object = {
					el: element,
					id: window.$$$$$_____fakedata_global_store_____$$$$$.getUuid()
				};
				
				window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_element.set(el_object.el, el_object);
				window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_id.set(el_object.id, el_object);
				
				return el_object;
			}
		}
	}
	
	if (typeof window.$$$$$_____fakedata_global_store_____$$$$$ == 'undefined') {
		window.$$$$$_____fakedata_global_store_____$$$$$ = {
			onMessageReceivedListener: function(e) {
				
				if (!e || !e.data) {
					return;
				}
				
				if (!e.data.from_fakedata) {
					return;
				}
				
				if (e.data.type == 'run_result') {
					chrome.runtime.sendMessage({
						type: 'mv3_run_eval_result',
						promise_id: e.data.promise_id,
						text: e.data.text,
						text_type: e.data.text_type,
						error: e.data.error,
					}).catch(err => {});
				} else if (e.data.type == 'request_fake_dom_data') {
					if (window.requestFakeDomData) {
						window.requestFakeDomData(e.data.data).then(function(_fake_dom_data) {
							$$$$$_____fakedata_global_store_____$$$$$.postMessageToIframe({
								type: 'request_fake_dom_data_response',
								promise_id: e.data.promise_id,
								data: _fake_dom_data,
							}, '*');
						});
					}
				} else if (e.data.type == 'call_fakedata_global_func') {
					var result
					if (typeof fakeData == 'undefined' || e.data.context == 'background') {
						result = new Promise(function(resolve) {
							chrome.runtime.sendMessage({
								type: 'call_fakedata_global_func',
								func: e.data.func,
								args: e.data.args,
							}, function(data) {
								resolve(data.data);
							});
						});
					} else {
						
						var method = fakeData;
						e.data.func.split('.').forEach(f => {
							method = method[f];
						});
						
						result = method.apply(fakeData, e.data.args);
					}
					
					if (!(result instanceof Promise)) {
						result = Promise.resolve(result);
					}
					
					result.then(function(data) {
						$$$$$_____fakedata_global_store_____$$$$$.postMessageToIframe({
							type: 'call_fakedata_global_func_response',
							promise_id: e.data.promise_id,
							data: data,
							dataType: typeof data
						}, '*');
					});
				} else if (e.data.type == 'fd_register_element_mv3') {
					fakeData.registerElement(e.data.label, {
						isHTMLInput: e.data.options.isHTMLInput,
						isValidElement: e.data.options.isValidElement,
						onQuery: function(data) {
							var data_to_pass = Object.assign(data, {
								element: {
									type: 'HTMLElement',
									id:   getOrAddElementToGlobalStoreMap(data.element).id,
								},
								fill_session: data.fill_session.map(el => {
									return {
										type:       'HTMLElement',
										id: getOrAddElementToGlobalStoreMap(el).id,
									}
								}),
							});
							
							$$$$$_____fakedata_global_store_____$$$$$.postMessageToIframe({
								type: 'fd_register_element_event_happened',
								event: 'onQuery',
								data: data_to_pass,
								id: e.data.id
							});
							
							return new Promise(function(resolve) {
								window.$$$$$_____fakedata_global_store_____$$$$$.event_handlers[e.data.id + '_onQuery'] = function(_data) {
									resolve(_data)
								}
							});
						},
						onFill: function(data) {
							if (!data.event.$$$$$_____fakedata_event_hash_____$$$$$) {
								data.event.$$$$$_____fakedata_event_hash_____$$$$$ = window.$$$$$_____fakedata_global_store_____$$$$$.getUuid();
							}
							
							var _event_serialized = {};
							for (var i in data.event) {
								
								var _e_val = data.event[i];
								
								if (i == 'target' || i == 'srcElement') {
									
									let el_object = getOrAddElementToGlobalStoreMap(data.event[i]);
									
									_e_val = {
										type: 'HTMLElement',
										id:   el_object.id,
									}
								} else if (i == 'path') continue;
								else if (typeof data.event[i] == 'object' || typeof data.event[i] == 'function') continue;
								
								_event_serialized[i] = _e_val;
							}
							
							var data_to_pass = Object.assign(data, {
								element: {
									type: 'HTMLElement',
									id:   getOrAddElementToGlobalStoreMap(data.element).id,
								},
								fill_session: data.fill_session.map(el => {
									return {
										type:       'HTMLElement',
										id: getOrAddElementToGlobalStoreMap(el).id,
									}
								}),
								event: _event_serialized
							});
							
							$$$$$_____fakedata_global_store_____$$$$$.postMessageToIframe({
								type: 'fd_register_element_event_happened',
								event: 'onFill',
								data: data_to_pass,
								id: e.data.id
							});
							
							return new Promise(function(resolve) {
								window.$$$$$_____fakedata_global_store_____$$$$$.event_handlers[e.data.id + '_onFill'] = function(_data) {
									resolve(_data)
								}
							});
						}
					});
				} else if (e.data.type == 'fd_register_element_event_response') {
					if (!window.$$$$$_____fakedata_global_store_____$$$$$.event_handlers[e.data.id + '_' + e.data.event]) {
						return;
					}
					
					window.$$$$$_____fakedata_global_store_____$$$$$.event_handlers[e.data.id + '_' + e.data.event](e.data.response);
				}
			},
			dom_elements_by_element: new WeakMap(),
			dom_elements_by_id: new Map(),
			dom_events: {},
			event_handlers: {},
			postMessageToIframe: async function(data) {
				data.from_fakedata = true;
				
				if (data?.data?.value && typeof data.data.value == 'object' && !(data.data.value instanceof Array)) {
					data.data.value = Object.assign({}, data.data.value);
				}
				
				var iframe = $$$$$_____fakedata_global_store_____$$$$$.iframe_el;

				try {
					$$$$$_____fakedata_global_store_____$$$$$.iframe_messaging.port1.postMessage(data);
				} catch (e) {
					console.error(e)
				}
			},
			getUuid: function() {
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
			},
			iframe_loaded_promise: null,
			iframe_loaded_promise_resolver: null,
		};
	}
	
	if (element_id !== null && element_id !== undefined && Number.isInteger(element_id)) {
		let element = fakeData.getCachedElementFromId(element_id);
		
		let el_object = getOrAddElementToGlobalStoreMap(element);
		
		var new_fake_dom_element = {
			type: 'DOMProxyElement',
			element_id:   el_object.id,
		};
	}
	
	if (!document.querySelector('html').contains($$$$$_____fakedata_global_store_____$$$$$.iframe_el)) {
		
		$$$$$_____fakedata_global_store_____$$$$$.iframe_messaging = {
			channel: new MessageChannel()
		};
		$$$$$_____fakedata_global_store_____$$$$$.iframe_messaging.port1 = $$$$$_____fakedata_global_store_____$$$$$.iframe_messaging.channel.port1;
		
		$$$$$_____fakedata_global_store_____$$$$$.iframe_loaded_promise = new Promise(function(resolve) {
			$$$$$_____fakedata_global_store_____$$$$$.iframe_loaded_promise_resolver = resolve;
		});
		
		var iframe = document.createElement('iframe');
		$$$$$_____fakedata_global_store_____$$$$$.iframe_el = iframe;
		
		iframe.style = 'border: 0; position: fixed; left: -100px; top: -100px; width: 1px; height: 1px;';
		iframe.src = chrome.runtime.getURL("sandbox/sandbox.html");
		document.querySelector('html').appendChild(iframe);
		
		iframe.onload = function() {
			$$$$$_____fakedata_global_store_____$$$$$.iframe_messaging.port1.onmessage = $$$$$_____fakedata_global_store_____$$$$$.onMessageReceivedListener;

			iframe.contentWindow.postMessage('init', '*', [$$$$$_____fakedata_global_store_____$$$$$.iframe_messaging.channel.port2]);
			
			$$$$$_____fakedata_global_store_____$$$$$.iframe_loaded_promise_resolver();
		}
	}
	
	$$$$$_____fakedata_global_store_____$$$$$.iframe_loaded_promise.then(async function() {
		$$$$$_____fakedata_global_store_____$$$$$.postMessageToIframe({
			type:          'run_code',
			storage:       await chrome.storage.local.get(),
			run_code:      js_code,
			promise_id:    promise_id,
			element:       new_fake_dom_element,
		}, '*');
	});
}
