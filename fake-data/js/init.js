var lic = null;
var icon_action = 'popup';

function getStorageEngine() {
	return chrome.storage.local;
}

getStorageEngine().get(function(data) {
    var updateInitialdata = false;
    var initParams = data || {};
	lic = data.license_key;
	icon_action = data.icon_action || 'popup';
    
    var firstRunVersion = data.first_run || 0;
    
    if (firstRunVersion == 0) {
        initParams = {
			custom_callbacks: {
				email: "var email = \"your.email@gmail.com\";\n\nvar min = 10000;\nvar max = 99990;\nvar rand = Math.floor(Math.random() * (max - min + 1)) + min;\nvar email_split = email.split('@');\n\nreturn email_split[0]+'+fakedata'+rand+'@'+email_split[1];"
			},
			language: 'en_US',
			insert_method: 'replace',
			first_run: 5,
			show_fd_popup_welcome: false,
		};

        updateInitialdata = true;
	} else {
    	if (typeof initParams.show_fd_popup_welcome == 'undefined') {
			initParams.show_fd_popup_welcome = true;
		}
	}

	if (firstRunVersion < 3) {
        initParams.custom_generators = data.custom_generators || [];

	    var foundNameConflict = false;
	    for (var i = 0; i < initParams.custom_generators.length; i++) {
            if (initParams.custom_generators[i].label == 'last_generated_email') {
                foundNameConflict = true;
                break;
            }
        }

        if (!foundNameConflict) {
            initParams.custom_generators.push({
                label: "last_generated_email",
                callback: "return fakeData.getLastGeneratedValue('email');"
            });
        }

        initParams.first_run = 3;
        updateInitialdata = true;
    }
	
	if (firstRunVersion < 4) {
		initParams.install_date = new Date().toISOString();
		
		initParams.first_run = 4;
		updateInitialdata = true;
	}
	
	if (firstRunVersion < 5) {
		if (initParams.extra_fields) {
			for (var i in initParams.extra_fields) {
				if ((initParams.extra_fields[i].kind == 'named' || initParams.extra_fields[i].kind == 'unnamed') && initParams.extra_fields[i].generator == 'url') {
					if (!initParams.custom_generators) {
						initParams.custom_generators = [];
					}
					
					initParams.custom_generators.push({
						label: 'url',
						callback: 'return faker.internet.url();'
					});
					break;
				}
			}
		}
		
		if (initParams.default_generator_checkboxes) delete initParams.default_generator_checkboxes.url;
		if (initParams.default_generators_settings) delete initParams.default_generators_settings.url;
		if (initParams.custom_callbacks) delete initParams.custom_callbacks.url;
		
		initParams.first_run = 5;
		
		if (_chrome.browserAction && _chrome.browserAction.setPopup) {
			initParams.icon_action = 'popup';
			
			_chrome.browserAction.setPopup({
				popup: 'options/index.html#/popup/main'
			});
		}
		
		updateInitialdata = true;
	}
	
	if (updateInitialdata) {
        getStorageEngine().set(initParams);
		
		if (getManifestVersion() == 3) {
			fakeData.refreshData();
		} else {
			location.reload();
		}
    }
});

_chrome.browserAction.onClicked.addListener(function(tab) {
	if (['fill_input', 'fill_form', 'fill_page'].indexOf(icon_action) >= 0) {
		chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {
				type: 'browser_action',
				action: icon_action
			});
		});
	} else {
		chrome.tabs.create({ 'url': 'options/index.html' });
	}
});

if (chrome.commands) {
	chrome.commands.onCommand.addListener(function(command) {
		var forward_cmd = null;
		switch (command) {
			case 'command-fill-active-field':
				forward_cmd = 'fill_input';
				break;
				
			case 'command-fill-active-form':
				forward_cmd = 'fill_form';
				break;
				
			case 'command-fill-entire-page':
				forward_cmd = 'fill_page';
				break;
				
			case 'command-manage-active-field':
				forward_cmd = 'manage_field';
				break;
		}
		
		if (forward_cmd) {
			chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					type: 'browser_action',
					action: forward_cmd
				});
			});
		}
	});
}

chrome.runtime.setUninstallURL("https://fakedata.haterapps.com/uninstall/");

