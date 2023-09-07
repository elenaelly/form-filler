var fdUltraSubscription = (function() {
	
	var subact = null;
	var intervalCheckLicense = null;
	var allow_online_connections = true;
	var dataPollStarted = false;
	var dataPollIntervalSeconds = null;
	var dataPollTimeout = null;
	
	var licenseKey = null;
	var licenseObject = null;
	var licenseIsValid = true;
	var userPrefs = null;
	
	var poll_loaded_data = {
		init_loaded: false,
		init_promise: deferredPromise(),
		meta: [],
		refreshing: deferredPromise(),
		last_sync: null,
	};
	
	var storage_ultra_tokens = null;
	
	var cached_cloud_data = {
		email: {
			promises: [],
		},
		phone: {
			promises: [],
		},
		places: {
			pool: {}
		}
	};
	
	var max_entries_per_page = 35;
	
	var visible_notifications = {};
	
	var storage_data = null;
	
	var opened_options_page_tabs = {};
	
	var formFillPlaces = {};
	
	var communication_errors = false;
	
	let fakerUltraDefines = {
		emailAddress: {
			callback: function(force_prefix, force_domain) {
				
				if (!allow_online_connections) {
					return new Promise((resolve, reject) => {
						reject('Fake Data Cloud is not enabled');
					});
				}
				
				if (typeof force_prefix == 'string' || typeof force_domain == 'string') {
					fetchNewEmailAddress(force_prefix, force_domain);
				}
				
				return new Promise(async (resolve, reject) => {
					if (poll_loaded_data.init_promise && poll_loaded_data.init_promise.isPending()) {
						try {
							await poll_loaded_data.init_promise.promise();
						} catch (e) {
							reject('Fake Data Cloud Email not re-initialise');
						}
					}

					if (cached_cloud_data.email.promises.length == 0 || cached_cloud_data.email.promises[cached_cloud_data.email.promises.length-1].isRejected()) {
						fetchNewEmailAddress();
					}
					
					cached_cloud_data.email.promises[cached_cloud_data.email.promises.length-1].then(email => {
						resolve(email);
					}).catch(reject);
					
					fetchNewEmailAddress();
				});
			}
		},
		phone: {
			callback: async function (format) {

				if (!poll_loaded_data || !poll_loaded_data.meta || !poll_loaded_data.meta.phone_numbers || !poll_loaded_data.meta.phone_numbers.length) {
					if (getManifestVersion() == 3) {
						try {
							await poll_loaded_data.init_promise.promise();
						} catch (e) {
							return '';
						}
					} else {
						return '';
					}
				}

				var random_phone = faker.helpers.arrayElement(poll_loaded_data.meta.phone_numbers);
				var random_phone_number = random_phone.phone.replace(/[^0-9\+]/g, '');

				var phone_number = random_phone_number;
				var phone_number_no_prefix = random_phone_number.substr(1 + (random_phone.prefix + '').length);

				var use_phone = 'full';
				if (format.replace(/[^#]/g, '').length < phone_number.length) {
					use_phone = 'no_prefix';
				}

				var result_phone = '';
				var next_phone_digit = 0;

				if (use_phone == 'no_prefix') {
					for (var i = 0; i < format.length; i++) {
						if (format[i] == '#') {
							if (next_phone_digit >= phone_number_no_prefix.length) {
								result_phone += '';
							} else {
								result_phone += phone_number_no_prefix[next_phone_digit++];
							}
						} else {
							result_phone += format[i];
						}
					}
				} else {
					for (var i = format.length - 1; i >= 0; i--) {
						if (format[i] == '#') {
							if (next_phone_digit >= phone_number.length) {
								result_phone = '' + result_phone;
							} else {
								result_phone = phone_number[phone_number.length - 1 - next_phone_digit++] + result_phone;
							}
						} else {
							result_phone = format[i] + result_phone;
						}
					}
				}

				return result_phone;
			}
		},
		country: {
			callback: function(seed) {
				if (!allow_online_connections) {
					return new Promise((resolve, reject) => {
						reject('Fake Data Cloud is not enabled');
					});
				}
				
				return new Promise((resolve, reject) => getPlaceForCurrentFill(seed).then(data => resolve(data.place.country)).catch(reject));
			}
		},
		state: {
			callback: function(seed) {
				if (!allow_online_connections) {
					return new Promise((resolve, reject) => {
						reject('Fake Data Cloud is not enabled');
					});
				}
				
				return new Promise((resolve, reject) => getPlaceForCurrentFill(seed).then(data => resolve(data.place.state)).catch(reject));
			}
		},
		city: {
			callback: function(seed) {
				if (!allow_online_connections) {
					return new Promise((resolve, reject) => {
						reject('Fake Data Cloud is not enabled');
					});
				}
				
				return new Promise((resolve, reject) => getPlaceForCurrentFill(seed).then(data => resolve(data.place.city)).catch(reject));
			}
		},
		address: {
			callback: function(seed) {
				if (!allow_online_connections) {
					return new Promise((resolve, reject) => {
						reject('Fake Data Cloud is not enabled');
					});
				}
				
				return new Promise((resolve, reject) => getPlaceForCurrentFill(seed).then(data => resolve(data.place.street)).catch(reject));
			}
		},
		zip: {
			callback: function(seed) {
				if (!allow_online_connections) {
					return new Promise((resolve, reject) => {
						reject('Fake Data Cloud is not enabled');
					});
				}
				
				return new Promise((resolve, reject) => getPlaceForCurrentFill(seed).then(data => resolve(data.place.zipcode)).catch(reject));
			}
		},
	};
	
	
	function fdApiRequest(request_data, custom_options = null) {
		return new Promise((resolve, reject) => {
			
			if (!allow_online_connections) {
				communication_errors = false;
				reject('Permission for online connections has not been granted');
				return;
			}
			
			var default_options = {
				encryption: false,
				endpoint: '/api',
				host: "fakedata.pro",
				scheme: "https",
				headers: null,
				login: true,
				method: 'POST',
			}
			
			if (default_options.login && isLoggedIn()) {
				if (!default_options.headers) {
					default_options.headers = {};
				}
				
				default_options.headers['Authorization'] = 'Bearer ' + subact.data;
			}
			
			var options = JSON.parse(JSON.stringify(default_options));
			if (custom_options) {
				
				custom_options = JSON.parse(JSON.stringify(custom_options));
				
				if (options.headers && custom_options.headers) {
					Object.assign(options.headers, custom_options.headers);
				}
				
				Object.assign(options, custom_options);
			}
			
			var url = options.scheme + "://"+ options.host + options.endpoint;
			
			if (options.method == 'GET') {
				request_data = null;
			} else {
				if (typeof request_data == 'object') {
					request_data = JSON.stringify(request_data);
				}
				
				if (options.encryption) {
					request_data = el(request_data);
					
					if (!request_data) {
						reject('Failed to encrypt data');
						return;
					}
				}
			}
			
			if (!options.headers) {
				options.headers = {};
			}
			options.headers['Encryption'] = options.encryption ? 1 : 0;
			options.headers['FD-Api-Version'] = 2;
			
			if (typeof fetch != 'undefined') {
				fetch(url, {
					method: options.method,
					headers: options.headers,
					body: request_data
				}).then(async function(response) {
					
					var json_response = await response.json();
					
					if (response.status != 200) {
						if (!json_response) {
							console.log('XHR ERROR TO CHECK', xhr.response);
						}
						
						if (json_response && json_response.needs_login) {
							if (getManifestVersion() == 3) {
								cacheMV3AuthData(null);
							}
							await refsub(licenseKey, false);
							await fdApiRequest(request_data, custom_options).then(resolve).catch(reject);
							return;
						} else {
							reject();
							
							if (response.status == 404) {
								return;
							}
							
							if (!communication_errors) {
								sendDataToOptionsPage({type: 'cloud.communication_errors', communication_status: true});
							}
							
							communication_errors = true
						}
						
						return;
					}
					
					if (communication_errors) {
						sendDataToOptionsPage({type: 'cloud.communication_errors', communication_status: false});
					}
					
					communication_errors = false;
					
					if (!json_response) {
						reject('Could not decode response');
						return;
					}
					
					if (json_response.error) {
						reject(json_response.error);
						return;
					}
					
					var data = json_response.data;
					
					if (!data) {
						reject('Empty data received');
						return;
					}
					
					if (json_response.encrypted) {
						data = dl(data);
					}
					
					if (!data) {
						reject('Data not decrypted properly');
						return;
					}
					
					resolve(data);

					if (isDebugVersion() && typeof fakeData != 'undefined') {
						if (!fakeData.lastUltraRequest) {
							fakeData.lastUltraRequest = {};
						}

						fakeData.lastUltraRequest[options.endpoint != default_options.endpoint ? options.endpoint : JSON.parse(request_data).action] = data;
					}

				}).catch(function(e) {
					console.error(e);
					
					if (!communication_errors) {
						sendDataToOptionsPage({type: 'cloud.communication_errors', communication_status: true});
					}
					
					communication_errors = true;
					reject(e);
				});
			}
		});
	}
	
	function refsub(lic, reset_prefs = true) {
		return new Promise(async (resolve, reject) => {
			
			if (!licenseIsValid) {
				communication_errors = false;
				reject('Pro license is not valid');
				return;
			}
			
			if (!allow_online_connections) {
				communication_errors = false;
				reject('Permission for online connections has not been granted');
				return;
			}
			
			if (getManifestVersion() == 3) {
				storage_ultra_tokens = await new Promise(function(_resolve) {
					chrome.storage.local.get({
						storage_ultra_tokens: null,
					}, function(data) {
						_resolve(data.storage_ultra_tokens);
					});
				});
				
				if (storage_ultra_tokens && storage_ultra_tokens.lic_hash != md5(lic)) {
					cacheMV3AuthData(null);
				}
			}
			
			if (!storage_ultra_tokens) {
				var login_params = {
					grant_type:    'password',
					client_id:     '90f819dd-8780-401c-a69f-7c9d880e2a9e',
					scope:         '*',
					client_secret: 'cNQCciWdlLTuwYUgX1IGG7mASB70dYrKLLoQJxZe',
					username:      lic,
					password:      'fd',
				};
				
				var request_options = {
					endpoint:   '/api/oauth/token',
					encryption: false,
					headers:    {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
				};
				
				var login_params_str = [];
				
				for (var i in login_params) {
					login_params_str.push(i + '=' + encodeURIComponent(login_params[i]));
				}
				
				login_params_str = login_params_str.join('&');
				
				fdApiRequest(login_params_str, request_options).then(data => {
					
					if (getManifestVersion() == 3) {
						cacheMV3AuthData({
							data: data.data,
							lic_hash: md5(lic),
							user: data.user,
							pending_generators: {},
							init_loaded: false,
						});
					}
					
					subact = data;
					
					if (reset_prefs) {
						poll_loaded_data.init_loaded = false;
						userPrefs                    = null;
					}
					
					resolve(data);
				}).catch(err => {
					if (intervalCheckLicense === null) {
						intervalCheckLicense = setInterval(function() {
							fdApiRequest(login_params_str, request_options).then((data) => {
								clearInterval(intervalCheckLicense);
								intervalCheckLicense = null;
								
								subact = data;
								
								if (reset_prefs) {
									poll_loaded_data.init_loaded = false;
									userPrefs                    = null;
								}
								
								resolve(data);
							})
						}, 30000);
					}
				});
			} else {
				subact = storage_ultra_tokens;
				
				if (reset_prefs) {
					poll_loaded_data.init_loaded = false;
					userPrefs                    = null;
				}
				
				resolve(storage_ultra_tokens);
			}
		});
	}
	
	function subiv() {
		return isLoggedIn() && subact.user.subscription_active
	}
	
	function setOnline(status) {
		allow_online_connections = status;
	}
	
	function pollForData() {
		var manifest_version = getManifestVersion();
		
		dataPollTimeout = null;
		
		if (!allow_online_connections) {
			stopPollingForData();
			return;
		}
		
		var this_poll_promise = deferredPromise();
		
		poll_loaded_data.refreshing = this_poll_promise;

		if (!poll_loaded_data.init_loaded) {
			var defPromisEmail = deferredPromise();
			var defPromisPlace = deferredPromise();
			cached_cloud_data.email.promises.push(defPromisEmail);
			cached_cloud_data.places.pool[null] = [defPromisPlace];
		}
		
		var loadUserPrefs = new Promise(resolve => {
			if (userPrefs) {
				resolve();
			}
			
			chrome.storage.local.get({
				cloud_email_prefix: 'fd.',
				cloud_email_domain: 'fakedata.email',
				cloud_preferred_place_country: 'USA',
			}, function(data) {
				if (data.cloud_preferred_place_country != 'all' && !poll_loaded_data.init_loaded) {
					cached_cloud_data.places.pool[JSON.stringify({country: [data.cloud_preferred_place_country]})] = [defPromisPlace];
				}
				
				userPrefs = data;
				resolve();
			});
		});
		
		loadUserPrefs.then(function() {
			var post_data = {
				action: poll_loaded_data.init_loaded ? 'get_meta_delta' : 'get_meta_init',
				last_sync: poll_loaded_data.last_sync,
			};
			
			if (post_data.action == 'get_meta_init') {
				let userPrefsCopy = JSON.parse(JSON.stringify(userPrefs));
				if (userPrefsCopy.cloud_email_prefix && userPrefsCopy.cloud_email_prefix.includes('{{') && userPrefsCopy.cloud_email_prefix.includes('}}')) {
					userPrefsCopy.cloud_email_prefix = faker.helpers.fake(userPrefsCopy.cloud_email_prefix);
				}

				post_data.user_preferences = userPrefsCopy;
				if (post_data.user_preferences.cloud_preferred_place_country && post_data.user_preferences.cloud_preferred_place_country != 'all') {
					post_data.user_preferences.seed = {country: [post_data.user_preferences.cloud_preferred_place_country]};
				}
				delete post_data.user_preferences.cloud_preferred_place_country;
			}
			
			var fetch_data_promise = null;
			
			if (manifest_version == 3 && storage_ultra_tokens && storage_ultra_tokens.init_loaded && post_data.action == 'get_meta_init') {
				fetch_data_promise = new Promise(function(_resolve) {
					_resolve({
						generators: {
							email: {
								email: storage_ultra_tokens.pending_generators.emails || null
							},
							place: storage_ultra_tokens.pending_generators.places ? storage_ultra_tokens.pending_generators.places[JSON.stringify({country: [userPrefs.cloud_preferred_place_country]})] : null
						},
						meta: storage_ultra_tokens.user,
						time: storage_ultra_tokens.last_sync,
						
					})
				});
			} else {
				fetch_data_promise = fdApiRequest(post_data);
			}
			
			fetch_data_promise.then(data => {
				
				var cache_append_data = null;
				
				if (manifest_version == 3 && storage_ultra_tokens) {
					cache_append_data = {};
				}
				
				if (cache_append_data && !storage_ultra_tokens.init_loaded) {
					cache_append_data.pending_generators = {}
				}

				if (data.generators && data.generators.email && data.generators.email.email) {
					defPromisEmail.resolve(data.generators.email.email);
					
					if (cache_append_data && cache_append_data.pending_generators) {
						cache_append_data.pending_generators.emails = data.generators.email.email;
					}
				}
				
				if (data.generators && data.generators.place) {
					defPromisPlace.resolve(data.generators.place);
					
					if (cache_append_data && cache_append_data.pending_generators) {
						cache_append_data.pending_generators.places = {};
						cache_append_data.pending_generators.places[JSON.stringify({country: [userPrefs.cloud_preferred_place_country]})] = data.generators.place;
					}
				}
				
				var new_emails = 0;
				var new_sms = 0;
				
				if (poll_loaded_data.init_loaded && data.meta.emails_count > poll_loaded_data.meta.emails_count) {
					new_emails = data.meta.emails_count - poll_loaded_data.meta.emails_count;
				}
				
				if (poll_loaded_data.init_loaded && data.meta.sms_count > poll_loaded_data.meta.sms_count) {
					new_sms = data.meta.sms_count - poll_loaded_data.meta.sms_count;
				}
				
				if (new_emails || new_sms) {
					showNotifications({
						emails: new_emails,
						sms: new_sms
					});
				}
				
				poll_loaded_data.init_loaded = true;
				poll_loaded_data.last_sync = data.time;
				poll_loaded_data.meta = data.meta;
				
				if (cache_append_data) {
					cache_append_data.user = data.meta;
					cache_append_data.init_loaded = true;
					cache_append_data.last_sync = data.time;
					
					cacheMV3AuthData(cache_append_data, true);
				}
				
				parseCloudMeta(poll_loaded_data.meta);
				
				this_poll_promise.resolve(data);
				if (poll_loaded_data.init_promise.isPending()) {
					poll_loaded_data.init_promise.resolve(data);
				}
				
			}).finally(() => {

				if (typeof defPromisEmail != 'undefined' && defPromisEmail.isPending()) {
					defPromisEmail.reject();
				}

				if (typeof defPromisPlace != 'undefined' && defPromisPlace.isPending()) {
					defPromisPlace.reject();
				}

				if (dataPollStarted) {
					dataPollTimeout = setTimeout(function() {
						pollForData();
					}, dataPollIntervalSeconds * 1000);
				}
			});
		});
		
		return this_poll_promise;
	}
	
	function startPollingForData(timeout_seconds = 30) {
		dataPollIntervalSeconds = timeout_seconds;
		
		if (!dataPollStarted) {
			dataPollStarted = true;
			return pollForData();
		}
	}
	
	function stopPollingForData() {
		dataPollStarted = false
		
		if (dataPollTimeout != null) {
			clearTimeout(dataPollTimeout);
			dataPollTimeout = null;
		}
	}
	
	function pollNow() {
		stopPollingForData();
		return startPollingForData();
	}
	
	function isSubscriptionActive() {
		return licenseIsValid && subiv();
	}
	
	function isLoggedIn() {
		return allow_online_connections && subact && subact.user;
	}
	
	function setIsLicenseValid(isValid) {
		licenseIsValid = isValid;
	}
	
	function setLicenseKey(key, decoded_object) {
		licenseKey = key;
		licenseObject = decoded_object;
	}
	
	function fetchNewEmailAddress(prefix, domain) {
		
		if (prefix === null || prefix === undefined) {
			prefix = userPrefs.cloud_email_prefix;
		}

		if (prefix && prefix.includes('{{') && prefix.includes('}}')) {
			prefix = faker.helpers.fake(prefix);
		}
		
		if (domain === null || domain === undefined) {
			domain = userPrefs.cloud_email_domain;
		}
		
		var defPromis = deferredPromise();
		
		cached_cloud_data.email.promises.push(defPromis);
		
		fdApiRequest({
			action: 'get_new_email_address',
			cloud_email_prefix: prefix,
			cloud_email_domain: domain
		}).then(data => {
			
			if (getManifestVersion() == 3 && storage_ultra_tokens) {
				cacheMV3AuthData({
					pending_generators: {
						emails: data.email
					}
				}, true)
			}

			defPromis.resolve(data.email);
		}).catch(err => defPromis.reject(err));
	}
	
	function fetchNewPlace(seed) {
		
		var key = JSON.stringify(seed);
		
		if (!key) {
			key = null;
		}
		
		if (!seed || (seed && (!seed.country || !seed.country.length) && (!seed.state || !seed.state.length) && (!seed.county || !seed.county.length) && (!seed.city || !seed.city.length))) {
			key = null;
		}
		
		var defPromis = deferredPromise();
		
		if (typeof cached_cloud_data.places.pool[key] == 'undefined') {
			cached_cloud_data.places.pool[key] = [];
		}
		
		cached_cloud_data.places.pool[key].push(defPromis);
		
		fdApiRequest({
			action: 'get_new_random_place',
			seed: seed,
		}).then(data => {
			if (getManifestVersion() == 3 && storage_ultra_tokens) {
				let append_data = {
					pending_generators: {
						places: {}
					}
				};
				append_data.pending_generators.places[JSON.stringify(seed)] = data;
				cacheMV3AuthData(append_data, true)
			}
			
			defPromis.resolve(data)
		}).catch(err => defPromis.reject(err));
	}
	
	function getPlaceFromPool(seed) {
		
		var key = JSON.stringify(seed);
		
		if (!key) {
			key = null;
		}
		
		if (!seed || (seed && (!seed.country || !seed.country.length) && (!seed.state || !seed.state.length) && (!seed.county || !seed.county.length) && (!seed.city || !seed.city.length))) {
			key = null;
		}
		
		if (!allow_online_connections) {
			return new Promise((resolve, reject) => {
				reject('Fake Data Cloud is not enabled');
			});
		}
		
		return new Promise((resolve, reject) => {
			if (cached_cloud_data.places.pool[null].length == 0) {
				reject('Fake Data Cloud not initialised @2');
				return;
			}
			
			if (typeof cached_cloud_data.places.pool[key] == 'undefined' || cached_cloud_data.places.pool[key].length == 0 || cached_cloud_data.places.pool[key][cached_cloud_data.places.pool[key].length-1].isRejected()) {
				fetchNewPlace(seed);
			}
			
			cached_cloud_data.places.pool[key][cached_cloud_data.places.pool[key].length-1].then(data => {
				resolve(data);
			}).catch(reject);
			
			fetchNewPlace(seed);
		});
	}
	
	async function getPlaceForCurrentFill(seed) {
		var current_fill_session_id = fakeData.getFillSessionId();

		if (poll_loaded_data.init_promise && poll_loaded_data.init_promise.isPending()) {
			await poll_loaded_data.init_promise.promise();
		}

		if (typeof formFillPlaces[current_fill_session_id] == "undefined") {

			if (!seed || (seed && (!seed.country || !seed.country.length) && (!seed.state || !seed.state.length) && (!seed.county || !seed.county.length) && (!seed.city || !seed.city.length))) {

				if (!seed) {
					seed = {};
				}

				if (userPrefs && userPrefs.cloud_preferred_place_country != 'all') {
					seed.country = [userPrefs.cloud_preferred_place_country];
				}
			}

			if (seed.country && !seed.country.length) {
				delete seed.country;
			}

			if (seed.state && !seed.state.length) {
				delete seed.state;
			}

			if (seed.city && !seed.city.length) {
				delete seed.city;
			}

			formFillPlaces[current_fill_session_id] = getPlaceFromPool(seed);
		}

		return await formFillPlaces[current_fill_session_id];
	}
	
	function getFakerUltraDefines() {
		return fakerUltraDefines;
	}
	
	async function onReceiveMessage(msg, sender, sendResponse) {
		switch (msg.type) {
			case 'cloud.get_email_page':
			case 'cloud.get_sms_page':
			case 'cloud.poll_for_new_data':
				
				var entry_type = 'emails';
				if (msg.type == 'cloud.get_sms_page') {
					entry_type = 'sms';
				}
				
				var entries = [];
				var blacklist = [];
				
				var request_params = {
					action: 'get_'+entry_type+'_next_page',
					filters: msg.filters,
					refresh_type: entry_type
				};
				request_params[entry_type == 'emails' ? 'last_email' : 'last_sms'] = msg.last;
				
				await fdApiRequest(request_params).then(data => {
					entries = data[entry_type].list;
					if (data.blacklist && data.blacklist[entry_type]) {
						blacklist = data.blacklist[entry_type];
					}
					poll_loaded_data.meta = data.meta;
					
				});
				
				parseCloudMeta(poll_loaded_data.meta);
				
				var callback_response = {
					meta: poll_loaded_data.meta
				};
				callback_response[entry_type] = entries;
				callback_response.blacklist = blacklist;
				
				sendResponse(callback_response);
				break;
			
			case 'cloud.get_popup_email_sms':
				
				var entries = [];
				
				var request_params = {
					action: 'get_emails_next_page',
					filters: msg.filters,
					refresh_type: 'all',
					union: true
				};
				
				await fdApiRequest(request_params).then(data => {
					entries = data && data.email_sms && data.email_sms.list ? data.email_sms.list : [];
					poll_loaded_data.meta = data.meta;
					
				});
				
				parseCloudMeta(poll_loaded_data.meta);
				
				var callback_response = {
					meta: poll_loaded_data.meta
				};
				callback_response.email_sms = entries;
				
				sendResponse(callback_response);
				break;
				
			case 'cloud.mark_email_as_read':
			case 'cloud.mark_sms_as_read':
			case 'cloud.read_email':
			case 'cloud.read_sms':
				
				var entry_type = 'email';
				if (msg.type == 'cloud.read_sms' || msg.type == 'cloud.mark_sms_as_read') {
					entry_type = 'sms';
				}
				
				var request_params = {
					action: 'mark_'+entry_type+'_as_read',
				};
				request_params[entry_type + '_id'] = msg[entry_type+'_id'];
				if (msg.include_blacklist) {
					request_params.include_blacklist = true;
				}
				
				fdApiRequest(request_params).then(data => {
					
					poll_loaded_data.meta = data.meta;
					parseCloudMeta(poll_loaded_data.meta);
					
					var callback_response = {};
					callback_response[entry_type] = data[entry_type];
					if (data.blacklist) {
						callback_response.blacklist = data.blacklist.emails;
					}
					
					sendResponse(callback_response);
				}).catch(data => {
					if (data.response && data.response.error) {
						sendResponse({
							error: {
								error: data.response && data.response.error
							}
						});
					} else {
						sendResponse({
							error: JSON.parse(data.responseText)
						});
					}
				});
				break;
				
			case 'cloud.delete_email':
			case 'cloud.delete_sms':
				
				var entry_type = 'email';
				if (msg.type == 'cloud.delete_sms') {
					entry_type = 'sms';
				}
				
				var request_params = {
					action: 'delete_' + entry_type,
				};
				request_params[entry_type + '_id'] = msg[entry_type+'_id'];
				
				fdApiRequest(request_params).then(data => {
					
					poll_loaded_data.meta = data.meta;
					parseCloudMeta(poll_loaded_data.meta);
					
					sendResponse({
						deleted: data.deleted
					});
				}).catch(() => {
					sendResponse({
						deleted: false
					});
				});
				break;
				
			case 'cloud.delete_multiple_emails':
			case 'cloud.delete_multiple_sms':
				
				var entry_type = 'email';
				var request_action = 'delete_multiple_emails';
				if (msg.type == 'cloud.delete_multiple_sms') {
					entry_type = 'sms';
					request_action = 'delete_multiple_sms';
				}
				
				var request_params = {
					action:    request_action,
				};
				request_params[entry_type + '_ids'] = msg[entry_type+'_ids'];
				
				fdApiRequest(request_params).then(data => {
					
					poll_loaded_data.meta = data.meta;
					parseCloudMeta(poll_loaded_data.meta);
					
					var response_options = {};
					response_options[(entry_type == 'email' ? 'emails' : 'sms') + '_deleted'] = data ? data[(entry_type == 'email' ? 'emails' : 'sms') + '_deleted'] : null;
					
					sendResponse(response_options);
				}).catch(() => {
					var response_options = {};
					response_options[(entry_type == 'email' ? 'emails' : 'sms') + '_deleted'] = null;
					sendResponse(response_options);
				});
				break;
				
			case 'cloud.options_page_loaded':
			case 'cloud.retrieve_cloud_data':
				if (sender.tab) {
					opened_options_page_tabs[sender.tab.id] = sender;
				}
				
				if (getManifestVersion() == 3 && !poll_loaded_data.init_loaded) {
					if (!storage_ultra_tokens) {
						let _storage_ultra_tokens = await chrome.storage.local.get({storage_ultra_tokens: null});
						if (_storage_ultra_tokens && _storage_ultra_tokens.storage_ultra_tokens) {
							storage_ultra_tokens = _storage_ultra_tokens.storage_ultra_tokens;
						}
					}
					
					if (storage_ultra_tokens) {
						poll_loaded_data.meta = storage_ultra_tokens.user;
						subact = storage_ultra_tokens;
					}
				}
				
				parseCloudMeta(poll_loaded_data.meta, msg.type == 'cloud.retrieve_cloud_data' ? sendResponse : null);
				
				if (communication_errors) {
					sendDataToOptionsPage({type: 'cloud.communication_errors', communication_status: true});
				}
				
				break;
				
			case 'cloud.recheck_ultra_license_status':
				if (!isSubscriptionActive()) {
					pollForData();
				}
				break;
				
			case 'cloud.get_place':
				
				getPlaceForCurrentFill(msg.seed).then(sendResponse).catch(err => {
					sendResponse({
						error: err
					});
				})
				break;
				
			case 'cloud.add_to_blacklist':
			case 'cloud.delete_from_blacklist':
				var request_params;
				var custom_options;
				
				if (msg.entry_type == 'email') {
					request_params = {
						email: msg.email
					};
					custom_options = {
						endpoint: '/api/email/blacklist',
						method: msg.type == 'cloud.delete_from_blacklist' ? 'DELETE' : 'POST'
					}
				}
				
				fdApiRequest(request_params, custom_options).then(data => {
					
					if (msg.type == 'cloud.delete_from_blacklist' && data) {
						sendResponse({
							email: ''
						});
					} else if (msg.type == 'cloud.add_to_blacklist' && data.email) {
						sendResponse({
							email: data.email
						});
					} else {
						sendResponse({
							error: data.error || 'An error has occured. Please try again.'
						});
					}
					
				}).catch(err => {
					sendResponse({
						error: err
					});
				});
				break;
				
			case 'cloud.mark_everything_as_read':
				fdApiRequest({
					email_ids: msg.email_ids,
					sms_ids: msg.sms_ids,
				}, {
					endpoint: '/api/spambox/mark_as_read',
					method: 'POST'
				}).then(data => {
					
					if (data.meta) {
						poll_loaded_data.meta = data.meta;
						parseCloudMeta(poll_loaded_data.meta);
					}
					
					if (data.error) {
						sendResponse({
							error: data.error || 'An error has occured. Please try again.'
						});
					} else {
						sendResponse({
							success: true
						});
					}
				}).catch(err => {
					sendResponse({
						error: err
					});
				});
				break;
		}
		
		return true;
	}
	
	function sendDataToOptionsPage(data) {
		for (var i in opened_options_page_tabs) {
			try {
				chrome.tabs.sendMessage(parseInt(i), data);
			} catch (e) {
			}
		}
	}
	
	function parseCloudMeta(meta_data, sendResponse) {
		
		if (typeof meta_data == 'object' && Object.values(meta_data).length == 0) {
			meta_data = null;
		}
		
		if (!meta_data) {
			return;
		}
		
		if (typeof meta_data.subscription_active != 'undefined') {
			subact.user.subscription_active = meta_data.subscription_active;
		}
		
		if (typeof meta_data.subscription_renew_date != 'undefined') {
			subact.user.subscription_renew_date = meta_data.subscription_renew_date;
		}
		
		var unread_emails = meta_data.emails_count - meta_data.emails_read_count;
		var unread_sms = meta_data.sms_count - meta_data.sms_read_count;
		
		var cloudNotificationsCount = {
			emails: unread_emails,
			sms: unread_sms
		};
		chrome.storage.local.set({
			cloud_notifications_count: cloudNotificationsCount
		}, function() {
			if ((unread_emails + unread_sms) > 0) {
				updateBrowserBadgeText(unread_emails + unread_sms);
			} else {
				updateBrowserBadgeText('');
			}
			
			var data_to_send = {type: 'cloud.update_meta', cloud_notifications_count: cloudNotificationsCount, meta_data: meta_data || null};
			sendDataToOptionsPage(data_to_send);
			
			if (typeof sendResponse == "function") {
				sendResponse(data_to_send);
			}
		});
	}
	
	function showNotifications(notifications_count) {
		
		var check_browser_permission = new Promise((resolve, reject) => {
			chrome.permissions.contains({
				permissions: ['notifications'],
			}, function(result) {
				if (result) {
					resolve();
				} else {
					reject();
				}
			});
		});
		
		check_browser_permission.then(() => {
			
			if (notifications_count.emails) {
				showBrowserNotification('You have received ' + notifications_count.emails + ' new ' + (notifications_count.emails == 1 ? 'email' : 'emails'), 'email');
			}
			
			if (notifications_count.sms) {
				showBrowserNotification('You have received ' + notifications_count.sms + ' new SMS ' + (notifications_count.sms == 1 ? 'message' : 'messages'), 'sms');
			}
		}).catch(() => {});
		
	}
	
	function updateBrowserBadgeText(text) {
		
		if (!storage_data || !storage_data.cloud_notifications_badge) {
			return;
		}
		
		if (chrome && _chrome.browserAction && _chrome.browserAction.setBadgeText) {
			_chrome.browserAction.setBadgeText({text: '' + text});
		}
		
		if (chrome && _chrome.browserAction && _chrome.browserAction.setBadgeBackgroundColor) {
			_chrome.browserAction.setBadgeBackgroundColor({color: [204,0,0,255]});
		}
	}
	
	function showBrowserNotification(message, type, title = 'Fake Data Cloud') {
		
		if (!storage_data || !storage_data.cloud_notifications) {
			return;
		}
		
		chrome.notifications.create({
			title: title,
			message: message,
			iconUrl: '/icons/icon512.png',
			type: 'basic'
		}, function(notification_id) {
			visible_notifications[notification_id] = {
				type: type
			}
		});
	}
	
	function setPreferences(data) {
		if (!data) {
			return;
		}
		
		if (!storage_data) {
			storage_data = {}
		}
		
		for (var i in data) {
			storage_data[i] = data[i];
		}
	}
	
	function getLastSmsMessageTest(back_num = 1) {
		return new Promise(function(resolve, reject) {
			fdApiRequest({}, {
				endpoint: '/api/sms/single?page=' + back_num,
				method: 'GET'
			}).then(data => {
				resolve(data.sms);
			}).catch(reject);
		});
	}
	
	function cacheMV3AuthData(data, append = false) {
		if (getManifestVersion() == 3) {
			if (append) {
				mergeDeep(storage_ultra_tokens, data);
			} else {
				storage_ultra_tokens = data;
			}
			
			chrome.storage.local.set({storage_ultra_tokens: storage_ultra_tokens});
		}
	}
	
	if (chrome.notifications) {
		chrome.notifications.onClicked.addListener(function(notification_id) {
			if (typeof visible_notifications[notification_id] == 'undefined') {
				return;
			}
			
			switch (visible_notifications[notification_id].type) {
				case 'email':
					chrome.tabs.create({
						'url': "/options/index.html#/cloud/email"
					});
					break;
				
				case 'sms':
					chrome.tabs.create({
						'url': "/options/index.html#/cloud/sms"
					});
					break;
			}
			
			chrome.notifications.clear(notification_id);
		});
		
		chrome.notifications.onClosed.addListener(function(notification_id) {
			if (typeof visible_notifications[notification_id] == 'undefined') {
				return;
			}
			
			delete visible_notifications[notification_id];
		});
	}
	
	if (chrome.tabs) {
		chrome.tabs.onRemoved.addListener(function(tabId) {
			if (typeof opened_options_page_tabs[tabId] != 'undefined') {
				delete opened_options_page_tabs[tabId];
			}
		});
		
		chrome.tabs.query({}, function (tabs) {
			for (var i in tabs) {
				var promise = chrome.tabs.sendMessage(tabs[i].id, {type: 'cloud.gather_tabs'});
				if (promise && promise instanceof Promise) {
					promise.catch(err => {});
				}
			}
		});
	}
	
	return {
		refsub: refsub,
		subiv: subiv,
		startPollingForData: startPollingForData,
		stopPollingForData: stopPollingForData,
		isSubscriptionActive: isSubscriptionActive,
		setOnline: setOnline,
		setLicenseKey: setLicenseKey,
		setIsLicenseValid: setIsLicenseValid,
		getFakerUltraDefines: getFakerUltraDefines,
		onReceiveMessage: onReceiveMessage,
		pollNow: pollNow,
		setPreferences: setPreferences,
		getLastSmsMessageTest: getLastSmsMessageTest,
		cacheMV3AuthData: cacheMV3AuthData,
	};
})();
