console.log('Fake Data background script starting', new Date());

var fdata = null;

function FakeData() {
	
	var thisBrowser = getBrowser();
	var lastActivatedElement = null;
	var default_language = 'en_US';
	var insert_method = 'replace';
	var fuzzy_enabled = true;
	var datasets = {};
	var fallback_generator_toggle = true;
	var fallback_generator = 'sentence';
	var fallback_priority = 'fuzzy_first';
	var form_use_same_password = true;
	var form_use_same_password_usages = {};
	var named_fallback_unnamed = false;
	var group_default_generators = false;
	var licd = null;
	var prevlic = null;
	var last_generated_value = {};
	var fill_session_id = -1;
	var fill_session_type = {};
	var fakeDataUltraSubscription = fdUltraSubscription;
	var generator_context_menus = {};
	var mv3_eval_promises = [];
	
	var first_time_loaded = true;

	fdUltraSubscription = {};
	delete fdUltraSubscription;
	
	var contextMenuElements = {
		valid: [],
		invalid: []
	};

	var components_initialized = {
		contextMenus: false
	}

	function reflic() {

		if (lic && prevlic == lic) {
			return;
		}

		licd = null;
		if (lic) {
			licd = dl(lic);
			liv();

			prevlic = lic;

			fakeDataUltraSubscription.setLicenseKey(lic, licd);
				fakeDataUltraSubscription.refsub(lic).then(() => {
					fakeDataUltraSubscription.stopPollingForData();
					fakeDataUltraSubscription.startPollingForData();
				}).catch(console.log);
		}
	}

	function liv() {
		fakeDataUltraSubscription.setIsLicenseValid(false);

		if (!lic || !licd) {
			return false;
		}

		if (typeof licd != 'object') {
			return false;
		}

		if (typeof licd.type == 'undefined') {
			var required_fields = ['name', 'email', 'expire', 'seed'];
			for (var i = 0; i < required_fields.length; i++) {
				if (typeof licd[required_fields[i]] == 'undefined') {
					return false;
				}
			}
		} else if (licd.type != 'license') {
			return false;
		}

		if (licd.expire) {
			var ct = new Date().getTime();

			if (licd.expire * 1000 <= ct) {
				return false;
			}
		}


		var bl_string = licd.email + ' ' + licd.name + ' ' + licd.seed;
		var blacklisted_keys = [
			'5f142a96f95325b0d33abe6d3d6e30f1',
			'14c5239154ddba8f48e03d39cdfc08d0',
			'bc4f18021cb18b6fa27890979b7156e3',
			'0fb722413c0e00086a2a26ab6c6f44ab',
			'513366db29d2bdfd20487f349752da0a',
			'bf14e83533643eb984ad3ac0e18131dc',
			'6050c818a25c1f57fe168ba049a223e1',
			'ca0a3da3410c25b2f2d2d7f877c33f7c',
			'197986d7ac99fdb964aa80c6a746d6ce',
			'd7ae2e041983aff3314a73613e3013de',
			'37df1f20568da2ec19a5d73e5b261d71',
			'c0bbef9407a1359a2cde262be1c11e63',
			'cd3d5e3f7b84e1dae265899b57727908',
			'07399b2f668581e63ce0b80a3c4c8b06',
			'fe3010a24a5d404cecacda9be701408e',
		];

		if (blacklisted_keys.indexOf(md5(bl_string)) >= 0) {
			return false;
		}

		fakeDataUltraSubscription.setIsLicenseValid(true);

		return true;
	}

	function changeLocale(faker_language) {
		if (!faker_language) {
			faker_language = default_language;
		}

		faker.locale = faker_language;
		moment.locale(faker_to_moment_locales[faker.locale]);
	}

	function resetFakers() {
		fakers = {};
		for (var i in original_fakers) {
			fakers[i] = {
				label: original_fakers[i].label,
				callback: original_fakers[i].callback
			};
		}
	}

	function onReceiveMessage (msg, sender, sendResponse) {

		changeLocale(default_language);

		if (typeof msg.fill_session_id != 'undefined') {
			fill_session_id = sender.frameId + '-' + sender.tab.id + '-' + msg.fill_session_id;

			if (typeof msg.fill_session_page_id != 'undefined') {
				fill_session_id += msg.fill_session_page_id;
			}
		}

		if (typeof msg.fill_session_type != 'undefined') {
			fill_session_type[fill_session_id] = msg.fill_session_type;
		}

		if (msg.type == 'get_faker') {
			var inputName = msg.inputName;

			if (typeof extra_fake_fields[msg.url + '@' + msg.selector] != 'undefined') {
				inputName = msg.url + '@' + msg.selector;
			}

			var fake = getFake(inputName, msg, sender);
			var promis;
			var was_promise = false;

			if (fake != null && fake.text_type == 'object' && fake.text.constructor == Promise) {
				promis = fake.text;
				was_promise = true;

				setLastGeneratedValue(fake.label, promis);
			} else {
				promis = new Promise(function(resolve, reject) {
					resolve(fake);
				});
				setLastGeneratedValue(fake.label, fake);
			}

			promis.then(function(data) {
				if (was_promise) {
					fake.text = prepareDataToString(data);
					fake.text_type = typeof data;

				}

				sendResponse(fake);
			});

		} else if (msg.type == 'get_faker_original_callback') {
			var fake = null;

			if (fakers[msg.generator]) {
				if (!msg.keep_fill_session) {
					newFillSessionId('preview');
				} else if (typeof msg.keep_fill_session) {
					fill_session_id = msg.keep_fill_session;
					fill_session_type[fill_session_id] = 'preview';
				}

				fake = getFake(msg.generator, msg, sender);
			}

			if (fake != null && fake.text_type == 'object' && fake.text.constructor == Promise) {
				fake.text_type = undefined;
				promis = fake.text;
			} else {
				promis = new Promise(function(resolve, reject) {
					resolve(fake ? fake.text : null);
				});
			}

			promis.then(function(data) {
				if (fake != null) {
					if (typeof fake.text_type == 'undefined') {
						fake.text = prepareDataToString(data);
					} else {
						fake.text = data;
					}
					fake.text_type = typeof fake.text_type != 'undefined' ? fake.text_type : typeof data;

					if (typeof msg.field_name != 'undefined') {
						setLastGeneratedValue(msg.field_name, fake);
					}
					setLastGeneratedValue(msg.generator, fake);


					sendResponse(fake);
				}
			}).catch(function(data) {
				sendResponse({
					result: data,
					type: 'error'
				});
			});

		} else if (msg.type == 'get_faker_original_callback_enforce') {
			var fake = null;

			if (original_fakers[msg.generator]) {

				newFillSessionId();

				msg.force_original_faker = true;

				fake = getFake(msg.generator, msg, sender);

				if (fake != null && fake.text_type == 'object' && fake.text.constructor == Promise) {
					fake.text_type = undefined;
					promis = fake.text;
				} else {
					promis = new Promise(function(resolve, reject) {
						resolve(fake ? fake.text : null);
					});
				}

				promis.then(function(data) {
					if (fake != null) {
						if (typeof fake.text_type == 'undefined') {
							fake.text = prepareDataToString(data);
						} else {
							fake.text = data;
						}
						fake.text_type = typeof fake.text_type != 'undefined' ? fake.text_type : typeof data;


						if (typeof msg.as_generator != 'undefined') {
							setLastGeneratedValue(msg.as_generator, fake);
						} else {
							setLastGeneratedValue(msg.generator, fake);
						}

						sendResponse(fake);
					}
				}).catch(function(data) {
					sendResponse({
						result: data,
						type: 'error'
					});
				});
			}

		} else if (msg.type == 'store_faker') {
			saveFake(msg);

		} else if (msg.type == 'reload_script') {

			if (getManifestVersion() == 3) {
				refreshData();
			} else {
				location.reload();
			}

		} else if (msg.type == 'exec_script') {

			eval.call(window, msg.code);

		} else if (msg.type == 'refresh_data') {
			refreshData();

			chrome.tabs.query({}, function (tabs) {
				for (var i in tabs) {
					chrome.tabs.sendMessage(tabs[i].id, {type: 'refresh_data'});
				}
			});

		} else if (msg.type == 'update_active_input' || msg.type == 'update_active_input_pending') {
			lastActivatedElement = Object.assign({tab: null, frame: null}, msg);

			lastActivatedElement.pending = msg.type == 'update_active_input_pending';

			if (components_initialized.contextMenus) {
				if (thisBrowser == 'chrome') {
					for (var i = 0; i < contextMenuElements.valid.length; i++) {
						chrome.contextMenus.update(contextMenuElements.valid[i], {
							visible: lastActivatedElement && lastActivatedElement.isValidInput
						});
					}

					for (var i = 0; i < contextMenuElements.invalid.length; i++) {
						chrome.contextMenus.update(contextMenuElements.invalid[i], {
							visible: !lastActivatedElement || !lastActivatedElement.isValidInput,
						});
					}
				} else if (thisBrowser == 'firefox') {
					if (lastActivatedElement && lastActivatedElement.isValidInput) {
						chrome.contextMenus.update(contextMenuElements.valid[0], {
							title: 'Manage Field',
							enabled: true
						});
					} else {
						chrome.contextMenus.update(contextMenuElements.valid[0], {
							title: 'Cannot manage this element',
							enabled: false
						});
					}

				}

				chrome.contextMenus.update(contextMenuElements.valid[1], {
					visible: lastActivatedElement && lastActivatedElement.isValidInput && lastActivatedElement.insideForm,
					enabled: lastActivatedElement && lastActivatedElement.isValidInput && lastActivatedElement.insideForm,
				});

				chrome.contextMenus.update('fakedata_fill_entire_page_context_item', {
					visible: !lastActivatedElement || !lastActivatedElement.isValidInput || !lastActivatedElement.insideForm,
					enabled: !lastActivatedElement || !lastActivatedElement.isValidInput || !lastActivatedElement.insideForm,
				});

				chrome.contextMenus.update('fakedata_undo_form_context_item', {
					visible: lastActivatedElement && lastActivatedElement.element_form_has_history !== null,
					enabled: lastActivatedElement && lastActivatedElement.element_form_has_history,
				});

				chrome.contextMenus.update('fakedata_undo_field_context_item', {
					visible: lastActivatedElement && lastActivatedElement.element_has_history !== null,
					enabled: lastActivatedElement && lastActivatedElement.element_has_history,
				});

				chrome.contextMenus.update('fakedata_separator_5', {
					visible: lastActivatedElement && (lastActivatedElement.element_has_history !== null || lastActivatedElement.element_form_has_history !== null),
				});
			}

			if (lastActivatedElement && sender) {
				lastActivatedElement.tab = sender.tab.id;
				lastActivatedElement.frame = sender.frameId;
			}

			if (lastActivatedElement.wait_id) {
				chrome.tabs.query({}, function (tabs) {
					for (let i in tabs) {
						chrome.tabs.sendMessage(tabs[i].id, {type: 'manage_tab_pending_element_resolved', wait_id: lastActivatedElement.wait_id, last_activated_element: lastActivatedElement});
					}
				});
			}

		} else if (msg.type == 'run_callback') {
			try {
				newFillSessionId();

				var custom_settings = Object.assign({}, msg.field);
				var callback_args = [];

				if (liv()) {
					if (typeof msg == 'object' && msg !== null) {
						if (typeof msg.overwrite_settings == 'object' && msg.overwrite_settings !== null) {
							custom_settings = msg.overwrite_settings;
						}

						if (typeof msg.overwrite_field_settings == 'object' && msg.overwrite_field_settings !== null) {
							if (msg.overwrite_field_settings.extra_callback_after_enabled) {
								custom_settings.extra_callback_after_enabled = true;
								custom_settings.extra_callback_after_code = msg.overwrite_field_settings.extra_callback_after_code;
							}

							if (msg.overwrite_field_settings.extra_callback_before_enabled) {
								custom_settings.extra_callback_before_enabled = true;
								custom_settings.extra_callback_before_code = msg.overwrite_field_settings.extra_callback_before_code;
							}
						}
					}
				}

				var text_return = fdEvaluateCodeBackground.apply({sender: sender}, [msg.callback]);

				if (typeof text_return != 'object' || text_return.constructor != Promise) {
					var text_return_bkp = text_return;
					text_return = new Promise(function(resolve) {
						resolve(text_return_bkp);
					});
				}

				text_return.then(function(text_return) {
					var response = {
						label: 'custom',
						text: prepareDataToString(text_return),
						text_type: typeof text_return,
						insert_method: insert_method,
						callback_before: liv() && custom_settings.extra_callback_before_enabled ? custom_settings.extra_callback_before_code : null,
						callback_after: liv() && custom_settings.extra_callback_after_enabled ? custom_settings.extra_callback_after_code : null,
					};

					if (typeof msg.field_name !== 'undefined') {
						setLastGeneratedValue(msg.field_name, response);
					} else {
						setLastGeneratedValue((typeof msg.field == 'string' ? msg.field : msg.field.label), response);
					}

					sendResponse(response);
				});

				return true;

			} catch (error) {
				sendResponse({type: 'error', result: error.name});
			}
		} else if (msg.type == 'get_select_option') {
			var label = msg.url + '@' + msg.selector;

			if (liv() && typeof extra_fake_fields[label] == 'object' && extra_fake_fields[label].kind == 'option') {

				var text_return = extra_fake_fields[label].optionValue;
				if (text_return === null) {
					text_return = true; // default value of buggy UI dropdown
				}

				if (typeof text_return != 'boolean') {
					text_return = prepareDataToString(text_return);
				}

				var is_place_dropdown = false;
				if (extra_fake_fields[label].extra_select_cloud_place_enabled && liv() && fakeDataUltraSubscription.isSubscriptionActive()) {
					is_place_dropdown = extra_fake_fields[label].extra_select_cloud_place_type;
					if (!is_place_dropdown) {
						is_place_dropdown = 'country'; // default value of buggy UI dropdown
					}
				}

				sendResponse({
					label: label,
					text: text_return,
					is_place: is_place_dropdown,
					text_type: typeof text_return,
					callback_before: liv() && extra_fake_fields[label].extra_callback_before_enabled ? extra_fake_fields[label].extra_callback_before_code : null,
					callback_after: liv() && extra_fake_fields[label].extra_callback_after_enabled ? extra_fake_fields[label].extra_callback_after_code : null,
					excluded_options: liv() && extra_fake_fields[label].excluded_options ? extra_fake_fields[label].excluded_options : [],
					isMultiSelect: msg.isMultiSelect || false,
					_manifest_version: _chrome.manifest_version,
				});
			} else {

				var text_return = true;

				sendResponse({
					label: label,
					text: text_return,
					text_type: typeof text_return,
					callback_before: null,
					callback_after: null,
					excluded_options: [],
					isMultiSelect: msg.isMultiSelect || false,
				});
			}
		} else if (msg.type == 'get_generator_value') {
			if (!msg.keep_fill_session) {
				newFillSessionId('single');
			} else if (typeof msg.keep_fill_session) {
				fill_session_id = msg.keep_fill_session;
				fill_session_type[fill_session_id] = 'code';
			}
			var generatorValue = getGeneratorValue(msg.generator, msg.data, false, sender);

			if (!generatorValue) {
				sendResponse({
					text: prepareDataToString(generatorValue),
					text_type: typeof generatorValue
				});
				return true;
			}

			generatorValue.then(response => {
				sendResponse({
					text: prepareDataToString(response),
					text_type: typeof response
				});
			});
		} else if (msg.type == 'get_last_generated_value') {
			self.getLastGeneratedValue(msg.generator).then(sendResponse);
		} else if (msg.type == 'get_license_status') {
			sendResponse({
				license_status: liv()
			});
		} else if (msg.type == 'get_generators_list') {
			var fkrs = {
				default: [],
				custom: []
			};

			for (var i in fakers) {
				if (i.substr(0, 16).toLowerCase() == 'fake data cloud/') {
					continue;
				}

				if (i.substr(0, 10).toLowerCase() == 'fake data/') {
					continue;
				}

				var which = 'default';

				if (typeof original_fakers[i] == 'undefined') {
					which = 'custom';
				}

				fkrs[which].push(i);
			}

			sendResponse({
				fakers: fkrs
			});
		} else if (msg.type == 'get_faker_value') {
			if (!msg.keep_fill_session) {
				newFillSessionId('single');
			} else if (typeof msg.keep_fill_session) {
				fill_session_id = msg.keep_fill_session;
				fill_session_type[fill_session_id] = 'code';
			}

			self.getFakeValue(msg.label, null, sender).then(response => {
				sendResponse({
					text: prepareDataToString(response),
					text_type: typeof response
				});
			});
		} else if (msg.type == 'has_chrome_permission') {
			chrome.permissions.contains({
				permissions: [msg.permission],
			}, sendResponse);
		} else if (msg.type == 'selection_changed') {

			var show_menu_item = !!(msg.total_input_elements && msg.total_input_elements > 0);
			var show_menu_item_total = show_menu_item ? msg.total_input_elements : 0;

			chrome.contextMenus.update('fakedata_fill_selected_fields_context_item', {
				visible: show_menu_item,
				enabled: show_menu_item,
				title: "Fill " + show_menu_item_total + " selected fields",
			});
		} else if (msg.type.substr(0, 6) == 'cloud.') {
			fakeDataUltraSubscription.onReceiveMessage(msg, sender, function(data) {

				if (msg.type == 'cloud.get_place' && data && data.place) {
					setLastGeneratedValue('country', {text: data.place.country});
					setLastGeneratedValue('state', {text: data.place.state});
					setLastGeneratedValue('city', {text: data.place.city});
					setLastGeneratedValue('address', {text: data.place.street});
					setLastGeneratedValue('zip', {text: data.place.zipcode});
				}

				sendResponse(data);
			});
		} else if (msg.type == 'manage_field') {
			manageActiveField();
		} else if (msg.type == 'get_faker_generator_name') {
			var inputName = msg.inputName;

			if (typeof extra_fake_fields[msg.url + '@' + msg.selector] != 'undefined') {
				inputName = msg.url + '@' + msg.selector;
			}

			sendResponse(getFake(inputName, msg, sender));
		} else if (msg.type == 'send_fake_command') {
			fillActiveFieldWithFakeData(msg.generator, msg);
		} else if (msg.type == 'mv3_run_eval_result') {
			mv3_eval_promises[msg.promise_id].resolve(msg.text);
		} else if (msg.type == 'run_mv3_code_in_sandbox') {

			fdEvaluateCodeBackground.apply({sender: sender, element_id: msg && msg.element_id}, [msg.js_code]).then(function(result) {
				sendResponse({
					text: result,
					text_type: typeof result,
				})
			});
		} else if (msg.type == 'init_mv3_code_sandbox') {

			fdSandboxIframeContentScriptRunner(null, sender);
		} else if (msg.type == 'run_defined_function_in_main_world') {

			let target = {tabId: sender.tab.id};
			if (sender.frameId) {
				target.frameIds = [sender.frameId];
			}

			runDefinedFunctionInMainWorld(target, _contentScripts[msg.func], msg.args || []).then(sendResponse).catch(err => console.error);
		} else if (msg.type == 'call_fakedata_global_func') {

			var parent = fakeData;
			var func_split = msg.func.split('.');

			for (var i in func_split) {
				parent = parent[func_split[i]];
			}

			var result = parent.apply(fakeData, msg.args);

			if (!(result instanceof Promise)) {
				result = Promise.resolve(result);
			}

			result.then(function(data) {
				sendResponse({
					type: 'call_fakedata_global_func_response',
					data: data,
					dataType: typeof data
				}, '*');
			});
		} else if (msg.type == 'oauth') {
			chrome.tabs.update(sender.tab.id, { 'url': 'options/index.html#/settings/developer/datasets?action=addnew&type=gsheets&oauthurl=' + encodeURIComponent(msg.url) });
		}

		return true;
	}

	function refreshData() {

		if (!first_time_loaded && getManifestVersion() == 3) {
			fakeDataUltraSubscription.stopPollingForData();
			fakeDataUltraSubscription.setLicenseKey(null, null);
			fakeDataUltraSubscription.cacheMV3AuthData(null);
		}

		first_time_loaded = false;

		resetFakers();

		getStorageEngine().get({
			extra_fields: {},
			extra_fields_callbacks: {},
			custom_callbacks: {},
			default_generator_checkboxes: {},
			default_generators_settings: {},
			custom_generators: [],
			language: 'en_US',
			insert_method: 'replace',
			fuzzy_enabled: true,
			fallback_generator_toggle: true,
			fallback_generator: 'sentence',
			fallback_priority: 'fuzzy_first',
			form_use_same_password: true,
			named_fallback_unnamed: false,
			icon_action: 'options',
			license_key: null,

			cloud_online: false,
			cloud_notifications: false,
			cloud_notifications_badge: true,
			cloud_notifications_count: {
				emails: 0,
				sms: 0
			},
			group_default_generators: false,
			datasets: {},

			_internal_last_generated_value: {}
		}, function (data) {

			prevlic = null;
			lic = data.license_key;
			icon_action = data.icon_action;

			fakeDataUltraSubscription.setOnline(data.cloud_online);
			fakeDataUltraSubscription.setPreferences({
				cloud_notifications: data.cloud_notifications,
				cloud_notifications_badge: data.cloud_notifications_badge,
				cloud_notifications_count: data.cloud_notifications_count,
			});

			reflic();

			Object.assign(last_generated_value, data._internal_last_generated_value);

			extra_fake_fields = data.extra_fields;
			extra_fields_callbacks = data.extra_fields_callbacks;
			datasets = data.datasets;

			for (var i in data.custom_callbacks) {

				var checkbox = (typeof data.default_generator_checkboxes[i] != 'undefined') ? data.default_generator_checkboxes[i] : null;
				if (checkbox === null) {
					checkbox = typeof data.custom_callbacks[i] != 'undefined';
				}


				if (checkbox === true) {
					try {
						fakers[i].callback = (function(callback) {
							return function() {
								var arg_array = Array.from(arguments);
								arg_array.unshift(callback);
								return fdEvaluateCodeBackground.apply(this, arg_array);
							}
						})(data.custom_callbacks[i]);
					} catch (e) {
						fakers[i].callback = function() {
							var arg_array = Array.from(arguments);
							arg_array.unshift(null);
							return fdEvaluateCodeBackground.apply(this, arg_array);
						}
					}
				}
			}

			for (var i in data.default_generator_checkboxes) {
				if (data.default_generator_checkboxes[i] == 'cloud_emails') {
					fakers[i].callback = fakeDataUltraSubscription.getFakerUltraDefines().emailAddress.callback;
				} else if (data.default_generator_checkboxes[i] == 'cloud_phone') {
					fakers[i].callback = fakeDataUltraSubscription.getFakerUltraDefines().phone.callback;
				} else if (data.default_generator_checkboxes[i] == 'cloud_country') {
					fakers[i].callback = fakeDataUltraSubscription.getFakerUltraDefines().country.callback;
				} else if (data.default_generator_checkboxes[i] == 'cloud_state') {
					fakers[i].callback = fakeDataUltraSubscription.getFakerUltraDefines().state.callback;
				} else if (data.default_generator_checkboxes[i] == 'cloud_city') {
					fakers[i].callback = fakeDataUltraSubscription.getFakerUltraDefines().city.callback;
				} else if (data.default_generator_checkboxes[i] == 'cloud_address') {
					fakers[i].callback = fakeDataUltraSubscription.getFakerUltraDefines().address.callback;
				} else if (data.default_generator_checkboxes[i] == 'cloud_zip') {
					fakers[i].callback = fakeDataUltraSubscription.getFakerUltraDefines().zip.callback;
				} else if (data.default_generator_checkboxes[i] == 'dataset') {
					fakers[i].callback = (_generator => {
						return () => {
							return fakeData.getDatasetValue(data.default_generators_settings[_generator].dataset.dataset, data.default_generators_settings[_generator].dataset.column);
						}
					})(i);
				}
			}

			for (var i in data.custom_generators) {
				fakers[data.custom_generators[i].label] = Object.assign({}, data.custom_generators[i]);

				if (fakers[data.custom_generators[i].label].generator == 'dataset') {
					fakers[data.custom_generators[i].label].callback = (_generator => {
						return () => {
							return fakeData.getDatasetValue(fakers[data.custom_generators[_generator].label].dataset.dataset, fakers[data.custom_generators[_generator].label].dataset.column);
						}
					})(i);
				} else {
					try {
						fakers[data.custom_generators[i].label].callback = (function(callback) {
							return function() {
								var arg_array = Array.from(arguments);
								arg_array.unshift(callback);
								return fdEvaluateCodeBackground.apply(this, arg_array);
							}
						})(data.custom_generators[i].callback);
					} catch (e) {
						fakers[data.custom_generators[i].label].callback = function() {
							var arg_array = Array.from(arguments);
							arg_array.unshift(null);
							return fdEvaluateCodeBackground.apply(this, arg_array);
						}
					}
				}
			}

			for (var i in data.default_generators_settings) {
				if (!fakers[i]) {
					fakers[i] = {};
				}

				Object.assign(fakers[i], data.default_generators_settings[i]);
			}

			default_language = data.language;

			changeLocale(data.language);
			insert_method = data.insert_method;
			fuzzy_enabled = data.fuzzy_enabled;
			fallback_generator_toggle = data.fallback_generator_toggle;
			fallback_generator = data.fallback_generator;
			fallback_priority = fuzzy_enabled ? data.fallback_priority : 'fallback_first';
			form_use_same_password = data.form_use_same_password;
			named_fallback_unnamed = data.named_fallback_unnamed;
			contextMenuElements = {
				valid: [],
				invalid: []
			};
			group_default_generators = data.group_default_generators;

			if (_chrome.browserAction && _chrome.browserAction.setPopup) {
				if (data.icon_action == 'popup') {
					_chrome.browserAction.setPopup({
						popup: 'options/index.html#/popup/main'
					});
				} else {
					_chrome.browserAction.setPopup({
						popup: ''
					});
				}
			}

			chrome.contextMenus.removeAll(function () {
				var separator_added = 0;

				chrome.contextMenus.create({
					type: "normal",
					contexts: ["page", "editable", "frame", "link", "selection"],
					title: "Fake Data",
					id: "fakedata_parent_context"
				}, function () {
					contextMenuElements.valid.push(chrome.contextMenus.create({
						id: 'fakedata_manage_field_context',
						parentId: "fakedata_parent_context",
						type: "normal",
						contexts: ["page", "editable", "frame", "link", "selection"],
						title: "Manage Field",
					}));

					if (thisBrowser == 'chrome') {
						contextMenuElements.invalid.push(chrome.contextMenus.create({
							id: 'fakedata_cannot_manage_field_context',
							parentId: "fakedata_parent_context",
							type: "normal",
							contexts: ["page", "editable", "frame", "link", "selection"],
							title: "Cannot manage this element",
							enabled: false,
							visible: false
						}));
					}

					chrome.contextMenus.create({
						id: 'fakedata_separator_1',
						parentId: "fakedata_parent_context",
						type: 'separator',
						contexts: ["page", "editable", "frame", "link", "selection"],
						enabled: false,
						visible: false,
					});

					contextMenuElements.valid.push(chrome.contextMenus.create({
						parentId: "fakedata_parent_context",
						id: 'fakedata_fill_entire_form_context_item',
						type: "normal",
						contexts: ["page", "editable", "frame", "link", "selection"],
						title: "Fill entire form",
						enabled: false,
						visible: false,
					}));

					chrome.contextMenus.create({
						parentId: "fakedata_parent_context",
						id: 'fakedata_fill_selected_fields_context_item',
						type: "normal",
						contexts: ["page", "editable", "frame", "link", "selection"],
						title: "Fill selected fields",
						enabled: false,
						visible: false,
					});

					chrome.contextMenus.create({
						parentId: "fakedata_parent_context",
						id: 'fakedata_fill_entire_page_context_item',
						type: "normal",
						contexts: ["page", "editable", "frame", "link", "selection"],
						title: "Fill entire page",
						enabled: false,
						visible: false,
					});

					if (liv()) {
						chrome.contextMenus.create({
							id: 'fakedata_separator_5',
							parentId: "fakedata_parent_context",
							type: 'separator',
							contexts: ["page", "editable", "frame", "link", "selection"],
						});

						chrome.contextMenus.create({
							parentId: "fakedata_parent_context",
							id: 'fakedata_undo_field_context_item',
							type: "normal",
							contexts: ["page", "editable", "frame", "link", "selection"],
							title: "Undo fill",
							enabled: false,
							visible: false,
						});

						chrome.contextMenus.create({
							parentId: "fakedata_parent_context",
							id: 'fakedata_undo_form_context_item',
							type: "normal",
							contexts: ["page", "editable", "frame", "link", "selection"],
							title: "Undo fill for entire form",
							enabled: false,
							visible: false,
						});
					}

					chrome.contextMenus.create({
						id: 'fakedata_separator_2',
						parentId: "fakedata_parent_context",
						type: 'separator',
						contexts: ["editable"]
					});

					var menusAdded = [];

					if (group_default_generators) {
						chrome.contextMenus.create({
							parentId: "fakedata_parent_context",
							id: 'fakedata_default_generators_parent',
							type: "normal",
							contexts: ["editable"],
							title: "Default Generators",
						});
					}

					var iter = 0;
					for (var i in fakers) (function (k, iter) {
						if (k.substr(0, 'Fake Data Cloud/'.length) == 'Fake Data Cloud/') {
							return;
						}
						if (k.substr(0, 'Fake Data/'.length) == 'Fake Data/') {
							return;
						}

						if (!data.cloud_online && k.substr(0, 'Fake Data Cloud/'.length) == 'Fake Data Cloud/') {
							separator_added = 1;
							return;
						}

						if (k.substr(0, 'Fake Data Cloud'.length) != 'Fake Data Cloud' && separator_added < 1) {
							chrome.contextMenus.create({
								id: 'fakedata_separator_3_' + iter,
								parentId: "fakedata_parent_context",
								type: 'separator',
								contexts: ["editable"]
							});
							separator_added++;
						}

						if (typeof original_fakers[k] == 'undefined' && separator_added < 2) {
							chrome.contextMenus.create({
								id: 'fakedata_separator_4_' + iter,
								parentId: "fakedata_parent_context",
								type: 'separator',
								contexts: ["editable"]
							});
							separator_added++;
						}

						var fakers_path = k.split('/');
						var current_fakers_path = 'fakedata_fakers_generator_';
						var currentParentId = 'fakedata_parent_context';

						if (typeof original_fakers[k] != 'undefined' && group_default_generators) {
							currentParentId = 'fakedata_default_generators_parent';
						}

						for (var j in fakers_path) {

							if (fakers_path[j].trim() == '') {
								continue;
							}

							if (j > 0) {
								currentParentId = current_fakers_path;
							}

							current_fakers_path += '/' + fakers_path[j];

							if (menusAdded.indexOf(current_fakers_path) >= 0) {
								continue;
							}

							menusAdded.push(current_fakers_path);

							generator_context_menus[current_fakers_path] = k;

							chrome.contextMenus.create({
								parentId: currentParentId,
								id: current_fakers_path,
								type: "normal",
								contexts: ["editable"],
								title: fakers_path[j],
							});
						}

						components_initialized.contextMenus = true;
					})(i, iter++);
				});
			});
			
			syncAllDatasets();
		});
	}

	function fillActiveFieldWithFakeData(generator, forced_value = null, sender = null, element_id = null, session_id = 'single') {
		chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
			newFillSessionId(session_id);

			var fake;
			if (!forced_value) {
				fake = getFake(generator, {element_id:element_id}, sender);
			} else {
				fake = forced_value;
			}
			fake.type = 'fake';

			var promis;

			if (fake != null && fake.text_type == 'object' && fake.text.constructor == Promise) {
				fake.text_type = undefined;
				promis = fake.text;
			} else {
				promis = new Promise(function(resolve, reject) {
					resolve(fake ? fake.text : null);
				});
			}

			promis.then(function(data) {
				if (fake != null) {
					if (typeof fake.text_type == 'undefined') {
						fake.text = prepareDataToString(data);
					} else {
						fake.text = data;
					}
					fake.text_type = typeof fake.text_type != 'undefined' ? fake.text_type : typeof data;
					if (element_id !== null && element_id !== undefined && !isNaN(element_id)) {
						fake.element_id = element_id;
					}
					setLastGeneratedValue(generator, fake);
				}

				if (tabs[0]) {
					chrome.tabs.sendMessage(tabs[0].id, fake);
				}
			});
		});
	}

	function reloadLibraries() {

		if (getManifestVersion() == 3) {
			return;
		}

		getStorageEngine().get({
			loaded_libraries: [],
			license_key: null,
		}, function (data) {

			lic = data.license_key;
			reflic();

			if (liv() && data.loaded_libraries && data.loaded_libraries.length) {
				for(var i = 0; i < data.loaded_libraries.length; i++) {
					if (data.loaded_libraries[i].type && data.loaded_libraries[i].type == 'foreground') {
						continue;
					}

					try {
						// fdEvaluateCodeBackground(data.loaded_libraries[i].contents)();
						eval.call(window, data.loaded_libraries[i].contents);
					} catch(e) {
					}
				}
			}
		});
	}

	function manageActiveField() {
		if (lastActivatedElement && lastActivatedElement.isValidInput) {

			if (lastActivatedElement.type == 'update_active_input_pending') {
				chrome.tabs.create({
					'url': "/options/index.html#/fields/pending" +
							   "?backto="      + lastActivatedElement.tab +
							   "&frameid="     + lastActivatedElement.frame +
							   "&custom_element_selector="    + encodeURIComponent(lastActivatedElement.custom_element_selector) +
							   "&wait_id="   + encodeURIComponent(lastActivatedElement.wait_id)
				});
			} else {
				chrome.tabs.create({
					'url': "/options/index.html#/fields/" + lastActivatedElement.kind +
							   "?data="        + encodeURIComponent(lastActivatedElement.inputName) +
							   "&backto="      + lastActivatedElement.tab +
							   "&frameid="     + lastActivatedElement.frame +
							   "&elementid="   + lastActivatedElement.element_id +
							   "&url="         + encodeURIComponent(lastActivatedElement.url) +
							   "&selector="    + encodeURIComponent(lastActivatedElement.selector) +
							   "&original_selector="    + encodeURIComponent(lastActivatedElement.original_selector) +
							   "&kind="        + encodeURIComponent(lastActivatedElement.kind) +
							   "&inputType="   + encodeURIComponent(lastActivatedElement.inputType) +
							   "&isMultiSelect="   + encodeURIComponent(lastActivatedElement.isMultiSelect) +
							   "&"  + toQueryString(lastActivatedElement.selectOptions, 'selOption')
				});
			}
		}
	}

	function getFake(label, msg, sender) {

		changeLocale(default_language);

		if (fakers[label]) {
			var custom_settings = Object.assign({}, fakers[label]);
			var callback_args = [];

			if (msg && msg.type == 'get_faker_generator_name') {
				return {
					generator: label
				};
			}

			if (liv()) {
				if (typeof msg == 'object' && msg !== null) {
					if (typeof msg.overwrite_settings == 'object' && msg.overwrite_settings !== null) {
						custom_settings = msg.overwrite_settings;
					}

					if (typeof msg.overwrite_field_settings == 'object' && msg.overwrite_field_settings !== null) {
						if (msg.overwrite_field_settings.extra_custom_language_enabled) {
							if (msg.overwrite_field_settings.extra_custom_language === null) {
								custom_settings.extra_custom_language_enabled = false;
							} else {
								custom_settings.extra_custom_language_enabled = true;
								custom_settings.extra_custom_language = msg.overwrite_field_settings.extra_custom_language;
							}
						}

						if (msg.overwrite_field_settings.extra_callback_after_enabled) {
							custom_settings.extra_callback_after_enabled = true;
							custom_settings.extra_callback_after_code = msg.overwrite_field_settings.extra_callback_after_code;
						}

						if (msg.overwrite_field_settings.extra_callback_before_enabled) {
							custom_settings.extra_callback_before_enabled = true;
							custom_settings.extra_callback_before_code = msg.overwrite_field_settings.extra_callback_before_code;
						}

						if (msg.overwrite_field_settings.extra_lorem_paragraph_sentences_enabled) {
							custom_settings.extra_lorem_paragraph_sentences_enabled = true;
							custom_settings.extra_lorem_paragraph_sentences_value = msg.overwrite_field_settings.extra_lorem_paragraph_sentences_value;
						}

						if (msg.overwrite_field_settings.extra_lorem_paragraphs_count_enabled) {
							custom_settings.extra_lorem_paragraphs_count_enabled = true;
							custom_settings.extra_lorem_paragraphs_count_value = msg.overwrite_field_settings.extra_lorem_paragraphs_count_value;
						}

						if (msg.overwrite_field_settings.extra_lorem_words_count_enabled) {
							custom_settings.extra_lorem_words_count_enabled = true;
							custom_settings.extra_lorem_words_count_value = msg.overwrite_field_settings.extra_lorem_words_count_value;
						}

						if (msg.overwrite_field_settings.extra_password_length_enabled) {
							custom_settings.extra_password_length_enabled = true;
							custom_settings.extra_password_length_value = msg.overwrite_field_settings.extra_password_length_value;
						}

						if (msg.overwrite_field_settings.extra_password_memorable_enabled) {
							if (msg.overwrite_field_settings.extra_password_memorable_value === null) {
								custom_settings.extra_password_memorable_enabled = false;
							} else {
								custom_settings.extra_password_memorable_enabled = true;
								custom_settings.extra_password_memorable_value = msg.overwrite_field_settings.extra_password_memorable_value;
							}
						}

						if (msg.overwrite_field_settings.extra_number_range_enabled) {
							custom_settings.extra_number_range_enabled = true;
							custom_settings.extra_number_range_min_value = msg.overwrite_field_settings.extra_number_range_min_value;
							custom_settings.extra_number_range_max_value = msg.overwrite_field_settings.extra_number_range_max_value;
						}

						if (msg.overwrite_field_settings.extra_phone_format_enabled) {
							custom_settings.extra_phone_format_enabled = true;
							custom_settings.extra_phone_format_value = msg.overwrite_field_settings.extra_phone_format_value;
						}

						if (msg.overwrite_field_settings.extra_datetime_format_enabled) {
							custom_settings.extra_datetime_format_enabled = true;
							custom_settings.extra_datetime_format_value = msg.overwrite_field_settings.extra_datetime_format_value;
						}

						if (msg.overwrite_field_settings.extra_datetime_between_enabled) {
							custom_settings.extra_datetime_between_enabled = true;
							custom_settings.extra_datetime_from_value = msg.overwrite_field_settings.extra_datetime_from_value;
							custom_settings.extra_datetime_to_value = msg.overwrite_field_settings.extra_datetime_to_value;
						}
						
						if (msg.overwrite_field_settings.dataset && typeof msg.overwrite_field_settings.dataset == 'object') {
							custom_settings.dataset = Object.assign({}, msg.overwrite_field_settings.dataset);
						}
					}
				}

				if (custom_settings.extra_custom_language_enabled) {
					changeLocale(custom_settings.extra_custom_language);
				}

				switch (label) {
					case 'password':
						if (custom_settings.extra_password_length_enabled) {
							callback_args.push(custom_settings.extra_password_length_value);
						} else {
							callback_args.push(fakers_default_settings.password_length);
						}

						if (custom_settings.extra_password_memorable_enabled) {
							callback_args.push(custom_settings.extra_password_memorable_value ? true : false);
						} else {
							callback_args.push(fakers_default_settings.password_memorable);
						}
						break;

					case 'phone':
					case 'Fake Data Cloud/Phone':
						if (custom_settings.extra_phone_format_enabled) {
							callback_args.push(custom_settings.extra_phone_format_value);
						} else {
							callback_args.push(fakers_default_settings.phone_format);
						}
						break;

					case 'datetime':
						if (msg && msg.field_type == 'date') {
							callback_args.push('YYYY-MM-DD');
						} else if (msg && msg.field_type == 'datetime' || msg && msg.field_type == 'datetime-local') {
							callback_args.push('YYYY-MM-DDTHH:mm');
						} else if (msg && msg.field_type == 'time') {
							callback_args.push('HH:mm');
						} else if (msg && msg.field_type == 'month') {
							callback_args.push('YYYY-MM');
						} else {
							if (custom_settings.extra_datetime_format_enabled) {
								callback_args.push(custom_settings.extra_datetime_format_value);
							} else {
								callback_args.push(fakers_default_settings.datetime_format);
							}
						}

						var generator_data = {
							min: null,
							max: null
						};

						if (msg) {
							switch (msg.field_type) {
								case 'date':
								case 'datetime':
								case 'datetime-local':
								case 'month':
									generator_data = {
										min: (msg.extra_data.min && Date.parse(msg.extra_data.min) && new Date(msg.extra_data.min)) || null,
										max: (msg.extra_data.max && Date.parse(msg.extra_data.max) && new Date(msg.extra_data.max)) || null
									};

									if (generator_data.min !== null) {
										generator_data.min = new Date(msg.extra_data.min);
										if (isNaN(generator_data.min.getTime())) {
											generator_data.min = null;
										}
									}

									if (generator_data.max !== null) {
										generator_data.max = new Date(msg.extra_data.max);
										if (isNaN(generator_data.max.getTime())) {
											generator_data.max = null;
										}
									}

									break;

								case 'time':
									var match_min = msg.extra_data.min ? msg.extra_data.min.match(/^([0-1][0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/) : null;
									var match_max = msg.extra_data.max ? msg.extra_data.max.match(/^([0-1][0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/) : null;

									if (match_min) {
										generator_data.min = msg.extra_data.min;
										if (typeof match_min[3] === 'undefined') {
											generator_data.min += ':00';
										}
									} else {
										generator_data.min = '00:00:00';
									}

									if (match_max) {
										generator_data.max = msg.extra_data.max;
										if (typeof match_max[3] === 'undefined') {
											generator_data.max += ':59';
										}
									} else {
										generator_data.max = '23:59:59';
									}

									generator_data.min = new Date('2018-01-01 ' + generator_data.min);
									generator_data.max = new Date('2018-01-01 ' + generator_data.max);
									break;
							}
						}

						if (custom_settings.extra_datetime_between_enabled) {
							var from = new Date(custom_settings.extra_datetime_from_value || undefined);
							var to = new Date(custom_settings.extra_datetime_to_value || undefined);

							if (msg.field_type == 'time') {
								if (!isNaN(from.getTime())) {
									var currentdatefrom = new Date('2018-01-01 00:00:00');
									currentdatefrom.setHours(from.getHours());
									currentdatefrom.setMinutes(from.getMinutes());
									currentdatefrom.getSeconds(from.getSeconds());

									from = currentdatefrom;
								}

								if (!isNaN(to.getTime())) {
									var currentdateto = new Date('2018-01-01 00:00:00');
									currentdateto.setHours(to.getHours());
									currentdateto.setMinutes(to.getMinutes());
									currentdateto.getSeconds(to.getSeconds());

									to = currentdateto;
								}
							}


							if (!isNaN(from.getTime()) && (!generator_data.min || (generator_data.min && from.getTime() > generator_data.min.getTime()))) {
								generator_data.min = from;
							}

							if (!isNaN(to.getTime()) && (!generator_data.max || (generator_data.max && to.getTime() < generator_data.max.getTime()))) {
								generator_data.max = to;
							}

							if (generator_data.min !== null && generator_data.max !== null && generator_data.min > generator_data.max) {
								generator_data.max = generator_data.min;
							}
						}

						callback_args.push(generator_data.min);
						callback_args.push(generator_data.max);

						break;

					case 'number':
					case 'range':
						var generator_data = {
							min: null,
							max: null,
							step: null
						};

						if (msg && msg.extra_data) {
							generator_data = {
								min: parseInt(msg.extra_data.min) || null,
								max: parseInt(msg.extra_data.max) || null,
								step: parseInt(msg.extra_data.step) || null
							};

							if (generator_data.min && !generator_data.max) {
								if (generator_data.min > fakers_default_settings.number_max) {
									generator_data.max = generator_data.min + fakers_default_settings.number_max;
								}
							}

							if (generator_data.max && !generator_data.min) {
								if (generator_data.max < fakers_default_settings.number_min) {
									generator_data.min = generator_data.max - fakers_default_settings.number_max;
									if (generator_data.max > 0) {
										generator_data.min = Math.max(0, generator_data.min);
									}
								}
							}

							if (!generator_data.step || parseInt(msg.extra_data.step) < 1) {
								msg.extra_data.step = 1;
							}
						}

						if (custom_settings.extra_number_range_enabled && !isNaN(custom_settings.extra_number_range_min_value) && custom_settings.extra_number_range_min_value !== null && custom_settings.extra_number_range_min_value.trim() != '') {
							let extra_number_range_min_value = parseInt(custom_settings.extra_number_range_min_value);

							if (generator_data.min && generator_data.max && generator_data.min <= extra_number_range_min_value && extra_number_range_min_value <= generator_data.max) {
								generator_data.min = extra_number_range_min_value;
							} else if (!generator_data.min) {
								generator_data.min = extra_number_range_min_value;
							}
						}

						if (custom_settings.extra_number_range_enabled && !isNaN(custom_settings.extra_number_range_max_value) && custom_settings.extra_number_range_max_value !== null && custom_settings.extra_number_range_max_value.trim() != '') {
							let extra_number_range_max_value = parseInt(custom_settings.extra_number_range_max_value);

							if (generator_data.min && generator_data.max && generator_data.min <= extra_number_range_max_value && extra_number_range_max_value <= generator_data.max) {
								generator_data.max = extra_number_range_max_value;
							} else if (!generator_data.max) {
								generator_data.max = extra_number_range_max_value;
							}
						}

						callback_args.push(generator_data.min);
						callback_args.push(generator_data.max);
						callback_args.push(generator_data.step);

						break;

					case 'words':
						if (custom_settings.extra_lorem_words_count_enabled) {
							callback_args.push(custom_settings.extra_lorem_words_count_value);
						} else {
							callback_args.push(fakers_default_settings.lorem_words_count);
						}
						break;

					case 'paragraph':
						if (custom_settings.extra_lorem_paragraph_sentences_enabled) {
							callback_args.push(custom_settings.extra_lorem_paragraph_sentences_value);
						} else {
							callback_args.push(fakers_default_settings.lorem_paragraph_sentences);
						}
						break;

					case 'text':
						if (custom_settings.extra_lorem_paragraphs_count_enabled) {
							callback_args.push(custom_settings.extra_lorem_paragraphs_count_value);
						} else {
							callback_args.push(fakers_default_settings.lorem_paragraphs_count);
						}
						break;

					case 'Fake Data Cloud/Email':
						if (msg && msg.cloud_mail_prefix) {
							callback_args.push(msg.cloud_mail_prefix);
						} else {
							callback_args.push(null);
						}

						if (msg && msg.cloud_email_domain) {
							callback_args.push(msg.cloud_email_domain);
						} else {
							callback_args.push(null);
						}

						break;

					case 'Fake Data/Dataset':
						if (custom_settings.dataset) {
							if (custom_settings.dataset.dataset) {
								callback_args.push(custom_settings.dataset.dataset);
							}
							
							if (custom_settings.dataset.column) {
								callback_args.push(custom_settings.dataset.column);
							}
						}
						break;
				}
			} else {
				switch (label) {
					case 'datetime':
						if (msg && msg.field_type == 'date') {
							callback_args.push('YYYY-MM-DD');
						} else if (msg && msg.field_type == 'datetime' || msg && msg.field_type == 'datetime-local') {
							callback_args.push('YYYY-MM-DDTHH:mm');
						} else if (msg && msg.field_type == 'time') {
							callback_args.push('HH:mm');
						} else if (msg && msg.field_type == 'month') {
							callback_args.push('YYYY-MM');
						}

						var generator_data = {
							min: null,
							max: null
						};

						if (msg) {
							switch (msg.field_type) {
								case 'date':
								case 'datetime':
								case 'datetime-local':
								case 'month':
									generator_data = {
										min: (msg.extra_data.min && Date.parse(msg.extra_data.min) && new Date(msg.extra_data.min)) || null,
										max: (msg.extra_data.max && Date.parse(msg.extra_data.max) && new Date(msg.extra_data.max)) || null
									};

									if (generator_data.min !== null) {
										generator_data.min = new Date(msg.extra_data.min);
										if (isNaN(generator_data.min.getTime())) {
											generator_data.min = null;
										}
									}

									if (generator_data.max !== null) {
										generator_data.max = new Date(msg.extra_data.max);
										if (isNaN(generator_data.max.getTime())) {
											generator_data.max = null;
										}
									}

									break;

								case 'time':
									var match_min = msg.extra_data.min ? msg.extra_data.min.match(/^([0-1][0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/) : null;
									var match_max = msg.extra_data.max ? msg.extra_data.max.match(/^([0-1][0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/) : null;

									if (match_min) {
										generator_data.min = msg.extra_data.min;
										if (typeof match_min[3] === 'undefined') {
											generator_data.min += ':00';
										}
									} else {
										generator_data.min = '00:00:00';
									}

									if (match_max) {
										generator_data.max = msg.extra_data.max;
										if (typeof match_max[3] === 'undefined') {
											generator_data.max += ':59';
										}
									} else {
										generator_data.max = '23:59:59';
									}

									generator_data.min = new Date('2018-01-01 ' + generator_data.min);
									generator_data.max = new Date('2018-01-01 ' + generator_data.max);
									break;
							}
						}

						callback_args.push(generator_data.min);
						callback_args.push(generator_data.max);

						break;

					case 'number':
					case 'range':
						var generator_data = {
							min: null,
							max: null,
							step: null
						};

						if (msg && msg.extra_data) {
							generator_data = {
								min: parseInt(msg.extra_data.min) || null,
								max: parseInt(msg.extra_data.max) || null,
								step: parseInt(msg.extra_data.step) || null
							};

							if (generator_data.min && !generator_data.max) {
								if (generator_data.min > fakers_default_settings.number_max) {
									generator_data.max = generator_data.min + fakers_default_settings.number_max;
								}
							}

							if (generator_data.max && !generator_data.min) {
								if (generator_data.max < fakers_default_settings.number_min) {
									generator_data.min = generator_data.max - fakers_default_settings.number_max;
									if (generator_data.max > 0) {
										generator_data.min = Math.max(0, generator_data.min);
									}
								}
							}

							if (!generator_data.step || parseInt(msg.extra_data.step) < 1) {
								msg.extra_data.step = 1;
							}
						}

						callback_args.push(generator_data.min);
						callback_args.push(generator_data.max);
						callback_args.push(generator_data.step);

						break;

				}
			}

			var text_return;

			var callback;

			if (msg && msg.force_original_faker === true && typeof original_fakers[label] != 'undefined') {
				callback = original_fakers[label].callback;
			} else {
				if (msg && msg.field_type == 'password' && form_use_same_password && typeof form_use_same_password_usages[fakeData.getFillSessionId()] != 'undefined') {
					callback = function() {
						return form_use_same_password_usages[fakeData.getFillSessionId()];
					}
				} else {
					callback = fakers[label].callback;
				}
			}

			var is_place = false;

			if (['country', 'state', 'city', 'address', 'zip'].indexOf(label) >= 0 && fakeDataUltraSubscription.getFakerUltraDefines()[label] && callback == fakeDataUltraSubscription.getFakerUltraDefines()[label].callback && msg && msg.fill_session_type != 'single' && msg.fill_session_type != 'code' && getFillSessionType() != 'code' && getFillSessionType() != 'preview' && getFillSessionType() != 'single-contextmenu') {
				is_place = label;
			} else {
				text_return = callback.apply({sender: sender, element_id: msg && msg.element_id}, callback_args);

				if (msg && msg.field_type == 'password' && form_use_same_password && typeof form_use_same_password_usages[fakeData.getFillSessionId()] == 'undefined') {
					form_use_same_password_usages[fakeData.getFillSessionId()] = text_return;
				}
			}

			return {
				label: label,
				text: prepareDataToString(text_return),
				text_type: typeof text_return,
				insert_method: insert_method,
				callback_before: liv() && custom_settings.extra_callback_before_enabled ? custom_settings.extra_callback_before_code : null,
				callback_after: liv() && custom_settings.extra_callback_after_enabled ? custom_settings.extra_callback_after_code : null,
				is_place: is_place,
				_manifest_version: _chrome.manifest_version
			};
		} else if (extra_fake_fields[label] && extra_fake_fields[label].kind != 'option') {
			var fake_data_lbl;
			if (typeof extra_fake_fields[label] == 'string') {
				fake_data_lbl = extra_fake_fields[label];
			} else {
				fake_data_lbl = extra_fake_fields[label].generator;
			}

			if (fake_data_lbl == 'custom') {

				if (msg && msg.type == 'get_faker_generator_name') {
					return {
						generator: 'custom'
					};
				}

				var cbk;
				if (msg && msg.field_type == 'password' && form_use_same_password && typeof form_use_same_password_usages[fakeData.getFillSessionId()] != 'undefined') {
					cbk = function() {
						return form_use_same_password_usages[fakeData.getFillSessionId()];
					}
				} else {
					cbk = function() {
						return fdEvaluateCodeBackground.apply({sender: sender, element_id: msg && msg.element_id}, [extra_fields_callbacks[label]]);
					}
				}
				var text_return = cbk();

				if (msg && msg.field_type == 'password' && form_use_same_password && typeof form_use_same_password_usages[fakeData.getFillSessionId()] == 'undefined') {
					form_use_same_password_usages[fakeData.getFillSessionId()] = text_return;
				}

				return {
					label: fake_data_lbl,
					text: prepareDataToString(text_return),
					text_type: typeof text_return,
					insert_method: insert_method,
					callback_before: liv() && extra_fake_fields[label].extra_callback_before_enabled ? extra_fake_fields[label].extra_callback_before_code : null,
					callback_after: liv() && extra_fake_fields[label].extra_callback_after_enabled ? extra_fake_fields[label].extra_callback_after_code : null,
				};

			} else {
				if (typeof msg != 'object' || msg === null) {
					msg = {};
				}
				msg.overwrite_field_settings = Object.assign({}, extra_fake_fields[label]);
				var fake = getFake(fake_data_lbl, msg, sender);

				return fake;
			}
		} else {

			if (msg && msg.kind == 'named' && named_fallback_unnamed) {
				if (!msg.additional_fuzzy_seed) {
					msg.additional_fuzzy_seed = [msg.inputName];
				}
				msg.kind = 'unnamed';
				var inputName = msg.url + '@' + msg.selector;
				return getFake(inputName, msg, sender);
			}

			if (msg && msg.kind == 'unnamed') {
				var matching_regex_field = hasMatchingRegexField(msg);
				if (matching_regex_field) {
					var selector = matching_regex_field.url + '@' + matching_regex_field.selector;
					return getFake(selector, msg, sender);
				}
			}

			if (msg && msg.field_type) {
				// brace yourselves; min and max attributes are coming
				switch (msg.field_type) {
					case 'email':
					case 'password':
					case 'url':
						return getFake(msg.field_type, msg, sender);

					case 'color':
						var text_return = faker.internet.color();
						return {
							label: 'color',
							text: prepareDataToString(text_return),
							text_type: typeof text_return,
							insert_method: insert_method
						};

					// case 'range':
						// var text_return = faker.random.number({
						// 	min: msg.extra_data.min || 0,
						// 	max: msg.extra_data.min || 100
						// });
						// return {
						// 	label: 'range',
						// 	text: prepareDataToString(text_return),
						// 	text_type: typeof text_return,
						// 	insert_method: insert_method
						// };

					case 'number':
					case 'range':
						return getFake('number', msg, sender);

					case 'date':
					case 'datetime':
					case 'datetime-local':
					case 'month':
					case 'time':
						return getFake('datetime', msg, sender);

					case 'tel':
						return getFake('phone', msg, sender);
				}
			}

			if (msg) {

				if (fallback_generator_toggle && fallback_priority == 'fallback_first' && fakers[fallback_generator]) {
					var fallback_gen_result = getFake(fallback_generator, msg, sender);
					if (fallback_gen_result.text_type != 'boolean' || (fallback_gen_result.text_type == 'boolean' && !!fallback_gen_result.text)) {
						return fallback_gen_result;
					}
				}

				if (fuzzy_enabled) {

					var existing_fakers_fuse = {};

					for (var f in fakers) {
						existing_fakers_fuse[f] = f;
						existing_fakers_fuse[f.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ')] = f;
						existing_fakers_fuse[f.replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ')] = f;
						// existing_fakers_fuse[f.replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ').split("").reverse().join("")] = f;
					}

					for (var f in extra_fake_fields) {
						if (extra_fake_fields[f].kind == 'named' && extra_fake_fields[f].generator != 'custom') {

							existing_fakers_fuse[f] = extra_fake_fields[f].generator;
							existing_fakers_fuse[f.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ')] = extra_fake_fields[f].generator;
							existing_fakers_fuse[f.replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ')] = extra_fake_fields[f].generator;
							// existing_fakers_fuse[f.replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ').split("").reverse().join("")] = extra_fake_fields[f].generator;
						}
					}

					if (typeof existing_fakers_fuse.street == 'undefined') existing_fakers_fuse.street = 'address';
					if (typeof existing_fakers_fuse.home_address == 'undefined') existing_fakers_fuse.home_address = 'address';
					if (typeof existing_fakers_fuse.place == 'undefined') existing_fakers_fuse.place = 'address';
					if (typeof existing_fakers_fuse.zipcode == 'undefined') existing_fakers_fuse.zipcode = 'zip';
					if (typeof existing_fakers_fuse.no == 'undefined') existing_fakers_fuse.no = 'number';

					var fuse_searches = [];

					// console.log(msg)

					if (msg.kind == 'named' && label) {
						fuse_searches = fuse_searches.concat([
							label,
							label.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' '),
							label.replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' '),
							// label.replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ').split("").reverse().join(""),
						]);

						var exact_word_match = label.replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ').split(" ");
						fuse_searches = fuse_searches.concat(exact_word_match);
					}

					if (msg.placeholder) {
						fuse_searches.push(msg.placeholder);
					}

					if (msg.label) {
						fuse_searches.push(msg.label);
					}

					var prefixes_found = [];
					var prefix_count = 0;
					for (var f in extra_fake_fields) {
						var consec = 0;
						for (var x = 0; x < f.length; x++) {
							if (label[x] != f[x]) break;
							consec++;
						}

						if (consec > prefix_count) {
							prefixes_found = [f];
							prefix_count = consec;
						} else if (consec == prefix_count) {
							prefixes_found.push(f);
						}
					}

					if (prefix_count > 1 && ((prefix_count * 100) / label.length) > 20) {
						fuse_searches.push(label.substr(prefix_count));
						for (var pf = 0; pf < prefixes_found.length; pf++) {
							delete existing_fakers_fuse[prefixes_found[pf]];
							delete existing_fakers_fuse[prefixes_found[pf].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ')];
							delete existing_fakers_fuse[prefixes_found[pf].replace(/[^a-zA-Z]/g, ' ').replace(/\s+/g, ' ')];
						}
					}

					if (msg.additional_fuzzy_seed) {
						fuse_searches = fuse_searches.concat(msg.additional_fuzzy_seed)
					}

					fuse_searches = fuse_searches.filter(function(fs) {
						return fs.trim() && fs !== 'q';
					});

					var fuzzy_results = [];

					var fzs = FuzzySet(Object.keys(existing_fakers_fuse), false);
					for (var fs = 0; fs < fuse_searches.length; fs++) {
						var fs_result = fzs.get(fuse_searches[fs]);
						if (fs_result && fs_result.length) {
							fuzzy_results = fuzzy_results.concat(fs_result);
						}
					}

					// console.log(fuzzy_results);
					fuzzy_results.sort(function(a, b) {
						if (a[0] < b[0]) return 1;
						else if (a[0] > b[0]) return -1;
						else return 0;
					});

					if (fuzzy_results.length) {
						return getFake(existing_fakers_fuse[fuzzy_results[0][1]], msg, sender);
					}

					if (fallback_generator_toggle && fakers[fallback_generator]) {
						return getFake(fallback_generator, msg, sender);
					}
				}
			}

			return null;
		}
	}

	function getGeneratorValue(generator, data, with_fuzzy, sender) {
		fdata = data || null;

		var fake_field = getFake(generator, with_fuzzy ? {
			label: generator
		} : null, sender);

		fdata = null;
		if (!fake_field) {
			return null;
		}

		var retrnPromise = null;

		if (fake_field.text.constructor == Promise) {
			retrnPromise = fake_field.text;
		} else {
			retrnPromise = new Promise(resolve => resolve(fake_field.text));
		}

		return new Promise(function(resolve) {
			retrnPromise.then(data => {
				var retrn = data;
				if (fake_field.text_type == 'function' && typeof fake_field.text == 'string') {
					retrn = fdEvaluateCodeBackground('return ' + fake_field.text.toString());
				} else if (fake_field.text_type == 'object' && typeof fake_field.text == 'string') {
					retrn = JSON.parse(fake_field.text, functionReviver);
				} else if (fake_field.text_type == 'number') {
					retrn = parseFloat(fake_field.text);
				}

				fake_field.text = prepareDataToString(retrn);
				fake_field.text_type = typeof fake_field.text;
				if (retrn !== null) {
					setLastGeneratedValue(generator, fake_field);
				}

				resolve(retrn);
			})
		})
	}

	function hasMatchingRegexField(msg, ignoreSelector) {
		var regex;

		for (var i in extra_fake_fields) {
			if (extra_fake_fields[i].kind == msg.kind && extra_fake_fields[i].regex_enabled && extra_fake_fields[i].regex_expr) {
				regex = null;

				try {
					regex = new RegExp(extra_fake_fields[i].regex_expr, "i").exec(msg.url);
				} catch (e) {
				}

				if (regex && regex[0] == msg.url && ((!ignoreSelector && msg.selector == extra_fake_fields[i].selector) || ignoreSelector)) {
					return extra_fake_fields[i];
				}
			}
		}

		return false;
	}
	
	async function syncAllDatasets() {
		if (liv() && datasets) {
			let datasets_synced = 0;
			for (let i in datasets) {
				if (datasets[i].type == 'gsheets' && (!datasets[i].gsheets.last_sync || (!isNaN(datasets[i].gsheets.refresh_hours) && parseInt(datasets[i].gsheets.refresh_hours) > 0 && datasets[i].gsheets.last_sync <= (new Date()).getTime() - (parseInt(datasets[i].gsheets.refresh_hours) * 60 * 60 * 1000)))) {
					if (await syncDataset(datasets[i])) {
						datasets_synced++;
					}
				}
			}
			
			if (datasets_synced > 0) {
				getStorageEngine().get({
						datasets: {},
					},
					(data) => {
						if (chrome.runtime.lastError) {
							return;
						}
						
						data.datasets = datasets;
						
						getStorageEngine().set(JSON.parse(JSON.stringify({
							datasets: data.datasets,
						})), () => {
						});
					},
				)
			}
			
			setTimeout(syncAllDatasets, 3600 * 1000);
		}
	}
	
	async function syncDataset(dataset) {
		try {
			if (!dataset.gsheets || !dataset.gsheets.refresh_token) {
				console.error('No refresh_token for dataset');
				return false;
			}
			
			if (!dataset.gsheets.spreadsheet || !dataset.gsheets.spreadsheet.id) {
				console.error('No spreadsheet id for dataset');
				return false;
			}
			
			if (!dataset.gsheets.sheet || !dataset.gsheets.sheet.title) {
				console.error('No sheet title for dataset');
				return false;
			}
			
			if (!dataset.gsheets.refresh_token) {
				console.error('No Google account connected');
				return false;
			}

			let auth_response = await (await fetch('https://oauth2.googleapis.com/token', {
				method:  'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				},
				body:    new URLSearchParams({
					client_id:     '1020357898894-402rvfkc80hvf33n087q48at3iatigk7.apps.googleusercontent.com',
					client_secret: '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',
					refresh_token:  dataset.gsheets.refresh_token,
					grant_type:    'refresh_token',
				}),
			})).json();
			
			if (auth_response.error) {
				console.error('Failed to exchange OAuth tokens', auth_response);
				return false;
			}
			
			if (!auth_response.access_token) {
				console.error('No access_token received', auth_response);
				return false;
			}
			
			
			
			let sheet_content = null;
			try {
				sheet_content = await (await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + dataset.gsheets.spreadsheet.id + '/values/' + encodeURIComponent(dataset.gsheets.sheet.title) +  '?' + new URLSearchParams({
					valueRenderOption: 'UNFORMATTED_VALUE',
					majorDimension: 'ROWS',
					fields: 'values',
				}), {
					headers: {
						'Authorization': 'Bearer ' + auth_response.access_token,
					},
				})).json();
			} catch (e) {
				console.error(e);
				return false;
			}
			
			if (sheet_content.error) {
				console.error('Failed to retrieve Sheet content', JSON.stringify(sheet_content));
				return false;
			}
			
			if (!sheet_content.values) {
				console.error('No Sheet values received', JSON.stringify(sheet_content));
				return false;
			}
			
			let csv = sheet_content.values;
			
			if (!csv.length) {
				return false;
			}
			
			csv = csv.filter(row => Object.values(row).filter(Boolean).length > 0);
			
			if (!csv.length) {
				return false;
			}
			
			let columns = csv.splice(0,1)[0];
			let rows = [];
			csv.forEach(row => {
				let csv_row = {};
				for (let i = 0; i < columns.length; i++) {
					csv_row[columns[i]] = row[i] || '';
				}
				rows.push(csv_row);
			});
			
			rows = rows.filter(row => Object.values(row).filter(Boolean).length > 0);
			
			if (!rows.length) {
				return false;
			}
			
			dataset.columns = columns;
			dataset.data = rows;
			dataset.gsheets.last_sync = (new Date()).getTime();
			
			return true;
			
		} catch (e) {
			console.error(e);
			
			return false;
		}
	}

	function saveFake(msg) {

		if (msg.kind == 'named' && typeof fakers[msg.inputName] != 'undefined') {
			return;
		}

		var matching_regex_field = null;
		if (msg.kind == 'unnamed') {
			matching_regex_field = hasMatchingRegexField(msg, true);
		}

		if (typeof fakers[msg.inputName] == 'undefined') {
			extra_fake_fields[msg.inputName] = {
				generator: msg.faker,
				kind: msg.kind,
				url: msg.url,
				selector: msg.selector,
				regex_enabled: matching_regex_field ? matching_regex_field.regex_enabled : false,
				regex_expr: matching_regex_field ? matching_regex_field.regex_expr : null
			};
		}

		getStorageEngine().set({'extra_fields': extra_fake_fields}, function() {
			chrome.tabs.query({}, function (tabs) {
				for (var i in tabs) {
					chrome.tabs.sendMessage(tabs[i].id, {type: 'refresh_data'});
				}
			});
		});
	}

	function prepareDataToString(value) {
		if (typeof value === 'object') {
			if (value != null && value.constructor == Promise) {
				return value;
			} else {
				return JSON.stringify(value, functionReplacer);
			}
		} else {
			if (typeof value == 'number') {
				return value;
			} else {
				return (value || '').toString();
			}
		}
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
				return fdEvaluateCodeBackground('return ' + value);
			}
		}
		return value;
	}

	function toQueryString(obj, prefix) {
		var str = [], k, v;
		for(var p in obj) {
			if (!obj.hasOwnProperty(p)) {continue;} // skip things from the prototype
			if (~p.indexOf('[')) {
				k = prefix ? prefix + "[" + p.substring(0, p.indexOf('[')) + "]" + p.substring(p.indexOf('[')) : p;
// only put whatever is before the bracket into new brackets; append the rest
			} else {
				k = prefix ? prefix + "[" + p + "]" : p;
			}
			v = obj[p];
			str.push(typeof v == "object" ?
				toQueryString(v, k) :
				encodeURIComponent(k) + "=" + encodeURIComponent(v));
		}
		return str.join("&");
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

	function getFillSessionId() {
		return fill_session_id;
	}

	function getFillSessionType(fill_session_id) {
		if (!fill_session_id) {
			fill_session_id = getFillSessionId();
		}
		return fill_session_type[fill_session_id];
	}

	function newFillSessionId(type) {
		fill_session_id = 'fill_' + performance.now();
		fill_session_type[fill_session_id] = type;
	}

	function setLastGeneratedValue(label, value) {
		try {
			if (typeof value == 'object' && value.constructor === Promise) {
				//	value = value;
			} else if (value.text_type === 'object') {

				value = JSON.parse(value.text, functionReviver);
			} else if (value.text_type === 'function') {
				value = fdEvaluateCodeBackground('return ' + value.text);
			} else {
				value = value.text;
			}

			last_generated_value[label] = value;

			if (getManifestVersion() == 3) {
				getStorageEngine().set({
					_internal_last_generated_value: last_generated_value
				});
			}
		} catch (e) {
			console.error(e);
		}
	}

	function runDefinedFunctionInMainWorld(target, func, args) {
		try {
			return _chrome.scripting.executeScript({
				target: target,
				func:   func,
				args:   args,
				world:  'MAIN',
			});
		} catch (e) {
			console.error(e);
		}
	}

	chrome.runtime.onMessage.addListener(onReceiveMessage);

	chrome.tabs.onActivated.addListener(function(activeInfo) {
		onReceiveMessage({
			type: 'update_active_input',
			isValidInput: false,
			insideForm: false,
		});
	});

	function onContextMenuClicked(data, tabInfo) {
		var id = data.menuItemId;

		if (id == 'fakedata_manage_field_context') {
			manageActiveField();
		} else if (id == 'fakedata_fill_entire_form_context_item') {
			chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					type: "fill_entire_form",
					selector: lastActivatedElement.selector,
					element_id: lastActivatedElement.element_id,
				});
			});
		} else if (id == 'fakedata_fill_selected_fields_context_item') {
			chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					type: "fill_selected_fields"
				});
			});
		} else if (id == 'fakedata_fill_entire_page_context_item') {
			chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					type: "fill_entire_page",
				});
			});
		} else if (id == 'fakedata_undo_field_context_item') {

			chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					type: "undo_fill_input",
					element_id: lastActivatedElement.element_id
				});
			});

		} else if (id == 'fakedata_undo_form_context_item') {

			chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					type: "undo_fill_form",
					element_id: lastActivatedElement.element_id
				});
			});

		} else if (id.substr(0, 26) == 'fakedata_fakers_generator_') {
			let sender = {tab: tabInfo};

			if (getManifestVersion() == 3 && lastActivatedElement.frame) {
				sender.frameId = lastActivatedElement.frame;
			}

			fillActiveFieldWithFakeData(generator_context_menus[id], null, sender, lastActivatedElement.element_id, 'single-contextmenu');
		}
	}

	chrome.contextMenus.onClicked.addListener(onContextMenuClicked);

	var self = {};
	self.refreshData = refreshData;
	self.getFillSessionId = getFillSessionId;
	self.getFillSessionType = getFillSessionType;
	self.newFillSessionId = newFillSessionId;
	self.reloadLibraries = reloadLibraries;
	self.getUltraSubscriptionObject = fakeDataUltraSubscription;
	self.ultra = {
		isSubscriptionActive: fakeDataUltraSubscription.isSubscriptionActive,
		generators: fakeDataUltraSubscription.getFakerUltraDefines(),
		getLastSms: fakeDataUltraSubscription.getLastSmsMessageTest
	};
	self.getGeneratorValue = function(label, data, sender) {
		return getGeneratorValue(label, data, false, sender);
	};
	self.getFakeValue = async function(label, data, sender) {
		return await getGeneratorValue(label, data, true, sender);
	};
	self.getLastGeneratedValue = async function(generator) {

		if (typeof last_generated_value[generator] == "undefined") {
			return null;
		} else {
			var last_val = await last_generated_value[generator];
			return last_val;
		}
	};
	self._addEvalPromise = function(promise) {
		mv3_eval_promises.push(promise);

		return mv3_eval_promises.length-1;
	};
	self.getDatasetValue = function(dataset_id_or_name, dataset_column) {

		if (!liv()) {
			return null;
		}

		let dataset = null;

		if (dataset_id_or_name in datasets) {
			dataset = datasets[dataset_id_or_name];
		}

		if (!dataset) {
			for (let i in datasets) {
				if (datasets[i].dataset_name == dataset_id_or_name) {
					dataset = datasets[i];
					break;
				}
			}
		}

		if (!dataset) {
			return null;
		}

		if (!dataset.columns.includes(dataset_column)) {
			return null;
		}

		return dataset.data[Math.floor(Math.random() * dataset.data.length)][dataset_column];
	}

	if (getManifestVersion() <= 2) {
		// for "forward compatibility" with upcoming MV3 update
		window.fakeDom = {
			window: window,
			document: window.document,
			location: window.location,
			navigator: window.navigator,
			localStorage: window.localStorage,
		}
	}

	// if this is a debug version of Fake Data, expose a few things, that will aid Selenium testing
	// see crx_ci_testing.pem certificate for generating the debug id
	if (isDebugVersion()) {
		self.lastActivatedElement = lastActivatedElement;
		self.fillActiveFieldWithFakeData = fillActiveFieldWithFakeData;
		self.onContextMenuClicked = onContextMenuClicked;
	}

	return self;
};



var fakeData = new FakeData();
fakeData.refreshData();
fakeData.reloadLibraries();
