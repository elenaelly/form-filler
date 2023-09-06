class FakeDomPropertyPromise {
	_element;
	_parent_property;
	
	constructor(element, parent_property) {
		this._element = element;
		this._parent_property = parent_property;
	}
	
	getProxy() {
		return new Proxy(this, {
			get: function(target, prop, receiver) {
				return this._element._attributeGetter(this._parent_property + '.' + prop);
			}.bind(this),
			set: function(target, prop, value) {
				return this._element._attributeSetter(this._parent_property + '.' + prop, value);
			}.bind(this)
		});
	}
}

class FakeDomElementPromise extends Promise {
	_super_promise;
	
	constructor(func, extended_class = FakeDomElement) {
		let _super_promise = super(func);
		
		this._super_promise = _super_promise;
		var self = this;
		
		var props = Object.getOwnPropertyNames(extended_class.prototype);
		for (var i = 0; i < props.length; i++) {
			let prop = props[i];
			
			if (["constructor","DOMProxyTrigger", "getOrCreateFakeDomElement","callDOMElementMethod","setDOMElementAttributeValue","getDOMElementAttributeValue","registerDOMElementEvent", "unRegisterDOMElementEvent","_attributeGetter","_attributeSetter"].indexOf(prop) >= 0) continue;
			
			if (!Object.getOwnPropertyDescriptor(extended_class.prototype, prop).writable) {
				Object.defineProperty(this, prop, {
					get: async function() {
						if (!Object.getOwnPropertyDescriptor(extended_class.prototype, prop).writable) {
							return (await self._super_promise)[prop]
						}
					},
					set: async function(value) {
						if (!Object.getOwnPropertyDescriptor(extended_class.prototype, prop).writable) {
							(await this._super_promise)[prop] = value;
						}
					},
				});
			} else {
				Object.defineProperty(this, prop, {
					value: function() {
						var requested_args = Array.from(arguments);
						
						return new FakeDomElementPromise(async function(__resolve) {
							var parent_result = await self._super_promise;
							var result = parent_result[prop].apply(parent_result, Array.from(requested_args));
							__resolve(await result);
						}, extended_class);
					},
				});
			}
		}
		
		return this;
	}
}

class FakeDomTokenList {
	_values = [];
	_element;
	
	constructor(values, element = null) {
		this._values = Array.from(values);
		
		if (element) {
			this._element = element;
		}
	}
	
	get value() { return this._values.join(' '); }
	
	add() {
		return this._element.callDOMElementMethod('classList.add', Array.from(arguments));
	}
	
	remove() {
		return this._element.callDOMElementMethod('classList.remove', Array.from(arguments));
	}
	
	replace() {
		return this._element.callDOMElementMethod('classList.replace', Array.from(arguments));
	}
	
	toggle() {
		return this._element.callDOMElementMethod('classList.toggle', Array.from(arguments));
	}
}

class FakeDomElement {
	element;
	_events = {};
	
	static _elements_by_id = new Map();
	static _elements_by_element = new WeakMap();
	
	constructor(element = null) {
		if (typeof element == 'string') {
			this.element = {
				type: 'NativeWindowObject',
				object: element
			};
		} else if (element) {
			this.element = element
			
			if (typeof this.element.element_id != 'undefined') {
				FakeDomElement._elements_by_id.set(this.element.element_id, this);
				FakeDomElement._elements_by_element.set(this, this.element);
			}
		}
	}
	
	// Proxy helpers
	static getOrCreateFakeDomElement(object) {
		if (object.element_id && FakeDomElement._elements_by_id.has(object.element_id)) {
			return FakeDomElement._elements_by_id.get(object.element_id);
		}
		
		return new FakeDomElement(object);
	}
	
	
	DOMProxyTrigger(options) {
		let extended_class = FakeDomElement;
		if (options.trigger == 'get_attribute' && options.attribute == 'classList') {
			extended_class = FakeDomTokenList;
		}
		
		return new FakeDomElementPromise(async resolve => {
			var _response        = await new Promise(function(_resolve) {
				var promise_id = getNewDeferredPromise();
				getGlobalPromise(promise_id).then(_resolve);
				
				sendDataToParent({
					type: 'request_fake_dom_data',
					promise_id: promise_id,
					data: options
				});
			});
			var resolve_response = _response;
			
			if (_response.type == 'HTMLElement') {
				resolve_response = FakeDomElement.getOrCreateFakeDomElement({
					type:       'DOMProxyElement',
					element_id: _response.id
				});
			} else if (_response.type == 'NodeList') {
				var _node_list = [];
				for (var i = 0; i < _response.ids.length; i++) {
					_node_list.push(FakeDomElement.getOrCreateFakeDomElement({
						type: 'DOMProxyElement',
						element_id: _response.ids[i].id
					}));
				}
				resolve_response = _node_list;
			} else if (_response.type == 'native_type') {
				resolve_response = _response.value;
			} else if (_response.type == 'DOMTokenList') {
				resolve_response = new FakeDomTokenList(_response.values, this);
			}
			
			resolve(resolve_response);
		}, extended_class);
	}
	
	callDOMElementMethod(method_name, method_args) {
		return this.DOMProxyTrigger({
			trigger: 'call_method',
			method:  method_name,
			args:    Object.values(method_args),
			parent:  this.element
		});
	}
	
	setDOMElementAttributeValue(attribute_name, attribute_value) {
		return this.DOMProxyTrigger({
			trigger: 'set_attribute',
			attribute:  attribute_name,
			value:    attribute_value,
			parent:  this.element
		});
	}
	
	
	getDOMElementAttributeValue(attribute_name) {
		return this.DOMProxyTrigger({
			trigger: 'get_attribute',
			attribute:  attribute_name,
			parent:  this.element
		});
	}
	
	registerDOMElementEvent(type, listener, options, uuid) {
		return this.DOMProxyTrigger({
			trigger: 'register_event',
			event_type:  type,
			event_options: options,
			uuid: uuid,
			parent:  this.element
		});
	}
	
	unRegisterDOMElementEvent(type, uuid) {
		return this.DOMProxyTrigger({
			trigger: 'unregister_event',
			event_type:  type,
			uuid: uuid,
			parent:  this.element
		});
	}
	
	_attributeGetter(attribute) {
		return this.getDOMElementAttributeValue(attribute);
	}
	
	_attributeSetter(attribute, value) {
		return this.setDOMElementAttributeValue(attribute, value);
	}
	
	// Proxy Methods
	querySelector() { return this.callDOMElementMethod('querySelector', arguments); }
	querySelectorAll() { return this.callDOMElementMethod('querySelectorAll', arguments); }
	getElementById() { return this.callDOMElementMethod('getElementById', arguments); }
	getElementsByTagName() { return this.callDOMElementMethod('getElementsByTagName', arguments); }
	getElementsByClassName() { return this.callDOMElementMethod('getElementsByClassName', arguments); }
	click() { return this.callDOMElementMethod('click', arguments); }
	focus() { return this.callDOMElementMethod('focus', arguments); }
	blur() { return this.callDOMElementMethod('blur', arguments); }
	submit() { return this.callDOMElementMethod('submit', arguments); }
	remove() { return this.callDOMElementMethod('remove', arguments); }
	getAttribute() { return this.callDOMElementMethod('getAttribute', arguments); }
	setAttribute() { return this.callDOMElementMethod('setAttribute', arguments); }
	hasAttribute() { return this.callDOMElementMethod('hasAttribute', arguments); }
	removeAttribute() { return this.callDOMElementMethod('removeAttribute', arguments); }
	createElement() { return this.callDOMElementMethod('createElement', arguments); }
	matches() { return this.callDOMElementMethod('matches', arguments); }

	// Proxy Attributes
	set innerText(value) { return this._attributeSetter('innerText', value); }
	get innerText() { return this._attributeGetter('innerText'); }
	
	set textContent(value) { return this._attributeSetter('textContent', value); }
	get textContent() { return this._attributeGetter('textContent'); }

	set innerHTML(value) { return this._attributeSetter('innerHTML', value); }
	get innerHTML() { return this._attributeGetter('innerHTML'); }
	
	set name(value) { return this._attributeSetter('name', value); }
	get name() { return this._attributeGetter('name'); }
	
	set id(value) { return this._attributeSetter('id', value); }
	get id() { return this._attributeGetter('id'); }
	
	set type(value) { return this._attributeSetter('type', value); }
	get type() { return this._attributeGetter('type'); }
	
	set value(value) { return this._attributeSetter('value', value); }
	get value() { return this._attributeGetter('value'); }
	
	set action(value) { return this._attributeSetter('action', value); }
	get action() { return this._attributeGetter('action'); }

	set text(value) { return this._attributeSetter('text', value); }
	get text() { return this._attributeGetter('text'); }

	set disabled(value) { return this._attributeSetter('disabled', value); }
	get disabled() { return this._attributeGetter('disabled'); }

	set readonly(value) { return this._attributeSetter('readonly', value); }
	get readonly() { return this._attributeGetter('readonly'); }

	set selectedIndex(value) { return this._attributeSetter('selectedIndex', value); }
	get selectedIndex() { return this._attributeGetter('selectedIndex'); }

	set src(value) { return this._attributeSetter('src', value); }
	get src() { return this._attributeGetter('src'); }

	set href(value) { return this._attributeSetter('href', value); }
	get href() { return this._attributeGetter('href'); }

	set method(value) { return this._attributeSetter('method', value); }
	get method() { return this._attributeGetter('method'); }

	set style(value) { return new FakeDomPropertyPromise(this, 'style').getProxy(); }
	get style() { return new FakeDomPropertyPromise(this, 'style').getProxy(); }
	
	get classList() { return this._attributeGetter('classList'); }

	set className(value) { return this._attributeSetter('className', value); }
	get className() { return this._attributeGetter('className'); }

	set scrollTop(value) { return this._attributeSetter('scrollTop', value); }
	get scrollTop() { return this._attributeGetter('scrollTop'); }

	set scrollLeft(value) { return this._attributeSetter('scrollLeft', value); }
	get scrollLeft() { return this._attributeGetter('scrollLeft'); }

	set title(value) { return this._attributeSetter('title', value); }
	get title() { return this._attributeGetter('title'); }
	
	get activeElement() { return this._attributeGetter('activeElement'); }
	get options() { return this._attributeGetter('options'); }

	get scrollWidth() { return this._attributeGetter('scrollWidth'); }
	get scrollHeight() { return this._attributeGetter('scrollHeight'); }
	get children() { return this._attributeGetter('children'); }
	get childNodes() { return this._attributeGetter('childNodes'); }
	get parentNode() { return this._attributeGetter('parentNode'); }
	get parentElement() { return this._attributeGetter('parentElement'); }
	get lastChild() { return this._attributeGetter('lastChild'); }
	get lastElementChild() { return this._attributeGetter('lastElementChild'); }
	get nextSibling() { return this._attributeGetter('nextSibling'); }
	get nextElementSibling() { return this._attributeGetter('nextElementSibling'); }
	get previousSibling() { return this._attributeGetter('previousSibling'); }
	get previousElementSibling() { return this._attributeGetter('previousElementSibling'); }
	get nodeName() { return this._attributeGetter('nodeName'); }
	get nodeType() { return this._attributeGetter('nodeType'); }
	get nodeValue() { return this._attributeGetter('nodeValue'); }
	get tagName() { return this._attributeGetter('tagName'); }
	get form() { return this._attributeGetter('form'); }
	
	addEventListener(type, listener, options) {
		if (typeof this._events[type] == 'undefined') {
			this._events[type] = [];
		}
		
		let uuid = getUuid();
		this._events[type].push({
			uuid: uuid,
			func: listener
		});
		
		return this.registerDOMElementEvent(type, listener, options, uuid);
	}
	
	removeEventListener(type, listener, options) {
		
		if (!this._events[type]) {
			return;
		}
		
		for (var i in this._events[type]) {
			if (this._events[type][i].func == listener) {
				let _evt = this._events[type][i];
				
				this._events[type].splice(i, 1);
				
				return this.unRegisterDOMElementEvent(type, _evt.uuid);
			}
		}
	}
}

class FakeWindowWindow extends FakeDomElement {
	window = this;
	
	alert() { return this.callDOMElementMethod('alert', arguments); }
	confirm() { return this.callDOMElementMethod('confirm', arguments); }
	prompt() { return this.callDOMElementMethod('prompt', arguments); }
	open() { return this.callDOMElementMethod('open', arguments); }
	print() { return this.callDOMElementMethod('print', arguments); }
}

class FakeDocumentElement extends FakeDomElement {
	body = new FakeDomElement('document.body');
	
	get forms() { return this._attributeGetter('forms'); }
}

class FakeWindowLocation extends FakeDomElement {
	set href(value) { return this._attributeSetter('href', value); }
	get href() { return this._attributeGetter('href'); }
	
	reload() { return this.callDOMElementMethod('reload'); }
}

class FakeWindowNavigatorClipboard extends FakeDomElement {
	readText() { return this.callDOMElementMethod('readText', arguments); }
}

class FakeWindowLocalstorage extends FakeDomElement {
	key() { return this.callDOMElementMethod('key', arguments); }
	getItem() { return this.callDOMElementMethod('getItem', arguments); }
	setItem() { return this.callDOMElementMethod('setItem', arguments); }
	removeItem() { return this.callDOMElementMethod('removeItem', arguments); }
	clear() { return this.callDOMElementMethod('clear', arguments); }
	
	get length() { return this._attributeGetter('length'); }
}

class FakeWindowNavigator extends FakeDomElement {
	get appCodeName() { return this._attributeGetter('appCodeName'); }
	get appName() { return this._attributeGetter('appName'); }
	get appVersion() { return this._attributeGetter('appVersion'); }
	get cookieEnabled() { return this._attributeGetter('cookieEnabled'); }
	get languages() { return this._attributeGetter('languages'); }
	get product() { return this._attributeGetter('product'); }
	get platform() { return this._attributeGetter('platform'); }
	get userAgent() { return this._attributeGetter('userAgent'); }
	get vendor() { return this._attributeGetter('vendor'); }
	get vendorSub() { return this._attributeGetter('vendorSub'); }
	get clipboard() { return new FakeWindowNavigatorClipboard('navigator.clipboard'); }
}

class FakeDomEvent {
	
	static hashed_events = {};
	
	propagation_stopped = false;
	
	constructor(data) {
		for (var i in data) {
			if (i == '$$$$$_____fakedata_event_hash_____$$$$$') {
				continue;
			}
			this[i] = data[i];
		}
	}
	
	stopPropagation() {
		this.propagation_stopped = true;
	}
	
	stopImmediatePropagation() {
		this.propagation_stopped = true;
	}
	
	preventDefault() {
		console.warn('[Fake Data API] FakeDomEvent.preventDefault does not have any effect. Use { preventDefault: true } option when attaching an event instead. Read more: https://docs.fakedata.pro/writing-code/fakedom-api.html#addeventlistener');
	}
	
	hasPropagationStopped() {
		return this.propagation_stopped;
	}
	
	static retrieveOrCreate(hash, event_data) {
		if (typeof this.hashed_events[hash] == 'undefined') {
			this.hashed_events[hash] = new FakeDomEvent(event_data);
		}
		
		return this.hashed_events[hash];
	}
}

class FakeDom {
	static window;
	static document;
	static location;
	static navigator;
	static localStorage;
	
	window;
	document;
	location;
	navigator;
	localStorage;
	
	constructor() {
		if (!FakeDom.window) {
			FakeDom.window   = new FakeWindowWindow('window')
		}
		
		if (!FakeDom.document) {
			FakeDom.document = new FakeDocumentElement('document')
			FakeDom.window.document = FakeDom.document;
		}
		if (!FakeDom.location) {
			FakeDom.location = new FakeWindowLocation('location')
			FakeDom.window.location = FakeDom.location;
		}
		if (!FakeDom.navigator) {
			FakeDom.navigator = new FakeWindowNavigator('navigator')
			FakeDom.window.navigator = FakeDom.navigator;
		}
		if (!FakeDom.localStorage) {
			FakeDom.localStorage = new FakeWindowLocalstorage('localStorage')
			FakeDom.window.localStorage = FakeDom.localStorage;
		}
		
		this.window = FakeDom.window;
		this.document = FakeDom.document;
		this.location = FakeDom.location;
		this.navigator = FakeDom.navigator;
		this.localStorage = FakeDom.localStorage;
	}
}

function onMessageReceived_DomEventTriggered(data) {
	var event_data = data.event_data;
	if (data.proxy_element_keys) {
		data.proxy_element_keys.forEach(k => {
			if (event_data[k].type == "HTMLElement") {
				event_data[k] = FakeDomElement.getOrCreateFakeDomElement({
					type:       'DOMProxyElement',
					element_id: event_data[k].id
				})
			}
		})
	}
	
	var triggered_el;
	if (data.element.type == 'HTMLElement') {
		triggered_el = FakeDomElement._elements_by_id.get(data.element.id);
	} else if (data.element.type == 'HTMLNativeElement') {
		triggered_el = FakeDom.window;
		
		data.element.id.split('.').forEach(p => {
			triggered_el = triggered_el[p];
		});
	}
	
	triggered_el._events[data.event_type].every(evt => {
		if (typeof evt.func == 'function' && evt.uuid == data.uuid) {
			let fakeDomEvent = FakeDomEvent.retrieveOrCreate(event_data.$$$$$_____fakedata_event_hash_____$$$$$, event_data);
			if (fakeDomEvent.hasPropagationStopped()) {
				return false;
			}
			evt.func.apply(triggered_el, [fakeDomEvent]);
			
		}
		return true;
	});
}

function onMessageReceived_GlobalFuncResponse(data) {
	var promise = getGlobalPromise(data.promise_id);
	if (!promise) {
		return;
	}
	
	promise.resolve(data.data);
}

