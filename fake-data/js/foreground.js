setTimeout(function(){
	var caret = [null, null];
	var target_keyboard_shortcut = generateDefaultKeyboardShortcuts();
	var target_keyboard_shortcut_entire_form = generateDefaultKeyboardShortcutsForEntireForm();
	var current_keyboard_shortcut = [];
	var checkbox_behavior = 'random';
	var select_behavior = 'all';
	var multi_select_behavior = 'random';
	var extra_fake_fields = {};
	var named_fallback_unnamed = false;
	var ignore_empty_fields = false;
	var fill_on_load = false;
	var fill_on_load_urls = [];
	var fill_on_load_urls_type = 'blacklist';
	var fill_on_load_observe_dom = false;
	var form_ignore_autocomplete_off = false;
	var google_forms_fill_warning = true;
	var dev_events = {
		input: [],
		checkbox: [],
		select: []
	};
	var original_fakers = {
		'full_name': true,
		'first_name': true,
		'last_name': true,
		'email': true,
		'username': true,
		'password': true,
		'phone': true,
		'job_title': true,
		'company': true,
		'address': true,
		'city': true,
		'country': true,
		'state': true,
		'zip': true,
		'words': true,
		'sentence': true,
		'paragraph': true,
		'text': true,
		'datetime': true,
		'number': true,
	};
	var custom_integrations = {
		select2: true,
		angular_material: true,
		google_sheets: true,
		public_api_support: true,
		google_forms: true,
		react_select: true,
		vuetify: true,
	};
	
	var registeredElements = {};
	
	var fieldSelector = 'input:not([type=hidden]):not([type=button]):not([type=reset]):not([type=submit]), textarea';
	var fieldSelectorSelect = fieldSelector + ', select';
	
	var thisBrowser = getBrowser();
	
	var registeredEvents = {};
	var registeredInternalEvents = {};
	var fill_session = [];
	var fill_session_type = null;
	var fill_session_id = 0;
	var fill_session_page_id = Math.random().toString(36).substring(2);
	var element_ids = [];
	var ev_fixes = {};
	var selected_unique_elements = [];
	
	var input_fill_history_enabled = true;
	var input_fill_history = new WeakMap();

	chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
		if (msg.type == 'fake') {

			resetFillSession('single');

			var activeElem = 'element_id' in msg && element_ids[msg.element_id] ? element_ids[msg.element_id] : getActiveElement();
			var $activeElem = $(activeElem);

			if ((activeElem.tagName == 'INPUT' && activeElem.type != 'checkbox' && activeElem.type != 'radio' && activeElem.type != 'hidden') || activeElem.tagName == 'TEXTAREA') {
				var return_promise;

				if (typeof msg.callback_before == 'string' && msg.callback_before) {

					if (msg._manifest_version == 3) {
						return_promise = evalMV3CodeInSandbox(msg.callback_before, activeElem);
					} else {
						var callback_before = new Function(msg.callback_before);
						return_promise = callback_before(activeElem);
					}
				}

				if (!return_promise || !return_promise.then) {
					return_promise = new Promise(function (resolve) {
						resolve();
					});
				}

				return_promise.then(function () {
					var text_response = msg.text;

					if (msg.text_type === 'object') {
						var responseObject = JSON.parse(msg.text, functionReviver);
						if (responseObject !== null && responseObject.constructor === Array && typeof responseObject[0] === 'function') {
							var response_callback = new Function('return ' + responseObject[0])();
							responseObject[0] = $activeElem.get(0);
							text_response = response_callback.apply(this, responseObject);
						} else {
							text_response = JSON.stringify(responseObject, functionReplacer);
						}
					} else if (msg.text_type === 'function') {
						var response_callback = new Function('return ' + msg.text)();
						text_response = response_callback.apply(this, [$activeElem.get(0)]);
					}

					if (typeof text_response != 'object' || text_response === null || text_response.constructor != Promise) {
						var text_response_bkp = text_response;
						text_response = new Promise(function(resolve) {
							resolve(text_response_bkp);
						});
					}

					text_response.then(function(text_response) {
						var new_content = '';
						if (msg.insert_method == 'replace') {
							new_content = text_response;
						} else if (msg.insert_method == 'append') {
							new_content = $activeElem.val() + text_response;
						} else if (msg.insert_method == 'prepend') {
							new_content = text_response + $activeElem.val();
						} else if (msg.insert_method == 'cursor') {
							new_content = $activeElem.val().substr(0, caret[1]) + text_response + $activeElem.val().substr(caret[1]);
						}

						new_content = String(new_content);

						if (!isNaN($activeElem.attr('maxlength')) && $activeElem.attr('maxlength').trim() != '' && (!$activeElem.attr('type') || (['color', 'date', 'datetime-local', 'file', 'image', 'month', 'number', 'range', 'time', 'week'].indexOf($activeElem.attr('type').toLowerCase()) < 0))) {
							new_content = new_content.substr(0, parseInt($activeElem.attr('maxlength')));
						}

						if (msg.text_type != 'boolean' || (msg.text_type == 'boolean' && !!msg.text)) {

							addElementUndoHistory($activeElem.get(0), $activeElem.val());

							if (getBrowser() == 'chrome' && $activeElem.is(':focus') && ($activeElem.is(':not(input)') || ($activeElem.is('input') && ['time', 'week', 'date', 'datetime-local', 'month', 'range', 'color'].indexOf($activeElem.attr('type')) < 0))) {
								activeElem.select();
								document.execCommand("insertText", false, new_content);
							} else {
								$activeElem.val(new_content);
							}
						}

						for (var evi = 0; evi < dev_events.input.length; evi++) {
							triggerInputChangeEvent($activeElem.get(0), dev_events.input[evi]);
						}

						let url = getUrl();
						let selector = (activeElem.name || activeElem.id) ? null : getUniqueSelector(activeElem);
						let inputName = activeElem.name || activeElem.id || getUniqueFieldIdentifier(activeElem);
						let inputKind = activeElem.name || activeElem.id ? 'named' : 'unnamed';

						var slctr = getCustomElement(activeElem);
						var storeFakerPromise = null;
						var isCustomElement = false;
						if (slctr && typeof registeredElements[slctr].options.onQuery == 'function') {
							storeFakerPromise = registeredElements[slctr].options.onQuery({
								element: activeElem,
								url: url,
								selector: selector,
								fill_session: fill_session
							});

							isCustomElement = true;

							if (!storeFakerPromise || !storeFakerPromise.then) {
								storeFakerPromise = new Promise(function(resolve) {
									resolve(storeFakerPromise);
								});
							}
						} else {
							storeFakerPromise = new Promise(function(resolve) {
								resolve();
							});
						}

						storeFakerPromise.then(function(data) {
							if (isCustomElement) {
								if (data.selector) {
									selector = data.selector;
								}

								if (data.kind) {
									inputKind = data.kind;
								}

								inputName = getUniqueFieldIdentifier(activeElem, selector, url);

							} else {
								if (inputKind != 'named' && typeof extra_fake_fields[inputName] == 'undefined') {
									var possibleBackwardsCompatbileSelectorFound = hasMatchingRegexField(getUrl(), $activeElem, inputKind);
									if (possibleBackwardsCompatbileSelectorFound) {
										selector = extra_fake_fields[possibleBackwardsCompatbileSelectorFound].selector;
										url = extra_fake_fields[possibleBackwardsCompatbileSelectorFound].url;

										inputName = getUniqueFieldIdentifier(activeElem, selector, url);
									}
								}
							}

							sendMessage({
								url: url,
								selector: selector,
								type: 'store_faker',
								inputName: inputName,
								faker: msg.label,
								kind: inputKind
							});

							if (typeof msg.callback_after == 'string' && msg.callback_after) {
								if (msg._manifest_version == 3) {
									evalMV3CodeInSandbox(msg.callback_after, activeElem);
								} else {
									var callback_after = new Function(msg.callback_after);
									callback_after(activeElem);
								}
							}
						})
					});
				});
			}
		} else if (msg.type == 'refresh_data') {
			refreshData();
		} else if (msg.type == 'browser_action') {

			switch (msg.action) {
				case 'manage_field':
					triggerInputChangeEvent(getActiveElement(), 'fakedataforcerightclick');

					sendMessage({
						type: 'manage_field'
					});

					break;
				case 'fill_input':
					resetFillSession('single');
					fakeDataSingleField($(getActiveElement()));
					break;

				case 'fill_form':
					fakeDataEntireForm($(getActiveElement()));
					break;

				case 'fill_page':
					fakeDataEntirePage();

					break;
			}
		} else if (msg.type == 'find_conflicts') {
			var kind = msg.kind;
			var test;
			var $element = typeof msg.element_id != 'undefined' ? $(element_ids[msg.element_id]) : $(msg.original_selector);
			var _element = $element.get(0);
			var conflicts = [];
			var url = getUrl();

			if (kind == 'named') {
				kind = 'unnamed'; // for named fields, look into unnamed fields database
			}

			if (named_fallback_unnamed) {
				for (var i in extra_fake_fields) {
					try {
						test = false;

						if (extra_fake_fields[i].kind == 'named') {
							continue;
						}

						if (extra_fake_fields[i].kind == kind && extra_fake_fields[i].selector) {
							if (extra_fake_fields[i].regex_enabled && extra_fake_fields[i].regex_expr) {
								let regex = null;

								try {
									regex = new RegExp(extra_fake_fields[i].regex_expr, "i").exec(url);
								} catch (e) {
								}

								if (regex && regex[0] == url) {
									test = true;
								}
							} else if (!extra_fake_fields[i].regex_enabled && extra_fake_fields[i].url == url) {
								test = true;
							}

							if (test) {
								if (extra_fake_fields[i].selector_is_xpath) {
									let xpath_result = document.evaluate(extra_fake_fields[i].selector, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
									let xpath_result_element;

									while (xpath_result_element = xpath_result.iterateNext()) {
										if (xpath_result_element == _element) {

											if (typeof extra_fake_fields[i].inputName == 'undefined') {
												extra_fake_fields[i].inputName = i;
											}

											conflicts.push(extra_fake_fields[i]);
											break;
										}
									}

								} else if ($element.is(extra_fake_fields[i].selector)) {
									if (typeof extra_fake_fields[i].inputName == 'undefined') {
										extra_fake_fields[i].inputName = i;
									}

									conflicts.push(extra_fake_fields[i]);
								}
							}
						}
					} catch (e) {}
				}
			}

			sendResponse({
				found_conflicts: conflicts
			});

		} else if (msg.type == 'test_selector') {
			var valid = false;

			try {
				if ((msg.original_selector || msg.element_id) && msg.new_selector) {
					var $original_selector_elements = typeof msg.element_id != 'undefined' ? $(element_ids[msg.element_id]) : $(msg.original_selector);

					let $new_selector_elements = [];
					if (msg.selector_is_xpath) {
						let xpath_result = document.evaluate(msg.new_selector, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
						let xpath_result_element;

						while (xpath_result_element = xpath_result.iterateNext()) {
							$new_selector_elements.push(xpath_result_element);
						}
					} else {
						$new_selector_elements = $(msg.new_selector).toArray();
					}

					for (let i = 0; i < $original_selector_elements.length; i++) {
						if ($new_selector_elements.includes($original_selector_elements.eq(i).get(0))) {
							valid = true;
							break;
						}
					}
				}
			} catch (e) {}

			sendResponse({
				valid: valid
			});
		} else if (msg.type == 'fill_entire_page') {
			fakeDataEntirePage();
		} else if (msg.type == 'fill_entire_form') {
			if (!msg.selector) {
				return;
			}

			let $element;

			if ('element_id' in msg && element_ids[msg.element_id]) {
				$element = $(element_ids[msg.element_id]);
			} else {
				$element = $(msg.selector);
			}

			if (!$element || !$element.length || !$element.closest('form').length) {
				return;
			}

			fakeDataEntireForm($element, null);
		} else if (msg.type == 'fill_selected_fields') {

			resetFillSession('multiple-fields');

			var selected_fields = getElementsBetweenSelection(fieldSelectorSelect + ',label');
			if (!selected_fields) {
				return;
			}

			var place_fields = [];
			var iter_promise = [];

			selected_fields.forEach(function(el) {
				iter_promise.push(new Promise(function(rez) {
					var $el = $(el);
					var fdinputfield = fakeDataSingleField($el);

					if (fdinputfield && typeof fdinputfield.then === 'function') {
						fdinputfield.then(response => {
							if (response.kind != 'option' && typeof response.is_place != 'undefined' && response.is_place !== false) {
								place_fields.push({
									element: $el.get(0),
									fd_response: response
								});
							}
						}).catch(() => {}).finally(() => rez());
					} else {
						rez();
					}
				}));
			});

			Promise.all(iter_promise).then(() => {
				if (place_fields.length > 0) {

					var place_data = {
						country: [],
						state: [],
						city: [],
					};

					place_fields.forEach(function(itm) {
						if (typeof itm.fd_response.text != 'boolean' && itm.fd_response.text) {
							if (place_data[itm.fd_response.is_place]) {
								place_data[itm.fd_response.is_place].push(itm.fd_response.text);

								if ($(itm.element).is('select')) {
									place_data[itm.fd_response.is_place].push(itm.element.options[itm.element.selectedIndex].text);
								}
							}
						}
					});

					new Promise(function(resolve) {
						sendMessage({
							type: 'cloud.get_place',
							seed: place_data,
							fill_session_id: fill_session_id,
							fill_session_type: fill_session_type,
							fill_session_page_id: fill_session_page_id,
						}, function(response) {

							if (response.place) {
								place_fields.forEach(function(field_item) {
									var response_field = null;
									var thisElement = $(field_item.element);

									switch (field_item.fd_response.is_place) {
										case 'country': response_field = 'country'; break;
										case 'state': response_field = 'state'; break;
										case 'county': response_field = 'county'; break;
										case 'city': response_field = 'city'; break;
										case 'address': response_field = 'street'; break;
										case 'zip': response_field = 'zipcode'; break;
									}

									if ($(field_item.element).is('select')) {
										var aliases = [response.place[response_field]].concat(response.aliases[response_field]).filter(alias => alias).map(alias => alias.toLowerCase());

										var found_element = false;

										$(field_item.element).find('option').each(function() {
											if (aliases.indexOf(this.value.toLowerCase()) >= 0 || aliases.indexOf(this.text.toLowerCase()) >= 0) {
												field_item.fd_response.force_select_option_element = this;
												found_element = true;

												fillSelectField(thisElement, {}, field_item.fd_response).then(() => {}).catch(() => {});

												return false;
											}
										});

										if (!found_element) {
											field_item.fd_response.force_select_option_element = {};
											fillSelectField(thisElement, {}, field_item.fd_response).then(() => {}).catch(() => {});
										}
									} else {
										field_item.fd_response.text = response.place[response_field];
										field_item.fd_response.text_type = typeof field_item.fd_response.text;

										fillInputField(thisElement, {}, field_item.fd_response)
									}
								});
							}

							resolve(response);
						});
					});
				}
			});
		} else if (msg.type == 'get_last_active_element') {
			var activeElement  = getActiveElement();
			var $activeElement = $(activeElement);

			sendResponse({
				element_is_fillable: !!($activeElement.is(fieldSelectorSelect) && !$activeElement.prop('disabled') && !$activeElement.prop('readonly') && $activeElement.is(':visible')),
				element_in_form:     $activeElement.closest('form').length > 0,
				element_tag: activeElement.tagName.toLowerCase(),
				element_type: $activeElement.attr('type') || null,
				elements_in_selection: selected_unique_elements.length > 1 ? selected_unique_elements.length : 0
			});

		} else if (msg.type == 'fill_active_input') {
			var thisElement  = $(getActiveElement());

			var new_content = '';
			var text_response = msg.text;

			if (msg.insert_method == 'replace') {
				new_content = text_response;
			} else if (msg.insert_method == 'append') {
				new_content = thisElement.val() + text_response;
			} else if (msg.insert_method == 'prepend') {
				new_content = text_response + thisElement.val();
			} else if (msg.insert_method == 'cursor') {
				new_content = thisElement.val().substr(0, caret[1]) + text_response + thisElement.val().substr(caret[1]);
			}

			new_content = String(new_content);

			if (!isNaN(thisElement.attr('maxlength')) && thisElement.attr('maxlength').trim() != '' &&
				(!thisElement.attr('type') || (['color', 'date', 'datetime-local', 'file', 'image', 'month', 'number', 'range', 'time', 'week'].indexOf(thisElement.attr('type').toLowerCase()) < 0))
			) {
				new_content = new_content.substr(0, parseInt(thisElement.attr('maxlength')));
			}

			if (msg.text_type != 'boolean' || (msg.text_type == 'boolean' && !!text_response)) {

				addElementUndoHistory(thisElement.get(0), thisElement.val());

				if (getBrowser() == 'chrome' && thisElement.is(':focus') && (thisElement.is(':not(input)') || (thisElement.is('input') && ['time', 'week', 'date', 'datetime-local', 'month', 'range', 'color'].indexOf(thisElement.attr('type')) < 0))) {
					thisElement.get(0).select();
					document.execCommand("insertText", false, new_content);
				} else {
					thisElement.val(new_content);
				}
			}

			var dv_ev = 'input';

			for (var evi = 0; evi < dev_events[dv_ev].length; evi++) {
				triggerInputChangeEvent(thisElement.get(0), dev_events[dv_ev][evi]);
			}
		} else if (msg.type == 'undo_fill_input') {

			var activeElem = 'element_id' in msg && element_ids[msg.element_id] ? element_ids[msg.element_id] : getActiveElement();

			elementUndoValue(activeElem);
		} else if (msg.type == 'undo_fill_form') {

			var activeElem = 'element_id' in msg && element_ids[msg.element_id] ? element_ids[msg.element_id] : getActiveElement();

			if ($(activeElem).closest('form').length) {
				elementGroupUndoValues($(activeElem).closest('form').get(0));
			}
		}
		
		return true;
	});
	
	function liv(callback) {
		sendMessage({
			type: 'get_license_status',
		}, callback);
	}
	
	function getFillSessionId() {
		return fill_session_id;
	}
	
	function getFillSessionType() {
		return fill_session_type;
	}

	function setFillSessionType(type) {
		fill_session_type = type;

		return fill_session_type;
	}

	function resetFillSession(type) {
		fill_session = [];
		setFillSessionType(type);
		fill_session_id++;
		
		chrome.storage.local.get({stats: null}, function(data) {
			if (!data.stats) {
				data.stats = {};
			}
			
			if (!data.stats.fill_sessions) {
				data.stats.fill_sessions = 0;
			}
			
			data.stats.fill_sessions++;
			
			chrome.storage.local.set(data);
		});
	}
	
	function refreshData() {
		return new Promise(function(resolve) {
			chrome.storage.local.get({
				keyboard_shortcut: generateDefaultKeyboardShortcuts(),
				keyboard_shortcut_entire_form: generateDefaultKeyboardShortcutsForEntireForm(),
				checkbox_behavior: 'random',
				select_behavior: 'all',
				multi_select_behavior: 'random',
				named_fallback_unnamed: false,
				ignore_empty_fields: false,
				extra_fields: {},
				dev_events: {
					input: ['input', 'change'],
					checkbox: ['change'],
					select: ['change']
				},
				fill_on_load: false,
				fill_on_load_urls_type: 'blacklist',
				fill_on_load_urls: [],
				fill_on_load_observe_dom: false,
				form_ignore_autocomplete_off: false,
				google_forms_fill_warning: true,
			}, function(data) {
				target_keyboard_shortcut = {
					keyboard: Object.assign([], data.keyboard_shortcut.keyboard).sort(),
					mouse: data.keyboard_shortcut.mouse,
				};
		
				target_keyboard_shortcut_entire_form = {
					keyboard: Object.assign([], data.keyboard_shortcut_entire_form.keyboard).sort(),
					mouse: data.keyboard_shortcut_entire_form.mouse,
				};
		
				checkbox_behavior = data.checkbox_behavior;
				select_behavior = data.select_behavior;
				multi_select_behavior = data.multi_select_behavior;
				named_fallback_unnamed = data.named_fallback_unnamed;
				extra_fake_fields = data.extra_fields;
				ignore_empty_fields = data.ignore_empty_fields;
				fill_on_load = data.fill_on_load;
				fill_on_load_urls_type = data.fill_on_load_urls_type;
				fill_on_load_urls = data.fill_on_load_urls;
				fill_on_load_observe_dom = data.fill_on_load_observe_dom;
				form_ignore_autocomplete_off = data.form_ignore_autocomplete_off;
				google_forms_fill_warning = data.google_forms_fill_warning;
				dev_events = $.extend(true, {}, data.dev_events);
				
				liv(function(response) {
					input_fill_history_enabled = false;
					
					if (response && response.license_status === true) {
						input_fill_history_enabled = true;
					}
					
					resolve();
				});
			});
		});
	}
	
	function reloadLibraries() {
		liv(function(response) {
			if (response && response.license_status === true) {
				chrome.storage.local.get({
					loaded_libraries: []
				}, function (data) {
					
					if (data.loaded_libraries && data.loaded_libraries.length) {
						
						if (getManifestVersion() == 3) {
							sendMessage({
								type: 'init_mv3_code_sandbox',
							})
						} else {
							for(var i = 0; i < data.loaded_libraries.length; i++) {
								if (typeof data.loaded_libraries[i].type == 'undefined' || data.loaded_libraries[i].type != 'foreground') {
									continue;
								}
								
								try {
									eval.call(window, data.loaded_libraries[i].contents);
								} catch(e) {
								}
							}
						}
					}
				});
			}
		});
	}
	
	function reloadIntegrations() {
		liv(function(response) {
			if (response && response.license_status !== true) {
				return;
			}
			
			chrome.storage.local.get({
				custom_integrations: {
					select2: false,
					angular_material: false,
					google_sheets: false,
					public_api_support: false,
					google_forms: false,
					react_select: false,
					vuetify: false,
				}
			}, function (data) {
				
				if (data.custom_integrations.select2) {
					fdIntegrationsSelect2Enable();
					if (getManifestVersion() == 3) {
						sendMessage({
							type: 'run_defined_function_in_main_world',
							func: '_func_fdIntegrationsSelect2Enable'
						});
					}
				}
				
				if (data.custom_integrations.angular_material) {
					fdIntegrationsAngularMaterialEnable();
				}
				
				if (data.custom_integrations.google_sheets) {
					fdIntegrationsGoogleSheets();
					if (getManifestVersion() == 3) {
						sendMessage({
							type: 'run_defined_function_in_main_world',
							func: '_func_fdIntegrationsGoogleSheets'
						});
					}
				}
				
				if (data.custom_integrations.public_api_support) {
					fdIntegrationsPublicApiEnabled();
					if (getManifestVersion() == 3) {
						sendMessage({
							type: 'run_defined_function_in_main_world',
							func: '_func_fdIntegrationsPublicApiEnabled'
						});
					}
				}
				
				if (data.custom_integrations.google_forms) {
					fdIntegrationsGoogleFormsEnable();
				}
				
				if (data.custom_integrations.react_select) {
					fdIntegrationsReactSelectEnable();
				}
				
				if (data.custom_integrations.vuetify) {
					fdIntegrationsVuetifyEnable();
				}
			});
		});
	}
	
	function getUrl() {
		return window.location.origin + window.location.pathname;
	}
	
	function getUniqueSelector(element) {
		var deepSelectors = [];
		var currentDom = element.getRootNode();
		
		while (true) {
			var selector = null;
			
			if (element.tagName == 'INPUT' && element.type == 'radio' && element.name) {
				var $form = $(element).closest('form');
				
				if ($form.length) {
					var $form_index = $('form').index($form);
					selector = 'form:eq('+ $form_index +') [name="' + element.name + '"]';
				} else {
					selector = '[name="' + element.name + '"]';
				}
			}
			
			if (!selector) {
				selector = new CssSelectorGenerator().getSelector(element);
			}
			
			deepSelectors.push(selector);
			
			if (currentDom == document) {
				break;
			}
			
			element = currentDom.host;
			currentDom = currentDom.host.getRootNode();
		}
		
		return deepSelectors.reverse().join(' /deep/ ');
	}
	
	function getUniqueFieldIdentifier(element, selector, url) {
		
		if (typeof selector == 'undefined') {
			selector = getUniqueSelector(element);
		}
		
		if (typeof url == 'undefined') {
			url = getUrl();
		}
		
		return url + '@' + selector;
	}
	
	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	
	function triggerInputChangeEvent(elm, evt) {
		if (!evt) {
			evt = 'input';
		}
		
		var inputEv = document.createEvent("HTMLEvents");
		inputEv.initEvent(evt, true, false);
		
		if (typeof evt == 'object') {
			inputEv = evt.originalEvent;
			inputEv = new inputEv.constructor(evt.type, inputEv);
		}
		
		elm.dispatchEvent(inputEv);
	}
	
	function getCaretPosition(oField) {
	
	  // Initialize
	  var iCaretPos = 0;
	
	  // IE Support
	  if (document.selection) {
	
		// To get cursor position, get empty selection range
		var oSel = document.selection.createRange();
	
		// Move selection start to 0 position
		oSel.moveStart('character', -oField.value.length);
	
		// The caret position is selection length
		iCaretPos = oSel.text.length;
	  }
	
	  // Firefox support
	  else {
		try {
			if (oField.selectionStart || oField.selectionStart == '0')
			  iCaretPos = oField.selectionStart;
		} catch (err) {}
	  }
	
	  // Return results
	  return iCaretPos;
	}
	
	function generateDefaultKeyboardShortcuts() {
		var targetKey;
	
		if (navigator.platform.indexOf('Mac') != -1) {
			targetKey = 'Meta';
		} else {
			targetKey = 'Alt';
		}
	
		return {
			keyboard: [parseKeyboardButton(targetKey)],
			mouse: 'dblclick'
		}
	}
	
	function generateDefaultKeyboardShortcutsForEntireForm() {
		var targetKey;
	
		if (navigator.platform.indexOf('Mac') != -1) {
			targetKey = 'Meta';
		} else {
			targetKey = 'Alt';
		}
	
		return {
			keyboard: [parseKeyboardButton(targetKey), parseKeyboardButton('Shift')],
			mouse: 'dblclick'
		}
	}
	
	function getMetaKeyName() {
		if (navigator.platform.indexOf('Mac') != -1) {
			return 'Cmd';
		} else {
			return 'Windows';
		}
	}
	
	function getBrowser() {
		if (typeof chrome !== "undefined") {
			if (typeof browser !== "undefined") {
				return "firefox";
			} else {
				return "chrome";
			}
		} else {
			return "other";
		}
	}
	
	function parseKeyboardButton(key) {
		if (!key) return false;
	
		var keyPressed = key;
	
		if (keyPressed == " ") {
			keyPressed = "Space";
		}
	
		if (keyPressed == 'Meta') {
			keyPressed = getMetaKeyName();
		}
	
		if (keyPressed.length == 1) {
			keyPressed = keyPressed.toUpperCase();
		}
	
		return keyPressed;
	}
	
	function hasMatchingRegexField(url, $element, kind) {
		var regex;
		var test;
		if (!kind) {
			kind = 'unnamed';
		}

		let element = $element.get(0);
		
		for (var i in extra_fake_fields) {
			test = false;
			
			if (extra_fake_fields[i].kind == kind && extra_fake_fields[i].selector) {
				if (extra_fake_fields[i].regex_enabled && extra_fake_fields[i].regex_expr) {
					regex = null;
					
					try {
						regex = new RegExp(extra_fake_fields[i].regex_expr, "i").exec(url);
					} catch (e) {
					}
					
					if (regex && regex[0] == url) {
						test = true;
					}
				} else if (!extra_fake_fields[i].regex_enabled && extra_fake_fields[i].url == url) {
					test = true;
				}
				
				let _selector = extra_fake_fields[i].selector;
				let _shadow_split = _selector.split('/deep/');
				_selector = _shadow_split[_shadow_split.length-1];
				
				try {
					if (!test) {
						continue;
					}

					if (extra_fake_fields[i].selector_is_xpath) {
						let xpath_result = document.evaluate(_selector, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
						let xpath_result_element;

						while (xpath_result_element = xpath_result.iterateNext()) {
							if (xpath_result_element == element) {
								return i;
							}
						}
					} else if ($element.is(_selector)) {
						return i;
					}
				} catch (e) {
				}
			}
		}
		
		return false;
	}
	
	function keysArePressed(target_shortcut, e) {
		var target_kb = Object.assign([], target_shortcut.keyboard).sort();
	
		if (e) {
			if (e.metaKey !== undefined) {
				let currentKeyPosition = current_keyboard_shortcut.indexOf(getMetaKeyName());
				if (currentKeyPosition >= 0 && !e.metaKey) {
					current_keyboard_shortcut.splice(currentKeyPosition, 1);
				} else if (currentKeyPosition < 0 && e.metaKey) {
					current_keyboard_shortcut.push(getMetaKeyName());
				}
			}
	
			if (e.altKey !== undefined) {
				let currentKeyPosition = current_keyboard_shortcut.indexOf('Alt');
				if (currentKeyPosition >= 0 && !e.altKey) {
					current_keyboard_shortcut.splice(currentKeyPosition, 1);
				} else if (currentKeyPosition < 0 && e.altKey) {
					current_keyboard_shortcut.push('Alt');
				}
			}
	
			if (e.shiftKey !== undefined) {
				let currentKeyPosition = current_keyboard_shortcut.indexOf('Shift');
				if (currentKeyPosition >= 0 && !e.shiftKey) {
					current_keyboard_shortcut.splice(currentKeyPosition, 1);
				} else if (currentKeyPosition < 0 && e.shiftKey) {
					current_keyboard_shortcut.push('Shift');
				}
			}
	
			if (e.ctrlKey !== undefined) {
				let currentKeyPosition = current_keyboard_shortcut.indexOf('Control');
				if (currentKeyPosition >= 0 && !e.ctrlKey) {
					current_keyboard_shortcut.splice(currentKeyPosition, 1);
				} else if (currentKeyPosition < 0 && e.ctrlKey) {
					current_keyboard_shortcut.push('Control');
				}
			}
		}
	
		var current_kb = Object.assign([], current_keyboard_shortcut).sort();
	
		if (target_kb.length != current_kb.length) {
			return false;
		}
	
		for (var i = 0; i < target_kb.length; i++) {
			if (target_kb[i] != current_kb[i]) {
				return false;
			}
		}
	
		return true;
	}
	
	function getElementFillSeed(thisElement) {
		if (!thisElement.is(fieldSelectorSelect) || !thisElement.is(':visible')) {
			return false;
		}
		
		if (ignore_empty_fields && fill_session_type && fill_session_type != 'single' && thisElement.val() !== null && thisElement.val().trim() && (thisElement.is('input[type=checkbox]:checked, input[type=radio]:checked') || !thisElement.is('input[type=checkbox], input[type=radio]'))) {
			return false;
		}
		
		if (thisElement.prop('disabled') || thisElement.prop('readonly')) {
			return false;
		}
		
		if (form_ignore_autocomplete_off) {
			if (thisElement.attr('autocomplete') == 'off') {
				return false;
			}
			
			if (thisElement.closest('form').attr('autocomplete') == 'off') {
				return false;
			}
		}
		
		var extra_data = {};
		
		if (fill_session) {
			fill_session.push(thisElement.get(0));
		}
		
		if (thisElement.attr('type') && typeof thisElement.attr('type') == 'string') {
			if (thisElement.attr('type').toLowerCase() === 'range') {
				extra_data = {
					min: thisElement.attr('min') || 0,
					max: thisElement.attr('max') || 100,
					step: thisElement.attr('step') || 1,
				};
				
				if (parseInt(extra_data.min) > parseInt(extra_data.max)) {
					extra_data.max = extra_data.min;
				}
			}
			
			if (thisElement.attr('type').toLowerCase() === 'number') {
				extra_data = {
					min: thisElement.attr('min') || null,
					max: thisElement.attr('max') || null,
					step: thisElement.attr('step') || 1,
				};
				
				if (extra_data.min !== null && extra_data.max != null && parseInt(extra_data.min) > parseInt(extra_data.max)) {
					extra_data.max = extra_data.min;
				}
			}
			
			if (['date', 'datetime', 'datetime-local', 'month'].indexOf(thisElement.attr('type').toLowerCase()) >= 0) {
				extra_data = {
					min: (thisElement.attr('min') && Date.parse(thisElement.attr('min')) && new Date(thisElement.attr('min'))) || null,
					max: (thisElement.attr('max') && Date.parse(thisElement.attr('max')) && new Date(thisElement.attr('max'))) || null
				};
				
				if (extra_data.min !== null && extra_data.max !== null && extra_data.min > extra_data.max) {
					extra_data.max = extra_data.min;
				}
				
				extra_data.min = extra_data.min !== null ? extra_data.min.toString() : null;
				extra_data.max = extra_data.max !== null ? extra_data.max.toString() : null;
			}
			
			if (thisElement.attr('type').toLowerCase() === 'time') {
				extra_data = {
					min: thisElement.attr('min') || '00:00:00',
					max: thisElement.attr('max') || '23:59:59'
				};
			}
			
			if (thisElement.attr('type').toLowerCase() === 'checkbox') {
				var randomCheckboxOption;
				
				if (thisElement.prop('required')) {
					randomCheckboxOption = checkbox_behavior != 'nothing' ? 1 : 0;
				} else {
					if (checkbox_behavior == 'random') {
						randomCheckboxOption = Math.floor(Math.random() * (1 - 0 + 1)) + 0;
					} else if (checkbox_behavior == 'all') {
						randomCheckboxOption = 1;
					} else if (checkbox_behavior == 'nothing') {
						// do nothing
					}
				}
			}
			
			if (thisElement.attr('type').toLowerCase() === 'radio') {
				
				var randomCheckedRadio;
				var radioElementSiblings = [];
				var radioName = thisElement.attr('name');
				
				if (radioName) {
					if (thisElement.closest('form').length != 0) {
						radioElementSiblings = jQuery.makeArray(thisElement.closest('form').find('input[type=radio][name="'+radioName+'"]'));
					} else {
						radioElementSiblings = jQuery.makeArray($(document).find('input[type=radio][name="'+radioName+'"]'));
					}
				} else {
					radioElementSiblings.push(thisElement.get(0));
				}
				
				if (radioElementSiblings.length > 0) {
					randomCheckedRadio = Math.floor(Math.random() * ((radioElementSiblings.length-1) - 0 + 1)) + 0;
				}
				
				if (checkbox_behavior == 'nothing') {
					randomCheckedRadio = undefined;
				}
				
				if (checkbox_behavior == 'required' && !thisElement.prop('required')) {
					randomCheckedRadio = undefined;
				}
			}
		}
		
		var call_method = 'get_faker';
		var selector = getUniqueSelector(thisElement.get(0));
		var inputLabel = thisElement.closest('label');
		var default_value = null;
		if (!inputLabel.length && thisElement.attr('id')) {
			inputLabel = $('label[for="'+sanitizeId(thisElement.attr('id'))+'"]');
		}
		
		if (!inputLabel.length) {
			inputLabel = null;
		}
		
		var inputKind = thisElement.get(0).name || thisElement.get(0).id ? 'named' : 'unnamed';
		var inputName = thisElement.attr('name') || thisElement.attr('id') || null;
		
		if (thisElement.get(0).tagName == 'SELECT' || (thisElement.get(0).tagName == 'INPUT' && (thisElement.get(0).type == 'checkbox' || thisElement.get(0).type == 'radio'))) {
			inputKind = 'option';
			call_method = 'get_select_option';
			inputName = null;
			
			default_value = thisElement.get(0).type == 'checkbox' ? randomCheckboxOption : {
				checkedRadio: randomCheckedRadio,
				radioSiblings: radioElementSiblings
			};
		}
		if (inputName == null) {
			inputName = getUniqueFieldIdentifier(thisElement.get(0), selector);
		}
		
		element_ids.push(thisElement.get(0));
		var element_id = element_ids.length-1;
		
		var getFakerOptions = {
			url: getUrl(),
			selector: selector,
			type: call_method,
			inputName: inputName,
			placeholder: thisElement.attr('placeholder') || null,
			label: inputLabel ? inputLabel.text().trim() : null,
			kind: inputKind,
			field_type: thisElement.get(0).tagName == 'SELECT' ? 'select' : (typeof thisElement.attr('type') == 'string' ? thisElement.attr('type').toLowerCase() : thisElement.attr('type')),
			extra_data: extra_data,
			default_value: default_value,
			fill_session_id: fill_session_id,
			fill_session_type: fill_session_type,
			fill_session_page_id: fill_session_page_id,
			element_id: element_id,
		};
		
		if (inputKind == 'unnamed' || inputKind == 'option' || (inputKind == 'named' && named_fallback_unnamed)) {
			if ((typeof extra_fake_fields[inputName] == 'undefined' || extra_fake_fields[inputName].kind != inputKind) && typeof original_fakers[inputName] == 'undefined') {
				if (inputKind == 'named') {
					inputKind = 'unnamed';
				}
				var possibleBackwardsCompatbileSelectorFound = hasMatchingRegexField(getUrl(), thisElement, inputKind);
				if (possibleBackwardsCompatbileSelectorFound) {
					getFakerOptions = {
						url: extra_fake_fields[possibleBackwardsCompatbileSelectorFound].url,
						selector: extra_fake_fields[possibleBackwardsCompatbileSelectorFound].selector,
						type: call_method,
						inputName: getUniqueFieldIdentifier(thisElement.get(0), extra_fake_fields[possibleBackwardsCompatbileSelectorFound].selector, extra_fake_fields[possibleBackwardsCompatbileSelectorFound].url),
						placeholder: thisElement.attr('placeholder') || null,
						label: inputLabel ? inputLabel.text().trim() : null,
						kind: inputKind,
						field_type: thisElement.get(0).tagName == 'SELECT' ? 'select' : (typeof thisElement.attr('type') == 'string' ? thisElement.attr('type').toLowerCase() : thisElement.attr('type')),
						extra_data: extra_data,
						default_value: default_value,
						fill_session_id: fill_session_id,
						fill_session_type: fill_session_type,
						fill_session_page_id: fill_session_page_id,
						element_id: element_id,
					};
				}
			}
		}
		
		return getFakerOptions;
	
	}
	
	function fakeDataInputField(thisElement, cbk, fill_session) {
		
		var getFakerOptions = getElementFillSeed(thisElement);
		
		if (!getFakerOptions) {
			return false;
		}
		
		return getFakerInput(thisElement, getFakerOptions, cbk);
	}
	
	function fillInputField(thisElement, options, response) {
		return new Promise((main_promise_resolve, main_promise_reject) => {
			if (response != null) {
				
				var return_promise;
				
				if (typeof response.callback_before == 'string' && response.callback_before) {
					if (response._manifest_version == 3) {
						return_promise = evalMV3CodeInSandbox(response.callback_before, thisElement.get(0));
					} else {
						var callback_before = new Function(response.callback_before);
						return_promise = callback_before(thisElement.get(0));
					}
				}
				
				if (!return_promise || !return_promise.then) {
					return_promise = new Promise(function(resolve) {
						resolve();
					});
				}
				
				return_promise.then(function() {
					var text_response = response.text;
					
					if (response.text_type === 'object') {
						var responseObject = JSON.parse(response.text, functionReviver);
						if (responseObject !== null && responseObject.constructor === Array && typeof responseObject[0] === 'function') {
							var response_callback = new Function('return ' + responseObject[0])();
							responseObject[0] = thisElement.get(0);
							text_response = response_callback.apply(this, responseObject);
						} else {
							text_response = JSON.stringify(responseObject, functionReplacer);
						}
					} else if (response.text_type === 'function') {
						var response_callback = new Function('return ' + response.text)();
						text_response = response_callback.apply(this, [thisElement.get(0)]);
						response.text_type = typeof text_response;
					}
					
					if (typeof text_response != 'object' || text_response === null || text_response.constructor != Promise) {
						var text_response_bkp = text_response;
						text_response = new Promise(function(resolve) {
							resolve(text_response_bkp);
						});
					}
					
					text_response.then(function(text_response) {
						var dv_ev = 'input';
						
						if (options.kind == 'option') {
							if (options.field_type == 'checkbox') {
								var checked_status = options.default_value;
								
								if (response.text === false) {
									checked_status = null;
								} else if (response.text == 'unchecked') {
									checked_status = 0;
								} else if (response.text == 'checked') {
									checked_status = 1;
								}
								
								if (typeof checked_status != 'undefined' && checked_status !== null) {
									
									addElementUndoHistory(thisElement.get(0), thisElement.prop('checked'));
									
									thisElement.prop('checked', checked_status == 1);
								}
								
								dv_ev = 'checkbox';
								
							} else if (options.field_type == 'radio') {
								
								var default_option_checked = null;
								if (options.default_value.checkedRadio !== undefined) {
									default_option_checked = options.default_value.radioSiblings[options.default_value.checkedRadio] || null;
								}
								
								if (response.text === false) {
									default_option_checked = null;
								} else if (response.text !== true) {
									default_option_checked = response.text;
								}
								
								if (typeof default_option_checked != 'undefined' && default_option_checked !== null) {
									
									const radioName = thisElement.attr('name');
									if (radioName) {
										if (thisElement.closest('form').length != 0) {
											let selected_element = thisElement.closest('form').find('input[type=radio][name="'+radioName+'"]:checked').get(0);
											addElementUndoHistory(thisElement.get(0), selected_element, thisElement.closest('form').find('input[type=radio][name="'+radioName+'"]').toArray());
										} else {
											let selected_element = $(document).find('input[type=radio][name="'+radioName+'"]:checked').get(0);
											addElementUndoHistory(thisElement.get(0), selected_element, $(document).find('input[type=radio][name="'+radioName+'"]').toArray());
										}
									} else {
										addElementUndoHistory(thisElement.get(0), undefined);
									}
									
									if (default_option_checked instanceof HTMLElement) {
										$(default_option_checked).prop('checked', true);
										
										thisElement = $(default_option_checked);
									} else {
										for (var rindex = 0; rindex < options.default_value.radioSiblings.length; rindex++) {
											if (options.default_value.radioSiblings[rindex].value == default_option_checked) {
												$(options.default_value.radioSiblings[rindex]).prop('checked', true);
												
												thisElement = $(options.default_value.radioSiblings[rindex]);
												break;
											}
										}
									}
								}
								
								dv_ev = 'checkbox';
							}
							
						} else {
							var new_content = '';
							if (response.insert_method == 'replace') {
								new_content = text_response;
							} else if (response.insert_method == 'append') {
								new_content = thisElement.val() + text_response;
							} else if (response.insert_method == 'prepend') {
								new_content = text_response + thisElement.val();
							} else if (response.insert_method == 'cursor') {
								new_content = thisElement.val().substr(0, caret[1]) + text_response + thisElement.val().substr(caret[1]);
							}
							
							new_content = String(new_content);
							
							if (!isNaN(thisElement.attr('maxlength')) && thisElement.attr('maxlength').trim() != '' &&
								(!thisElement.attr('type') || (['color', 'date', 'datetime-local', 'file', 'image', 'month', 'number', 'range', 'time', 'week'].indexOf(thisElement.attr('type').toLowerCase()) < 0))
							) {
								new_content = new_content.substr(0, parseInt(thisElement.attr('maxlength')));
							}
							
							if (response.text_type != 'boolean' || (response.text_type == 'boolean' && !!text_response)) {
								
								addElementUndoHistory(thisElement.get(0), thisElement.val());
								
								if (getBrowser() == 'chrome' && thisElement.is(':focus') && (thisElement.is(':not(input)') || (thisElement.is('input') && ['time', 'week', 'date', 'datetime-local', 'month', 'range', 'color'].indexOf(thisElement.attr('type')) < 0))) {
									thisElement.get(0).select();
									document.execCommand("insertText", false, new_content);
								} else {
									thisElement.val(new_content);
								}
							}
						}
						
						for (var evi = 0; evi < dev_events[dv_ev].length; evi++) {
							triggerInputChangeEvent(thisElement.get(0), dev_events[dv_ev][evi]);
						}
						
						if (typeof response.callback_after == 'string' && response.callback_after) {
							if (response._manifest_version == 3) {
								evalMV3CodeInSandbox(response.callback_after, thisElement.get(0));
							} else {
								var callback_after = new Function(response.callback_after);
								callback_after(thisElement.get(0));
							}
						}
						
						response.kind = options.kind;
						response.parsed_text = new_content;
						
						main_promise_resolve(response);
						
					});
				});
			} else {
				main_promise_reject(response);
			}
		});
	}
	
	function fillSelectField(thisElement, options, response) {
		return new Promise((main_promise_resolve, main_promise_reject) => {
			if (response != null) {
				
				if ((response.text_type == 'boolean' && response.text === false) || (response.text_type == 'boolean' && (select_behavior == 'nothing' || (select_behavior == 'required' && !thisElement.prop('required'))))) {
					main_promise_reject();
					return;
				}
				
				var return_promise;
				
				if (typeof response.callback_before == 'string' && response.callback_before) {
					if (response._manifest_version == 3) {
						return_promise = evalMV3CodeInSandbox(response.callback_before, thisElement.get(0));
					} else {
						var callback_before = new Function(response.callback_before);
						return_promise  = callback_before(thisElement.get(0));
					}
				}
				
				if (!return_promise || !return_promise.then) {
					return_promise = new Promise(function(resolve) {
						resolve();
					});
				}
				
				return_promise.then(function() {
					var text_response = response.text;
					
					var text_response_bkp = text_response;
					text_response = new Promise(function(resolve) {
						resolve(text_response_bkp);
					});
					
					text_response.then(function(text_response) {
						
						var opts = thisElement.get(0).options;
						var enabled_opts = [];
						var available_opts = [];
						var selected_opt = null;
						
						for (var i = 0; i < opts.length; i++) {
							
							if (opts[i].selected) {
								selected_opt = opts[i];
								if (response.excluded_options.indexOf(opts[i].value) < 0) {
									available_opts.push(opts[i]);
								}
							} else if (!opts[i].disabled && response.excluded_options.indexOf(opts[i].value) < 0) {
								enabled_opts.push(opts[i]);
								available_opts.push(opts[i]);
							}
						}
						
						var found_requested_value = response.force_select_option_element || null;
						
						if (!found_requested_value) {
							if (response.text_type != 'boolean') {
								if (selected_opt != null && selected_opt.value == text_response) {
									found_requested_value = selected_opt;
								} else {
									for (var s = 0; s < enabled_opts.length; s++) {
										if (enabled_opts[s].value == text_response) {
											found_requested_value = enabled_opts[s];
											break;
										}
									}
								}
							}
						}
						
						if (found_requested_value === null && ((!options.multiSelect && enabled_opts.length > 0) || (options.multiSelect && available_opts.length > 0))) {
							if (options.multiSelect) {
								
								let _multi_select_behavior = response.text;
								if (_multi_select_behavior === true) {
									_multi_select_behavior = multi_select_behavior;
								} else if (_multi_select_behavior.substring(0, '$$fd:multi:'.length) == '$$fd:multi:') {
									_multi_select_behavior = _multi_select_behavior.replace('$$fd:multi:', '')
								}
								
								if (_multi_select_behavior == 'all') {
									found_requested_value = available_opts;
								} else if (_multi_select_behavior == 'random') {
									found_requested_value = [];
									available_opts.forEach(el => {
										if (getRandomInt(0,1)) {
											found_requested_value.push(el);
										}
									});
									if (!found_requested_value.length) {
										found_requested_value = available_opts[getRandomInt(0, available_opts.length - 1)];
									}
								} else {
									found_requested_value = available_opts[getRandomInt(0, available_opts.length - 1)];
								}
							} else {
								found_requested_value = enabled_opts[getRandomInt(0, enabled_opts.length - 1)];
							}
						}
						
						if (found_requested_value) {
							
							addElementUndoHistory(thisElement.get(0), Array.from(opts).filter(opt => opt.selected));
							
							if (options.multiSelect) {
								Array.from(opts).forEach(el => {
									el.selected = false;
								});
							}
							
							if (found_requested_value instanceof Array) {
								if (!options.multiSelect) {
									found_requested_value[0].selected = true;
								} else {
									found_requested_value.forEach(el => {
										el.selected = true;
									});
								}
							} else {
								found_requested_value.selected = true;
							}
							
							for (var evi = 0; evi < dev_events.select.length; evi++) {
								triggerInputChangeEvent(thisElement.get(0), dev_events.select[evi]);
							}
						}
						
						if (typeof response.callback_after == 'string' && response.callback_after) {
							if (response._manifest_version == 3) {
								evalMV3CodeInSandbox(response.callback_after, thisElement.get(0));
							} else {
								var callback_after = new Function(response.callback_after);
								callback_after(thisElement.get(0));
							}
						}
						
						if (typeof cbk == 'function') {
							cbk(response, true);
						}
						
						main_promise_resolve(response);
					});
				});
			} else {
				main_promise_reject(response);
			}
		});
	}
	
	function getFakerInput(thisElement, options, cbk) {
		return new Promise((main_promise_resolve, main_promise_reject) => {
			sendMessage(options, function(response) {
				
				if (response != null) {
					if (options.kind != 'option' && typeof response.is_place != 'undefined' && response.is_place !== false && fill_session_type != 'single') {
						var return_promise;
						
						if (typeof response.callback_before == 'string' && response.callback_before) {
							if (response._manifest_version == 3) {
								return_promise = evalMV3CodeInSandbox(response.callback_before, thisElement.get(0));
							} else {
								var callback_before = new Function(response.callback_before);
								return_promise      = callback_before(thisElement.get(0));
							}
						}
						
						if (!return_promise || !return_promise.then) {
							return_promise = new Promise(function(resolve) {
								resolve();
							});
						}
						
						return_promise.then(() => {
							response.callback_before = false;
							
							main_promise_resolve(response);
						});
						
					} else {
						fillInputField(thisElement, options, response).then(data => {
							if (typeof cbk == 'function') {
								var cbk_response         = Object.assign({}, data);
								
								cbk(cbk_response, true);
							}
							
							main_promise_resolve(response);
						}).catch(data => {
							if (typeof cbk == 'function') {
								cbk(data, false);
							}
							main_promise_reject(data);
						});
					}
				} else {
					if (typeof cbk == 'function') {
						cbk(response, false);
					}
					main_promise_reject(response);
				}
			});
		});
		
	}
	
	function fakeDataSelectField(thisElement, cbk, fill_session) {
		
		if (thisElement.prop('tagName') != 'SELECT' || !thisElement.is(':visible')) {
			return false;
		}
		
		if (ignore_empty_fields && fill_session_type && fill_session_type != 'single' && thisElement.val() !== null && thisElement.val().trim()) {
			return false;
		}
		
		if (thisElement.prop('disabled') || thisElement.prop('readonly')) {
			return;
		}
		
		if (form_ignore_autocomplete_off) {
			if (thisElement.attr('autocomplete') == 'off') {
				return false;
			}
			
			if (thisElement.closest('form').attr('autocomplete') == 'off') {
				return false;
			}
		}
		
		if (fill_session) {
			fill_session.push(thisElement.get(0));
		}
		
		let url       = getUrl();
		let selector  = getUniqueSelector(thisElement.get(0));
		let inputName = getUniqueFieldIdentifier(thisElement.get(0), selector);
		
		if (typeof extra_fake_fields[inputName] == 'undefined') {
			var possibleBackwardsCompatbileSelectorFound = hasMatchingRegexField(getUrl(), thisElement, 'option');
			if (possibleBackwardsCompatbileSelectorFound) {
				selector  = extra_fake_fields[possibleBackwardsCompatbileSelectorFound].selector;
				url       = extra_fake_fields[possibleBackwardsCompatbileSelectorFound].url;
				inputName = getUniqueFieldIdentifier(thisElement.get(0), extra_fake_fields[possibleBackwardsCompatbileSelectorFound].selector, extra_fake_fields[possibleBackwardsCompatbileSelectorFound].url);
			}
		}
		
		element_ids.push(thisElement.get(0));
		var element_id = element_ids.length - 1;
		
		var multi_select = thisElement.get(0).hasAttribute('multiple');
		
		return getFakerSelect(thisElement, {
			url:                  url,
			selector:             selector,
			type:                 'get_select_option',
			inputName:            inputName,
			multiSelect:          multi_select,
			fill_session_id:      fill_session_id,
			fill_session_type:    fill_session_type,
			fill_session_page_id: fill_session_page_id,
			element_id:           element_id,
		}, cbk);
	}
	
	function getFakerSelect(thisElement, options, cbk) {
		return new Promise(function(main_promise_resolve, main_promise_reject) {
			sendMessage(options, function(response) {
				
				if ((response.text_type == 'boolean' && response.text === false) || (response.text_type == 'boolean' && (select_behavior == 'nothing' || (select_behavior == 'required' && !thisElement.prop('required'))))) {
					main_promise_reject();
					return;
				}
				
				if (typeof response.is_place != 'undefined' && response.is_place !== false && response.text_type == 'boolean' && fill_session_type != 'single') {
					var return_promise;
					
					if (typeof response.callback_before == 'string' && response.callback_before) {
						if (response._manifest_version == 3) {
							return_promise = evalMV3CodeInSandbox(response.callback_before, thisElement.get(0));
						} else {
							var callback_before = new Function(response.callback_before);
							return_promise      = callback_before(thisElement.get(0));
						}
					}
					
					if (!return_promise || !return_promise.then) {
						return_promise = new Promise(function(resolve) {
							resolve();
						});
					}
					
					return_promise.then(() => {
						response.callback_before = false;
						
						main_promise_resolve(response);
					});
				} else {
					fillSelectField(thisElement, options, response).then(data => {
						if (typeof cbk == 'function') {
							var cbk_response         = Object.assign({}, data);
							
							cbk(cbk_response, true);
						}
						
						main_promise_resolve(response);
					}).catch(data => {
						if (typeof cbk == 'function') {
							cbk(data, false);
						}
						main_promise_reject(data);
					})
				}
				
			});
		})
	}
	
	function fakeDataSingleField(thisElement, event, cbk) {
		
		if (!thisElement.is(':visible')) {
			return;
		}
		
		for (var i in registeredElements) {
			if (fill_session.indexOf(thisElement.get(0)) < 0 && thisElement.is(i)) {
				return fakeDataCustomElement(thisElement.get(0), event, i, fill_session);
			}
		}
		
		if (thisElement.is('label')) {
			var next_try = true;
			try {
				if (thisElement.attr('for') && $('#' + thisElement.attr('for')).length) {
					thisElement = $('#' + thisElement.attr('for'));
					next_try = false;
				}
			} catch (e) {}
			
			if (next_try && !thisElement.attr('for') && thisElement.find('input:first') && thisElement.find('input:first').length) {
				thisElement = thisElement.find('input:first');
			}
		}
		
		if (fill_session.indexOf(thisElement.get(0)) < 0 && thisElement.is(fieldSelectorSelect)) {
			if (thisElement.prop('tagName') == 'SELECT') {
				return fakeDataSelectField(thisElement, cbk);
			} else {
				return fakeDataInputField(thisElement, cbk);
			}
		}
	}
	
	async function fakeDataEntirePage() {
		resetFillSession('page');
		var event = jQuery.Event('browserAction');
		
		fillAllChildrenOfElement($('body'), event);
	}
	
	function checkIfCurrentPageIsGoogleFormEditAndConfirmTheUserWantsToScrewUpAllTheProgress() {
		if (google_forms_fill_warning && location.href.substring(0, 32) == 'https://docs.google.com/forms/d/' && location.pathname.substring(location.pathname.length-5) == '/edit') {
			if (!confirm('A friendly WARNING!!! from Fake Data extension:\n\nYou have triggered a form fill for the entire page that will completely mess up your progress on this form.\n\nAre you sure you want to continue?')) {
				return false; // a tragedy has been prevented. phew!
			}
			
			return true; // Google Form will be screwed, but at least the user agreed to this
		}
		
		return true; // it's safe to continue
	}
	
	async function fakeDataEntireForm(thisElement, event) {
		
		var $form = thisElement.closest('form');
		
		if ($form.length == 0 && thisElement.get(0).getRootNode() != document) {
			var thisElementTmp = thisElement.get(0);
			var currentDoc = thisElementTmp.getRootNode();
			
			while (currentDoc != document || $form.length == 0) {
				thisElementTmp = currentDoc.getRootNode().host;
				
				if (!thisElementTmp) {
					break;
				}
				
				currentDoc = thisElementTmp.getRootNode();
				
				$form = $(thisElementTmp).closest('form');
			}
		}
		
		
		if ($form.length == 0) {
			
			resetFillSession('single');
		
			fakeDataSingleField(thisElement, event);
			
		} else {
			
			resetFillSession('form');
			
			fillAllChildrenOfElement($form, event);
		}
	}
	
	async function fillAllChildrenOfElement($element, event) {
		
		if (!checkIfCurrentPageIsGoogleFormEditAndConfirmTheUserWantsToScrewUpAllTheProgress()) {
			return false;
		}
		
		var last_fill_session = null;
		
		for (;;) {
			var place_fields = [];
			
			while (fill_session.length != last_fill_session) {
				
				last_fill_session = fill_session.length;
				
				await new Promise(async function(resolve) {
					var iter_promise = [];
					
					var filledRadioFields = [];
					
					for (var i in registeredElements) {
						
						var visibleRegisteredElements = $element.find(i).filter(':visible');
						
						for (var j = 0; j < visibleRegisteredElements.length; j++) {
							if (fill_session.indexOf(visibleRegisteredElements[j]) >= 0) {
								continue;
							}
							
							await fakeDataCustomElement(visibleRegisteredElements[j], event, i, fill_session, {
								place_fields: place_fields
							});
						}
					}
					
					getAllInputsInParent($element).each(function() {
						
						if (fill_session.indexOf(this) >= 0) {
							return true;
						}
						
						if ($(this).prop('tagName') == 'SELECT') {
							iter_promise.push(new Promise(function(rez) {
								var fdinputfield = fakeDataSelectField($(this), null, fill_session);
								
								if (fdinputfield && typeof fdinputfield.then === 'function') {
									fdinputfield.then(response => {
										if (typeof response.is_place != 'undefined' && response.is_place !== false) {
											place_fields.push({
												element: this,
												fd_response: response
											});
										}
									}).catch(() => {}).finally(() => rez());
								} else {
									rez();
								}
							}.bind(this)));
						} else {
							if ($(this).prop('tagName') == 'INPUT' && $(this).attr('type') && $(this).attr('type').toLowerCase() == 'radio') {
								fill_session.push(this);
								
								if (filledRadioFields.indexOf($(this).attr('name')) >= 0) {
									return true;
								}
								
								filledRadioFields.push($(this).attr('name'));
							}
							
							iter_promise.push(new Promise(function(rez) {
								var fdinputfield = fakeDataInputField($(this), null, fill_session);
								
								if (fdinputfield && typeof fdinputfield.then === 'function') {
									fdinputfield.then(response => {
										if (response.kind != 'option' && typeof response.is_place != 'undefined' && response.is_place !== false) {
											place_fields.push({
												element: this,
												fd_response: response
											});
										}
									}).catch(() => {}).finally(() => rez());
								} else {
									rez();
								}
							}.bind(this)));
						}
					});
					
					await Promise.all(iter_promise).then(resolve);
					
				});
			}
			
			if (place_fields.length > 0) {
				
				var place_data = {
					country: [],
					state: [],
					city: [],
				};
				
				place_fields.forEach(function(itm) {
					if (typeof itm.fd_response.text != 'boolean' && itm.fd_response.text) {
						
						if (place_data[itm.fd_response.is_place]) {
							place_data[itm.fd_response.is_place].push(itm.fd_response.text);
							
							if ($(itm.element).is('select')) {
								place_data[itm.fd_response.is_place].push(itm.element.options[itm.element.selectedIndex].text);
							}
						}
					}
				});
				
				await new Promise(function(resolve) {
					sendMessage({
						type: 'cloud.get_place',
						seed: place_data,
						fill_session_id: fill_session_id,
						fill_session_type: fill_session_type,
						fill_session_page_id: fill_session_page_id,
					}, function(response) {
						
						if (response.place) {
							place_fields.forEach(function(field_item) {
								var response_field = null;
								var thisElement = $(field_item.element);
								
								switch (field_item.fd_response.is_place) {
									case 'country': response_field = 'country'; break;
									case 'state': response_field = 'state'; break;
									case 'county': response_field = 'county'; break;
									case 'city': response_field = 'city'; break;
									case 'address': response_field = 'street'; break;
									case 'zip': response_field = 'zipcode'; break;
								}

								if (field_item.is_custom_element) {

									field_item.deferred_promise.resolve({
										text: response.place[response_field],
										text_type: typeof field_item.fd_response.text,
										aliases: [response.place[response_field]].concat(response.aliases[response_field]).filter(alias => alias).map(alias => alias.toLowerCase()),
									});

								} else if ($(field_item.element).is('select')) {
									var aliases = [response.place[response_field]].concat(response.aliases[response_field]).filter(alias => alias).map(alias => alias.toLowerCase());
									
									var found_element = false;
									
									$(field_item.element).find('option').each(function() {
										if (aliases.indexOf(this.value.toLowerCase()) >= 0 || aliases.indexOf(this.text.toLowerCase()) >= 0) {
											field_item.fd_response.force_select_option_element = this;
											found_element = true;
											
											fillSelectField(thisElement, {}, field_item.fd_response).then(() => {}).catch(() => {});
											
											return false;
										}
									});
									
									if (!found_element) {
										field_item.fd_response.force_select_option_element = {};
										fillSelectField(thisElement, {}, field_item.fd_response).then(() => {}).catch(() => {});
									}
								} else {
									field_item.fd_response.text = response.place[response_field];
									field_item.fd_response.text_type = typeof field_item.fd_response.text;
									
									fillInputField(thisElement, {}, field_item.fd_response)
								}
							});
						}
						
						resolve(response);
					});
				});
				
			} else {
				break;
			}
		}
	}
	
	function getAllInputsInParent(parent, selector, sort = true) {
		if (!selector) {
			selector = fieldSelectorSelect;
		}
		
		var $parent = $(parent);
		
		var found_elements = $parent.find(selector);

		if ($parent && $parent.get(0) && $parent.get(0).querySelectorAll) {
			$parent.get(0).querySelectorAll('*').forEach(el => {
				let shadowRoot = getElementShadowRoot(el);
				if (shadowRoot) {
					found_elements = $.merge(found_elements, getAllInputsInParent(shadowRoot, selector));
				}
			})
		}

		if (sort) {
			found_elements = found_elements.sort(function(elem1, elem2) {
				if (elem1.tagName == 'SELECT' && elem2.tagName != 'SELECT') {
					return -1;
				} else if (elem2.tagName == 'SELECT' && elem1.tagName != 'SELECT') {
					return 1;
				} else {
					return 0;
				}
			});
		}
		
		return found_elements;
	}
	
	// https://gist.github.com/anvaka/3815296
	function functionReplacer(key, value) {
		if (typeof(value) === 'function') {
			return value.toString();
		}
		return value;
	}
	
	function functionReviver(key, value) {
		if (key === "") return value;
	
		if (typeof value === 'string') {
			var rfunc = /function[^\(]*\(([^\)]*)\)[^\{]*{([^\}]*)\}/,
				match = value.match(rfunc);
	
			if (match) {
				return new Function('return ' + value)();
			}
		}
		return value;
	}
	
	function sendMessage(message, response) {
		try {
			message = JSON.parse(JSON.stringify(message));
			var promise = chrome.runtime.sendMessage(message, response);
			if (promise && promise instanceof Promise) {
				promise.catch(err => {});
			}
		} catch (e) {
			if (e.message.indexOf('Invocation of form runtime.connect') >= 0) {
			
			}
		}
	}
	
	function addEventListener(event, callback) {
		if (typeof registeredEvents[event] == "undefined") {
			registeredEvents[event] = [];
		}
		
		registeredEvents[event].push(callback);
	}
	
	function sleep(milliseconds) {
		var start = new Date().getTime();
		for (var i = 0; i < 1e7; i++) {
			if ((new Date().getTime() - start) > milliseconds){
				break;
			}
		}
	}
	
	function update_active_input(tab_data) {
		
		tab_data.type = 'update_active_input';
		
		sendMessage(tab_data);
		
		sleep(50); // This sucks a lot, even more than a whore, but the only way to make browser wait for context menu to update is to freeze it for 50ms.
	}
	
	function registerElement(selector, options) {
		
		if (typeof registeredElements[selector] != 'undefined') {
			console.error('Fake Data selector "'+ selector +'" already defined.');
			return false;
		}
		
		registeredElements[selector] = {
			selector: selector,
			options: Object.assign({}, {
				isHTMLInput: false,
				isValidElement: null,
				onQuery: null,
				onFill: null,
			}, options || {})
		};
		
		initRegisteredComponentEvents(document, selector, options);
	}
	
	function sanitizeId(id) {
		return id.replace( /([^a-zA-Z0-9])/g, "\\$1" );
	}
	
	function getCustomElement(element) {
		$element = $(element);
		
		for (var slctr in registeredElements) {
			if ($element.is(slctr)) {
				if ($element.is(fieldSelectorSelect) && !registeredElements[slctr].options.isHTMLInput) {
					return false;
				}
				
				return slctr;
			}
		}
		
		return false;
	}
	
	function fakeDataCustomElement(thisElement, event, slctr, fill_session, extra_data = null) {
		
		var promiseResolver = null;
		var returnedPromise = new Promise(function(resolve) {
			promiseResolver = resolve;
		});
		
		var $thisElement = $(thisElement);
		
		if (($thisElement.is(fieldSelectorSelect) || !$thisElement.is(':visible')) && !registeredElements[slctr].options.isHTMLInput) {
			return;
		}
		
		if (form_ignore_autocomplete_off) {
			if ($thisElement.closest('form').attr('autocomplete') == 'off') {
				return false;
			}
		}
		
		var isValidElement = true;
		
		if (typeof registeredElements[slctr].options.isValidElement == 'function') {
			var tmpIsValid = registeredElements[slctr].options.isValidElement(this);
			if (tmpIsValid === false) {
				isValidElement = false;
			}
		}
		
		if (isValidElement && typeof registeredElements[slctr].options.onQuery == 'function') {
			
			fill_session.push(thisElement);
			
			var url = getUrl();
			var selector = getUniqueSelector(thisElement);
			
			var data = registeredElements[slctr].options.onQuery({
				element: thisElement,
				url: url,
				selector: selector,
				fill_session: fill_session
			});
			
			if (!data || !data.then) {
				data = new Promise(function(resolve) {
					resolve(data);
				});
			}
			
			data.then(function(data) {
				
				if (!data) {
					data = {};
				}
				
				if (!data.kind) {
					data.kind = '';
				}
				
				data.kind = data.kind.toLowerCase();
				
				if (data.selector) {
					selector = data.selector;
				}
				
				if (data.kind == 'named' && !data.inputName) {
					data.kind = 'unnamed';
				}
				
				if (['named', 'unnamed', 'option'].indexOf(data.kind) < 0) {
					data.isValidInput = false;
				}
				
				if (data.kind == 'unnamed') {
					data.inputName = getUniqueFieldIdentifier(thisElement, selector, url);
				}
				
				var call_method = 'get_faker';
				if (data.kind == 'option') {
					call_method = 'get_select_option';
				}
				
				var getFakerOptions = {
					url: url,
					selector: data.selector || selector,
					type: call_method,
					inputName: data.inputName || getUniqueFieldIdentifier(thisElement, selector, url),
					kind: data.kind || (data.inputName ? 'named' : 'unnamed'),
					field_type: data.inputType || '',
					isMultiSelect: !!data.isMultiSelect || false,
					fill_session_id: fill_session_id,
					fill_session_type: fill_session_type,
					fill_session_page_id: fill_session_page_id,
				};
				
				if (getFakerOptions.kind != 'named') {
					if (typeof extra_fake_fields[getFakerOptions.inputName] == 'undefined') {
						var possibleBackwardsCompatbileSelectorFound = hasMatchingRegexField(url, $thisElement, getFakerOptions.kind);
						if (possibleBackwardsCompatbileSelectorFound) {
							getFakerOptions = {
								url: extra_fake_fields[possibleBackwardsCompatbileSelectorFound].url,
								selector: extra_fake_fields[possibleBackwardsCompatbileSelectorFound].selector,
								type: call_method,
								inputName: getUniqueFieldIdentifier($thisElement.get(0), extra_fake_fields[possibleBackwardsCompatbileSelectorFound].selector, extra_fake_fields[possibleBackwardsCompatbileSelectorFound].url),
								kind: 'unnamed',
								field_type: data.inputType || '',
								fill_session_id: fill_session_id,
								fill_session_type: fill_session_type,
								fill_session_page_id: fill_session_page_id,
							};
						}
					}
				}
				
				sendMessage(getFakerOptions, function(response) {
					var onFillResult = null;
					
					if (response != null) {

						var return_promise;
						
						if (typeof response.callback_before == 'string' && response.callback_before) {
							if (response._manifest_version == 3) {
								return_promise = evalMV3CodeInSandbox(response.callback_before, $thisElement.get(0));
							} else {
								var callback_before = new Function(response.callback_before);
								return_promise  = callback_before($thisElement.get(0));
							}
						}
						
						if (!return_promise || !return_promise.then) {
							return_promise = new Promise(function(resolve) {
								resolve();
							});
						}
						
						return_promise.then(function() {
							var text_response = response.text;
							
							if (response.text_type === 'object') {
								var responseObject = JSON.parse(response.text, functionReviver);
								if (responseObject !== null && responseObject.constructor === Array && typeof responseObject[0] === 'function') {
									var response_callback = new Function('return ' + responseObject[0])();
									responseObject[0] = $thisElement.get(0);
									text_response = response_callback.apply(this, responseObject);
								} else {
									text_response = JSON.stringify(responseObject, functionReplacer);
								}
							} else if (response.text_type === 'function') {
								var response_callback = new Function('return ' + response.text)();
								text_response = response_callback.apply(this, [$thisElement.get(0)]);
							}
							
							if (typeof text_response != 'object' || text_response === null || text_response.constructor != Promise) {
								var text_response_bkp = text_response;
								text_response = new Promise(function(resolve) {
									resolve(text_response_bkp);
								});
							}
							
							text_response.then(async function(text_response) {

								var new_content = text_response;
								var selector = getUniqueSelector(thisElement);
								
								if (!!response.isMultiSelect && new_content === true) {
									new_content = '$$fd:multi:' + multi_select_behavior;
								}

								if (data.inputType == 'checkbox' && new_content === true) {
									switch (checkbox_behavior) {
										case 'all':
											new_content = 'checked';
											break;
									}
								}

								let place_promise_response = false;
								if (typeof response.is_place != 'undefined' && response.is_place !== false && fill_session_type != 'single' && extra_data && extra_data.place_fields) {
									new_content = new DeferredPromise();

									extra_data.place_fields.push({
										element: thisElement,
										fd_response: response,
										is_custom_element: true,
										custom_element_selector: slctr,
										deferred_promise: new_content,
										text: response.text
									});

								}

								if (response.text_type != 'boolean' || (response.text_type == 'boolean' && !!response.text)) {
									if (typeof registeredElements[slctr].options.onFill == 'function') {
										onFillResult = registeredElements[slctr].options.onFill({
											value: new_content,
											element: thisElement,
											selector: selector,
											event: event,
											fill_session: fill_session,
											fill_session_id: getFillSessionId(),
											fill_session_type: getFillSessionType(),
											isMultiSelect: response.isMultiSelect || false,
											options: data.selectOptions,
											excluded_options: response.excluded_options,
											isCloudPlace: response.is_place || false,
											cloudPlaceAliases: place_promise_response && place_promise_response.aliases ? place_promise_response.aliases : null,
										});
										
										if (onFillResult && onFillResult.then) {
											onFillResult.then(promiseResolver);
										} else {
											promiseResolver(onFillResult);
										}
									} else {
										promiseResolver();
									}
								} else {
									promiseResolver();
								}
								
								if (typeof response.callback_after == 'string' && response.callback_after) {
									if (response._manifest_version == 3) {
										evalMV3CodeInSandbox(response.callback_after, thisElement.get(0));
									} else {
										var callback_after = new Function(response.callback_after);
										callback_after($thisElement.get(0));
									}
								}
							});
						});
					} else {
						if (typeof registeredElements[slctr].options.onFill == 'function') {
							onFillResult = registeredElements[slctr].options.onFill({
								value: null,
								element: thisElement,
								selector: selector,
								event: event,
								fill_session: fill_session,
								fill_session_id: getFillSessionId(),
								fill_session_type: getFillSessionType(),
								isMultiSelect: false,
								options: data.selectOptions,
								excluded_options: [],
								isCloudPlace: false,
							});
							
							if (onFillResult && onFillResult.then) {
								onFillResult.then(promiseResolver);
							} else {
								promiseResolver(onFillResult);
							}
						} else {
							promiseResolver();
						}
					}
				});
			});
		} else {
			promiseResolver();
		}
		
		return returnedPromise;
	}
	
	function $on(dom, event, selector, func) {
		if (typeof selector == 'function') {
			func = selector;
			selector = null;
		}
		
		event.split(' ').forEach(event => dom.addEventListener(event, (function(domm, evnt) {
			return function(ev) {
				let target_element = (ev.composedPath ? ev.composedPath()[0] : (ev.path && ev.path[0])) || ev.target;
				
				if (selector === null || (selector !== null && ($(target_element).is(selector) || $(target_element).closest(selector).length))) {
					
					var event_id = ev.timeStamp + '-' + ev.type + '-' + evnt;
					if (typeof ev_fixes[event_id] == 'undefined') {
						ev_fixes[event_id] = jQuery.event.fix(ev);
						if (!ev_fixes[event_id].path && ev.path) {
							ev_fixes[event_id].path = ev.path;
						}
					}
					
					var actual_target_element = $(target_element).is(selector) ? $(target_element).get(0) : $(target_element).closest(selector).get(0);
					
					if (actual_target_element && typeof actual_target_element.received_events == 'undefined') {
						actual_target_element.received_events = [];
					}
					
					if (!actual_target_element || (actual_target_element && actual_target_element.received_events.indexOf(event_id) < 0)) {
						if (actual_target_element) {
							actual_target_element.received_events.push(event_id);
						}
						
						func.call(actual_target_element, ev_fixes[event_id]);
					}
				}
			}
		})(dom, event), true));
	}
	
	function getActiveElement() {
		var currentActiveElement = document.activeElement;
		let shadowRoot;
		while (shadowRoot = getElementShadowRoot(currentActiveElement)) {
			currentActiveElement = shadowRoot.activeElement;
		}
		
		return currentActiveElement;
	}
	
	function getElementsBetweenSelection(filter_selector) {
		var selection = window.getSelection();
		
		if (selection.type == 'None') {
			return null;
		}
		
		var range = selection.getRangeAt(0);
		
		var allWithinRangeParent;
		if (typeof range.commonAncestorContainer.getElementsByTagName == 'undefined') {
			allWithinRangeParent = [range.commonAncestorContainer.parentNode];
		} else {
			allWithinRangeParent = range.commonAncestorContainer.getElementsByTagName("*");
		}
		
		var allSelected = [];
		var allSelectedSorted = [];
		for (var i=0, el; el = allWithinRangeParent[i]; i++) {
			// The second parameter says to include the element
			// even if it's not fully selected
			if (selection.containsNode(el, true)  && (!filter_selector || (filter_selector && $(el).is(filter_selector)))) {
				allSelected.push(el);
			}
		}
		
		allSelected.forEach(function(elem) {
			if (elem.tagName == 'SELECT') {
				allSelectedSorted.unshift(elem);
			} else {
				allSelectedSorted.push(elem);
			}
		});
		allSelected = allSelectedSorted;
		
		return allSelected || null;
	}
	
	function initEvents(dom) {
		
		$on(dom, 'keydown', function(e) {
			if (!e.key) {
				return false;
			}
			
			var keyPressed = parseKeyboardButton(e.key);
			
			if (keyPressed && current_keyboard_shortcut.indexOf(keyPressed) == -1) {
				current_keyboard_shortcut.push(keyPressed);
			}
		});
		
		$on(dom, 'keyup', function(e) {
			if (!e.key) {
				return false;
			}
			
			var keyPressed = parseKeyboardButton(e.key);
			
			if (keyPressed == 'Cmd') {
				current_keyboard_shortcut = [];
			} else if (keyPressed && current_keyboard_shortcut.indexOf(keyPressed) > -1) {
				current_keyboard_shortcut.splice(current_keyboard_shortcut.indexOf(keyPressed), 1);
			}
		});
		
		$on(dom, 'mousedown', fieldSelector, function(e) {
			caret[0] = caret[1];
			
			caret[1] = getCaretPosition($(this).get(0));
		});
		
		var lastTouchEnd = null;
		$on(dom, 'touchend', function(e) {
			var currentTouchEnd = (new Date()).getTime();
			
			if (lastTouchEnd !== null && currentTouchEnd - lastTouchEnd < 600 && (keysArePressed(target_keyboard_shortcut, e) || keysArePressed(target_keyboard_shortcut_entire_form, e))) {
				lastTouchEnd = null;
				
				let target = (e.composedPath ? e.composedPath()[0] : (e.path && e.path[0])) || e.target;
				
				if ($(target).is(fieldSelectorSelect)) {
					e.preventDefault();
					triggerInputChangeEvent(target, 'fakedatadblclick');
				}
			} else {
				lastTouchEnd = currentTouchEnd;
			}
		});
		
		$on(dom, 'dblclick fakedatadblclick', fieldSelector, function(e) {
			var thisElement = $(this);

			if (keysArePressed(target_keyboard_shortcut, e)) {
				e.stopImmediatePropagation();
				
				resetFillSession('single');
				
				var customElement = getCustomElement(thisElement);
				if (customElement) {
					fakeDataCustomElement(this, e, customElement, fill_session);
				} else {
					fakeDataInputField(thisElement);
				}
			} else if (keysArePressed(target_keyboard_shortcut_entire_form, e)) {
				e.stopImmediatePropagation();
				
				fakeDataEntireForm(thisElement, e);
			}
		});
		
		var lastSelectMouseDown = null;
		$on(dom, 'mousedown', 'select, input[type=range]', function(e) {
			var currentMouseDown = (new Date()).getTime();
			
			if (keysArePressed(target_keyboard_shortcut, e) || keysArePressed(target_keyboard_shortcut_entire_form, e)) {
				if ($(this).is('select') && $(this).attr('multiple')) {
					return true;
				}
				
				if (getBrowser() == 'firefox') {
					if (lastSelectMouseDown !== null && currentMouseDown - lastSelectMouseDown < 600 && (keysArePressed(target_keyboard_shortcut, e) || keysArePressed(target_keyboard_shortcut_entire_form, e))) {
						lastSelectMouseDown = null;
						
						if (keysArePressed(target_keyboard_shortcut, e)) {
							resetFillSession('single');
							fakeDataSingleField($(this), e);
						} else if (keysArePressed(target_keyboard_shortcut_entire_form, e)) {
							fakeDataEntireForm($(this), e);
						}
						
					} else {
						lastSelectMouseDown = currentMouseDown;
					}
				}
				
				e.preventDefault();
			}
		});
		
		$on(dom, 'click', 'input[type=color]', function(e) {
			if (keysArePressed(target_keyboard_shortcut, e) || keysArePressed(target_keyboard_shortcut_entire_form, e)) {
				e.preventDefault();
			}
		});
		
		$on(dom, 'mousedown fakedataforcerightclick', function(e) {
			{
				
				if (e.button != 2 && e.type != 'fakedataforcerightclick') {
					return;
				}
				
				// var element = dom.activeElement;
				var activeElement = (e.composedPath ? e.composedPath()[0] : (e.path && e.path[0])) || e.target;
				var $activeElement = $(activeElement);
				var selector = null;
				var isMultiSelect = false;

				if (getCustomElement($activeElement)) {
					e.type = 'fakedatacustommousedown';
					triggerInputChangeEvent(activeElement, e);
					return;
				}
				
				if (!$activeElement.is(fieldSelectorSelect) && $activeElement.is('label, label *')) {
					if (!$activeElement.is('label')) {
						$activeElement = $activeElement.closest('label');
					}
					
					var next_try = true;
					try {
						if ($activeElement.attr('for') && $('#' + $activeElement.attr('for')).length) {
							activeElement = $('#' + $activeElement.attr('for')).get(0);
							$activeElement = $(activeElement);
							next_try = false;
						}
					} catch (e) {}
					
					if (next_try && !$activeElement.attr('for') && $activeElement.find('input:first') && $activeElement.find('input:first').length) {
						activeElement = $activeElement.find('input:first').get(0);
						$activeElement = $(activeElement);
					}
				} else if (!$activeElement.is(fieldSelectorSelect) && $activeElement.is('option')) {
					$activeElement = $activeElement.closest('select');
					activeElement = $activeElement.get(0);
				}

				let element_fill_seed = getElementFillSeed($activeElement);

				var url = element_fill_seed.url;
				
				var isValidInput = $activeElement.is(fieldSelectorSelect);
				if (isValidInput && ($activeElement.prop('disabled') || $activeElement.prop('readonly'))) {
					isValidInput = false;
				}
				
				if (isValidInput) {
					selector = element_fill_seed.selector;
				}
				
				var select_options_array = [];
				
				if (activeElement.tagName == 'SELECT') {
					var select_options = $activeElement.find('> *');
					isMultiSelect = !!activeElement.multiple;
					
					if (select_options.length) {
						for (var i = 0; i < select_options.length; i++) {
							if (select_options.eq(i).prop('tagName') == 'OPTGROUP') {
								var optgroup_array = [];
								var optgroup_options = select_options.eq(i).find('> *');
								
								for (var j = 0; j < optgroup_options.length; j++) {
									optgroup_array.push({
										text: optgroup_options.get(j).text,
										value: optgroup_options.get(j).value,
										disabled: optgroup_options.get(j).disabled,
									});
								}
								
								select_options_array.push({
									label: select_options.get(i).label,
									options: optgroup_array
								});
							} else {
								select_options_array.push({
									text: select_options.get(i).text,
									value: select_options.get(i).value,
									disabled: select_options.get(i).disabled,
								});
							}
						}
					}
				} else if (activeElement.tagName == 'INPUT' && activeElement.type == 'radio') {
					var radioName = $activeElement.attr('name');
					var radioElementSiblings = [];
					
					if (radioName) {
						if ($activeElement.closest('form').length != 0) {
							radioElementSiblings = $activeElement.closest('form').find('input[type=radio][name="'+radioName+'"]');
						} else {
							radioElementSiblings = $(dom).find('input[type=radio][name="'+radioName+'"]');
						}
					} else {
						radioElementSiblings.push($activeElement.get(0));
					}
					
					for (var i = 0; i < radioElementSiblings.length; i++) {
						
						var inputLabel = $(radioElementSiblings[i]).closest('label');
						if (!inputLabel.length && $(radioElementSiblings[i]).attr('id')) {
							inputLabel = $('label[for="'+sanitizeId($(radioElementSiblings[i]).attr('id'))+'"]');
						}
						
						if (!inputLabel.length) {
							inputLabel = null;
						}
						
						select_options_array.push({
							text: inputLabel ? inputLabel.text() : null,
							value: radioElementSiblings[i].value,
							disabled: radioElementSiblings[i].disabled,
						});
					}
				}
				
				var inputName = element_fill_seed.inputName;
				var inputKind = element_fill_seed.kind;
				
				if (inputKind != 'named' && typeof extra_fake_fields[inputName] == 'undefined') {
					var possibleBackwardsCompatbileSelectorFound = hasMatchingRegexField(getUrl(), $activeElement, inputKind);
					if (possibleBackwardsCompatbileSelectorFound) {
						selector = extra_fake_fields[possibleBackwardsCompatbileSelectorFound].selector;
						url = extra_fake_fields[possibleBackwardsCompatbileSelectorFound].url;
					}
				}
				
				var isInsideForm = $activeElement.closest('form').length > 0;
				
				if (isInsideForm && input_fill_history_enabled) {
					let $closest_form = $activeElement.closest('form');
					var elementsInsideForm = $closest_form.find(fieldSelectorSelect).toArray();
					for (let i in registeredElements) {
						elementsInsideForm = elementsInsideForm.concat($closest_form.find(registeredElements[i].selector).toArray());
					}
				}
				
				element_ids.push(activeElement);
				
				var tab_data = {
					url: url,
					selector: selector,
					original_selector: getUniqueSelector(activeElement),
					type: 'update_active_input',
					inputName: inputName,
					kind: inputKind,
					isValidInput: isValidInput,
					isMultiSelect: isMultiSelect,
					inputType: element_fill_seed.field_type,
					selectOptions: activeElement.tagName == 'SELECT' || (activeElement.tagName == 'INPUT' && activeElement.type == 'radio') ? select_options_array : null,
					insideForm: isInsideForm,
					element_id: element_ids.length - 1,
					element_has_history: isValidInput && input_fill_history_enabled ? elementHasUndoHistory(activeElement) : null,
					element_form_has_history: isInsideForm && input_fill_history_enabled ? elementsInsideForm.some(el => {
						return elementHasUndoHistory(el);
					}) : null,
				};

				update_active_input(tab_data);
			}
		});
		
		$on(dom, 'dblclick fakedatadblclick', 'select', function(e) {
			var thisElement = $(this);
			
			if (keysArePressed(target_keyboard_shortcut, e)) {
				resetFillSession('single');
				fakeDataSelectField(thisElement).then(() => {}).catch(() => {});
			} else if (keysArePressed(target_keyboard_shortcut_entire_form, e)) {
				fakeDataEntireForm(thisElement, e);
			}
		});
		
		$on(dom, 'selectionchange', function() {
			var selected_elements = getElementsBetweenSelection(fieldSelectorSelect + ',label');
			selected_unique_elements = [];
			
			if (selected_elements) {
				selected_elements.forEach(function(el) {
					$el = $(el);
					
					if ($el.is('label')) {
						var next_check = true;
						try {
							if ($el.attr('for') && $('#' + $el.attr('for')).length) {
								$el = $('#' + $el.attr('for'));
								next_check = false;
							}
						} catch (e) {}
						
						if (next_check && !$el.attr('for') && $el.find('input:first') && $el.find('input:first').length) {
							$el = $el.find('input:first');
						}
					}
					
					if ($el.is(fieldSelectorSelect)) {
						var el = $el.get(0);
						if (selected_unique_elements.indexOf(el) < 0) {
							selected_unique_elements.push(el);
						}
					}
				});
			}
			
			sendMessage({
				type: 'selection_changed',
				total_input_elements: selected_unique_elements.length
			});
		});
	}
	
	function initRegisteredComponentEvents(dom, selector, options) {
		$on(dom, 'mousedown fakedatacustommousedown', selector, (function(slctr){
			return function(e) {
				var activeElement = this;
				
				if (e.button != 2) {
					return;
				}
				
				if ($(this).is(fieldSelectorSelect) && !registeredElements[slctr].options.isHTMLInput) {
					return;
				}
				
				var isValidElement = true;
				
				if (typeof registeredElements[slctr].options.isValidElement == 'function') {
					var tmpIsValid = registeredElements[slctr].options.isValidElement(activeElement);
					if (tmpIsValid === false) {
						isValidElement = false;
					}
				}
				
				e.stopImmediatePropagation();
				
				if (isValidElement && typeof registeredElements[slctr].options.onQuery == 'function') {
					
					var url = getUrl();
					var selector = getUniqueSelector(activeElement);
					
					var data = registeredElements[slctr].options.onQuery({
						element: activeElement,
						url: url,
						selector: selector,
						fill_session: fill_session
					});
					
					if (!data || !data.then) {
						data = new Promise(function(resolve) {
							resolve(data);
						});
					}
					
					sleep(50);
					
					var isInsideForm = $(activeElement).closest('form').length > 0;
					var wait_id = null;
					
					if (isInsideForm && input_fill_history_enabled) {
						let $closest_form = $(activeElement).closest('form');
						var elementsInsideForm = $closest_form.find(fieldSelectorSelect).toArray();
						for (let i in registeredElements) {
							elementsInsideForm = elementsInsideForm.concat($closest_form.find(registeredElements[i].selector).toArray());
						}
					}
					
					if (getManifestVersion() == 3) {
						wait_id = getUuid();
						
						sendMessage({
							type: 'update_active_input_pending',
							isValidInput: true,
							insideForm: isInsideForm,
							wait_id: wait_id,
							custom_element_selector: slctr,
							element_has_history: isValidElement && input_fill_history_enabled ? elementHasUndoHistory(activeElement) : null,
							element_form_has_history: isInsideForm && input_fill_history_enabled ? elementsInsideForm.some(el => {
								return elementHasUndoHistory(el);
							}) : null,
						});
					}
					
					data.then(function(data) {
						if (!data) {
							data = {};
						}
						
						if (!data.kind) {
							data.kind = '';
						}
						
						data.kind = data.kind.toLowerCase();
						
						if (data.selector) {
							selector = data.selector;
						}
						
						if (data.kind == 'named' && !data.inputName) {
							data.kind = 'unnamed';
						}
						
						if (['named', 'unnamed', 'option'].indexOf(data.kind) < 0) {
							data.isValidInput = false;
						}
						
						if (data.kind == 'unnamed') {
							data.inputName = getUniqueFieldIdentifier(activeElement, selector, url);
						}
						
						element_ids.push(activeElement);
						
						update_active_input({
							url: url,
							selector: data.selector || selector,
							type: 'update_active_input',
							inputName: data.inputName || getUniqueFieldIdentifier(activeElement, selector, url),
							kind: data.kind || (data.inputName ? 'named' : 'unnamed'),
							isValidInput: !!data.isValidInput,
							inputType: data.inputType || '',
							isMultiSelect: !!data.isMultiSelect || false,
							selectOptions: data.kind == 'option' ? (data.selectOptions || []) : null,
							insideForm: isInsideForm,
							element_id: element_ids.length - 1,
							wait_id: wait_id,
							element_has_history: isValidElement && input_fill_history_enabled ? elementHasUndoHistory(activeElement) : null,
							element_form_has_history: isInsideForm && input_fill_history_enabled ? elementsInsideForm.some(el => {
								return elementHasUndoHistory(el);
							}) : null,
						});
					});
				}
			}
		})(selector));
		
		$on(dom, 'dblclick fakedatadblclick fakedatacustomdblclick', selector, (function(slctr){
			return function(e) {
				if (keysArePressed(target_keyboard_shortcut, e)) {

					setFillSessionType('single');

					if (fill_session.indexOf(e) >= 0) {
						resetFillSession('single');
						return;
					}

					fill_session.push(e);
					
					fakeDataCustomElement($(this).get(0), e, slctr, []);
				} else if (keysArePressed(target_keyboard_shortcut_entire_form, e)) {

					setFillSessionType('form');

					if (fill_session.indexOf(e) >= 0) {
						resetFillSession('form');
						return;
					}
					
					fakeDataEntireForm($(this), e);
					
					fill_session.push(e);
				}
			}
		})(selector));
	}
	
	function evalMV3CodeInSandbox(js_code, triggered_element = null) {
		return new Promise(function(resolve) {
			
			let data = {
				type: 'run_mv3_code_in_sandbox',
				js_code: js_code,
			};

			if (triggered_element) {
				element_ids.push(triggered_element);
				data.element_id = element_ids.length-1;
			}
			
			sendMessage(data, function(data) {
				if (data && typeof data.text != 'undefined') {
					resolve(data.text);
				} else {
					resolve(true);
				}
			})
		});
	}
	
	function getManifestVersion() {
		return chrome.runtime.getManifest().manifest_version;
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
	
	function elementHasUndoHistory(element) {
		if (!input_fill_history_enabled) {
			return false;
		}
		
		let element_history = input_fill_history.get(element);

		if (!element_history || !element_history.length) {
			return false;
		}
		
		return true;
	}
	
	function addElementUndoHistory(element, old_value, shared_history_elements = null) {
		
		if (!input_fill_history_enabled) {
			return;
		}
		
		let element_history = input_fill_history.get(element);
		
		if (shared_history_elements && !element_history) {
			shared_history_elements.some(el => {
				element_history = input_fill_history.get(el);
				
				return !!element_history;
			});
		}
		
		if (!element_history) {
			element_history = [];
		}
		
		element_history.push(old_value);
		
		input_fill_history.set(element, element_history);
		
		if (shared_history_elements) {
			shared_history_elements.forEach(element => {
				input_fill_history.set(element, element_history);
			});
		}
	}
	
	function elementUndoValue(element) {
		if (!input_fill_history_enabled) {
			return false;
		}
		
		let element_history = input_fill_history.get(element);
		
		if (!element_history || !element_history.length) {
			return false;
		}
		
		let old_value = element_history.pop();
		let events = null;
		let events_element = element;
		
		if (element.tagName.toUpperCase() == 'TEXTAREA') {
			$(element).val(old_value);
			events = dev_events.input;
		} else if (element.tagName.toUpperCase() == 'INPUT') {
			if (element.type.toLowerCase() == 'checkbox') {
				
				if (old_value === true || old_value === false) {
					element.checked = old_value;
					
					events = dev_events.checkbox;
				}
			
			} else if (element.type.toLowerCase() == 'radio') {
				
				let $radio_form = $(element).closest('form');
				
				if (old_value) {
					if (document.hasChildNodes(old_value)) {
						old_value.checked = true;
						
						events_element = old_value;
						events = dev_events.input;
						
					} else {
						let found_other_similar_radio = null;
						
						if ($radio_form.length) {
							found_other_similar_radio = $radio_form.find('input[type=radio]').toArray();
						} else {
							found_other_similar_radio = $(document).find('input[type=radio]').toArray();
						}
						
						if (found_other_similar_radio) {
							found_other_similar_radio = found_other_similar_radio.find(radio => {
								return radio.name == old_value.name && radio.value == old_value.value;
							});
						}
						
						if (found_other_similar_radio) {
							found_other_similar_radio.checked = true;
							events = dev_events.input;
						}
					}
				} else {
					let parent_radio_elements = null;
					if ($radio_form.length) {
						parent_radio_elements = $radio_form.find('input[type=radio]').toArray();
					} else {
						parent_radio_elements = $(document).find('input[type=radio]').toArray();
					}
					
					if (parent_radio_elements) {
						parent_radio_elements.forEach(radio => {
							if (radio.name == element.name) {
								radio.checked = false;
							}
						});
					}
				}
				
			} else {
				$(element).val(old_value);
				events = dev_events.input;
			}
		} else if (element.tagName.toUpperCase() == 'SELECT') {
			
			if (old_value) {
				
				let current_options = Array.from(element.options);
				current_options.forEach(opt => {
					opt.selected = false;
				});
				
				if (old_value instanceof Array) {
					old_value.forEach(option => {
						if (option instanceof HTMLElement) {
							if (current_options.includes(option)) {
								option.selected = true;
							} else {
								current_options.some(opt => {
									if (opt.value == option.value || opt.text == option.text) {
										opt.selected = true;
										return true;
									}
									return false;
								});
							}
						}
					});
				} else {
					current_options.some(opt => {
						if (opt.value == old_value || opt.text == old_value) {
							opt.selected = true;
							return true;
						}
						return false;
					});
				}
				
				events = dev_events.select;
			}
		}
		
		if (events && events instanceof Array) {
			events.forEach(ev => {
				triggerInputChangeEvent(events_element, ev);
			});
		}
		
		input_fill_history.set(element, element_history);
	}
	
	/* --------------------------------------------------------------------- */
	
	$(window).blur(function() {
		current_keyboard_shortcut = [];
	});
	
	window.addEventListener('message',function(event) {
		let event_label = 'fakedata:';
		let event_label_internal = 'fakedatainternal:';
		
		if (event.data.event && event.data.event.substr(0, event_label.length) == event_label) {
			let event_name = event.data.event.substr(event_label.length);
			
			if (typeof registeredEvents[event_name] != 'undefined') {
				for (var i = 0; i < registeredEvents[event_name].length; i++) {
					registeredEvents[event_name][i](event, event_name);
				}
			}
		} else if (event.data.event && event.data.event.substr(0, event_label_internal.length) == event_label_internal) {
			let event_name = event.data.event.substr(event_label_internal.length);
			
			if (typeof registeredInternalEvents[event_name] != 'undefined') {
				for (var i = 0; i < registeredInternalEvents[event_name].length; i++) {
					registeredInternalEvents[event_name][i](event, event_name);
				}
			}
		}
	});
	
	function elementGroupUndoValues(form) {
		let $form = $(form);
		
		let radio_elements_undone = [];
		
		$form.find(fieldSelectorSelect).toArray().forEach(element => {
			if (element.tagName.toUpperCase() == 'INPUT' && element.type.toLowerCase() == 'radio' && element.name != '') {
				if (radio_elements_undone.includes(element.name)) {
					return false;
				}
				
				radio_elements_undone.push(element.name);
			}
			
			elementUndoValue(element);
		});
		
		for (let i in registeredElements) {
			$form.find(registeredElements[i].selector).toArray().forEach(element => {
				elementUndoValue(element);
			});
		}
	}
	
	function getElementShadowRoot(element) {

		if (!element) {
			return null;
		}

		if (element instanceof HTMLElement && chrome.dom && chrome.dom.openOrClosedShadowRoot) {
			try {
				return chrome.dom.openOrClosedShadowRoot(element);
			} catch (e) {}
		}

		if (typeof element.openOrClosedShadowRoot != 'undefined') {
			return element.openOrClosedShadowRoot
		}

		return element.shadowRoot;
	}

	setTimeout(function() {
		let url = window.location.href;
		if (url.startsWith('https://www.fakedata.pro/subscription/success')) {
			sendMessage({
				type: 'cloud.recheck_ultra_license_status'
			});
		} else if (url.match(/^https?:\/\/www\.fakedata\.pro\/oauth\/extension\/?(.*)/) && !url.match(/^https?:\/\/www\.fakedata\.pro\/oauth\/extension\/?$/)) {
			sendMessage({
				type: 'oauth',
				url: url,
			});
		}
	}, 1000);
	
	if (getManifestVersion() <= 2) {
		// for "forward compatibility" with upcoming MV3 update
		try {
			window.fakeDom              = {};
			window.fakeDom.window       = window;
			window.fakeDom.document     = window.document;
			window.fakeDom.location     = window.location;
			window.fakeDom.navigator    = window.navigator;
			window.fakeDom.localStorage = window.localStorage;
		} catch (e) {
		}
	}
	
	/* --------------------------------------------------------------------- */
	
	window.fakeData = {
		getGeneratorValue: function(generator, data, keep_fill_session = false) {
			return new Promise(function(resolve) {
				sendMessage({
					type: 'get_generator_value',
					generator: generator,
					data: data,
					keep_fill_session: keep_fill_session
				}, function(response) {
					if (!response) {
						resolve(null);
						return;
					}
					
					var text_response;
					var activeElem = getActiveElement();
					
					if (response.text_type === 'object') {
						var responseObject = JSON.parse(response.text, functionReviver);
						if (responseObject !== null && responseObject.constructor === Array && typeof responseObject[0] === 'function') {
							var response_callback = new Function('return ' + responseObject[0])();
							responseObject[0] = activeElem;
							text_response = response_callback.apply(this, responseObject);
						} else {
							text_response = JSON.stringify(responseObject, functionReplacer);
						}
					} else if (response.text_type === 'function') {
						var response_callback = new Function('return ' + response.text)();
						text_response = response_callback.apply(this, [activeElem]);
					} else {
						text_response = response.text;
					}
					
					if (typeof text_response != 'object' || text_response === null || text_response.constructor != Promise) {
						var text_response_bkp = text_response;
						text_response = new Promise(function(resolve) {
							resolve(text_response_bkp);
						});
					}
					
					text_response.then(function(text_response) {
						resolve(text_response);
					});
				});
			});
		},
		getFakeValue: function(label, keep_fill_session = false) {
			return new Promise(function(resolve) {
				sendMessage({
					type: 'get_faker_value',
					label: label,
					keep_fill_session: keep_fill_session
				}, function(response) {
					
					if (!response) {
						resolve(null);
						return;
					}
					
					var text_response;
					var activeElem = getActiveElement();
					
					if (response.text_type === 'object') {
						var responseObject = JSON.parse(response.text, functionReviver);
						if (responseObject !== null && responseObject.constructor === Array && typeof responseObject[0] === 'function') {
							var response_callback = new Function('return ' + responseObject[0])();
							responseObject[0] = activeElem;
							text_response = response_callback.apply(this, responseObject);
						} else {
							text_response = JSON.stringify(responseObject, functionReplacer);
						}
					} else if (response.text_type === 'function') {
						var response_callback = new Function('return ' + response.text)();
						text_response = response_callback.apply(this, [activeElem]);
					} else {
						text_response = response.text;
					}
					
					if (typeof text_response != 'object' || text_response === null || text_response.constructor != Promise) {
						var text_response_bkp = text_response;
						text_response = new Promise(function(resolve) {
							resolve(text_response_bkp);
						});
					}
					
					text_response.then(function(text_response) {
						resolve(text_response);
					});
				});
			});
		},
		getGeneratorMatchForElement: function(element) {
			if (getManifestVersion() == 3 && element.element && element.element.type == "DOMProxyElement") {
				element = window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_id.get(element.element.element_id);
				if (element) element = element.el;
			}
			
			return new Promise(resolve => {
				
				if ($(element).is('select')) {
					resolve(null);
					return;
				}
				
				var element_fill_seed = getElementFillSeed($(element));
				
				if (element_fill_seed.type != 'get_faker') {
					resolve(null);
					return;
				}
				
				element_fill_seed.type = 'get_faker_generator_name';
				
				sendMessage(element_fill_seed, function(response) {
					if (!response || !response.generator) {
						resolve(null);
						return;
					}
					
					resolve(response.generator);
				});
			});
		},
		registerElement: registerElement,
		triggerInputChangeEvent: function(element, evt) {
			if (getManifestVersion() == 3 && element.element && element.element.type == "DOMProxyElement") {
				element = window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_id.get(element.element.element_id);
				if (element) element = element.el;
			}
			
			return triggerInputChangeEvent(element, evt);
		},
		sendToBackground: sendMessage,
		addEventListener: addEventListener,
		getUniqueSelector: function(element) {
			if (getManifestVersion() == 3 && element.element && element.element.type == "DOMProxyElement") {
				element = window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_id.get(element.element.element_id);
				if (element) element = element.el;
			}
			
			return getUniqueSelector(element);
		},
		fillElement: function(element) {
			if (getManifestVersion() == 3 && element.element && element.element.type == "DOMProxyElement") {
				element = window.$$$$$_____fakedata_global_store_____$$$$$.dom_elements_by_id.get(element.element.element_id);
				if (element) element = element.el;
			}
			
			resetFillSession('single');
			return new Promise(resolve => {
				fakeDataSingleField($(element), undefined, resolve);
			});
		},
		getGeneratorsList: function() {
			return new Promise(function(resolve) {
				sendMessage({
					type: 'get_generators_list',
				}, function(response) {
					resolve(response);
				});
			});
		},
		getLastGeneratedValue: function(generator) {
			return new Promise(function(resolve) {
				sendMessage({
					type: 'get_last_generated_value',
					generator: generator,
				}, function(response) {
					resolve(response);
				});
			});
		},
		getFillSessionId: getFillSessionId,
		getCachedElementFromId: function(element_id) {
			return element_ids[element_id];
		},
		getManifestVersion: getManifestVersion
	};
	
	initEvents(document);
	refreshData().then(function() {
		if (fill_on_load) {
			
			let current_page_url = window.location.protocol + '//' + window.location.host + window.location.pathname;
			let current_page_search = window.location.search;
			let current_page_hash = window.location.hash;
			
			let found_url = null;
			
			for (let i = 0; i < fill_on_load_urls.length; i++) {
				let current_tmp_page_url = current_page_url;
				let loop_url = fill_on_load_urls[i].url;
				
				if (fill_on_load_urls[i].regex) {
					try {
						let regex = new RegExp('^' + loop_url + '$', 'i').exec(current_tmp_page_url);
						if (regex && regex[0] == current_tmp_page_url) {
							found_url = fill_on_load_urls[i];
							break;
						}
					} catch (e) {}
				} else {
					current_tmp_page_url = current_tmp_page_url.replace(/\/$/, '');
					let loop_url_parts = {search: '', hash: ''};
					
					if (loop_url.includes('#')) {
						loop_url_parts.hash = loop_url.substr(loop_url.indexOf('#'));
						loop_url = loop_url.substr(0, loop_url.indexOf('#'))
					}
					
					if (loop_url.includes('?')) {
						loop_url_parts.search = loop_url.substr(loop_url.indexOf('?'));
						loop_url = loop_url.substr(0, loop_url.indexOf('?'))
					}
					
					loop_url = loop_url.replace(/\/$/, '') + loop_url_parts.search + loop_url_parts.hash;
					
					if (loop_url.includes('?')) {
						current_tmp_page_url += current_page_search;
					}
					
					if (loop_url.includes('#')) {
						current_tmp_page_url += current_page_hash;
					}
					
					if (current_tmp_page_url.substring(0,5) == 'http:') {
						current_tmp_page_url = 'https' + current_tmp_page_url.substring(4);
					}
					
					if (loop_url.substring(0,5) == 'http:') {
						loop_url = 'https' + loop_url.substring(4);
					}
					
					if (current_tmp_page_url == loop_url) {
						found_url = fill_on_load_urls[i];
						break;
					}
				}
			}
			
			if (fill_on_load_urls_type == 'blacklist' && found_url) {
				return;
			} else if (fill_on_load_urls_type == 'whitelist' && !found_url) {
				return;
			}
			
			new Promise(function(resolve) {
				if (document.readyState == 'complete') {
					fakeDataEntirePage();
					resolve();
				} else {
					window.addEventListener('load', function() {
						fakeDataEntirePage();
						resolve();
					});
				}
			}).then(function() {
				if (fill_on_load_observe_dom) {
					var event = jQuery.Event('mutationObserver');
					
					new MutationObserver(function(mutationsList, observer) {
						if (!mutationsList.length) {
							return;
						}
						
						setTimeout(async function() {
							for (var i = 0; i < mutationsList.length; i++) {
								if (!mutationsList[i].addedNodes || mutationsList[i].addedNodes.length == 0) {
									continue;
								}
								
								for (var j = 0; j < mutationsList[i].addedNodes.length; j++) {
									let $_newly_added_element = $(mutationsList[i].addedNodes[j]);
									if ($_newly_added_element.is(fieldSelectorSelect) && $_newly_added_element.is(':visible')) {
										await fakeDataSingleField($_newly_added_element);
									} else {
										await fillAllChildrenOfElement($_newly_added_element, event);
									}
								}
							}
						}, 100);
						
					}).observe(document, {subtree: true, childList: true, attributes: true, characterData: false});
				}
			})
		}
	});
	reloadIntegrations();
	reloadLibraries();
});
