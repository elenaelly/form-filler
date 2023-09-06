var manifest_version = getManifestVersion();

var _chrome = {
	tabs: {
		query: function() {
			var queryInfo = arguments[0];
			var callback = arguments[1];
			
			return chrome.tabs.query(queryInfo, callback);
		},
		sendMessage: function() {
			var tabId = arguments[0];
			var message = arguments[1];
			var options;
			var responseCallback;
			
			if (arguments.length == 3) {
				responseCallback = arguments[2];
				
				return chrome.tabs.sendMessage(tabId, message, responseCallback);
			} else if (arguments.length == 4) {
				options = arguments[2];
				responseCallback = arguments[3];
				
				return chrome.tabs.sendMessage(tabId, message, options, responseCallback);
			}
		}
	},
	contextMenus: {
		update: function() {
			var id = arguments[0];
			var updateProperties = arguments[1];
			var callback;
			
			if (arguments.length < 3) {
				return _chrome.contextMenus.update(id, updateProperties);
			} else {
				callback = arguments[2];
				return _chrome.contextMenus.update(id, updateProperties, callback);
			}
		}
	},
	permissions: {
		contains: function() {
			var permissions = arguments[0];
			var callback;
			
			if (arguments.length < 2) {
				return chrome.permissions.contains(permissions);
			} else {
				callback = arguments[1];
				return chrome.permissions.contains(permissions, callback);
			}
		},
		request: function() {
			var permissions = arguments[0];
			var callback;
			
			if (arguments.length < 2) {
				return chrome.permissions.request(permissions);
			} else {
				callback = arguments[1];
				return chrome.permissions.request(permissions, callback);
			}
		}
		
	},
	browserAction: {
		onClicked: {
			addListener: function() {
				var callback = arguments[0];
				
				if (manifest_version == 2) {
					return chrome.browserAction.onClicked.addListener(callback);
				} else {
					return chrome.action.onClicked.addListener(callback);
				}
			}
		},
		_setPopup: function() {
			var details = arguments[0];
			var callback;
			
			if (arguments.length < 2) {
				if (manifest_version == 3) {
					return chrome.action.setPopup(details);
				} else {
					return chrome.browserAction.setPopup(details);
				}
			} else {
				callback = arguments[1];
				
				if (manifest_version == 3) {
					return chrome.action.setPopup(details, callback);
				} else {
					return chrome.browserAction.setPopup(details, callback);
				}
			}
		},
		_setBadgeText: function() {
			var details = arguments[0];
			var callback;
			
			if (arguments.length < 2) {
				if (manifest_version == 3) {
					return chrome.action.setBadgeText(details);
				} else {
					return chrome.browserAction.setBadgeText(details);
				}
			} else {
				callback = arguments[1];
				
				if (manifest_version == 3) {
					return chrome.action.setBadgeText(details, callback);
				} else {
					return chrome.browserAction.setBadgeText(details, callback);
				}
			}
		},
		_setBadgeBackgroundColor: function() {
			var details = arguments[0];
			var callback;
			
			if (arguments.length < 2) {
				if (manifest_version == 3) {
					return chrome.action.setBadgeBackgroundColor(details);
				} else {
					return chrome.browserAction.setBadgeBackgroundColor(details);
				}
			} else {
				callback = arguments[1];
				
				if (manifest_version == 3) {
					return chrome.action.setBadgeBackgroundColor(details, callback);
				} else {
					return chrome.browserAction.setBadgeBackgroundColor(details, callback);
				}
			}
		}
	},
	scripting: {
		executeScript: function(args) {
			if (manifest_version == 3) {
				return chrome.scripting.executeScript(args);
			} else {
				// not handled or needed for mv2
			}
		}
	},
	manifest_version: manifest_version,
}

if (manifest_version == 3) {
	if (chrome.action.setPopup) {
		_chrome.browserAction.setPopup = _chrome.browserAction._setPopup;
	}
	
	if (chrome.action.setBadgeText) {
		_chrome.browserAction.setBadgeText = _chrome.browserAction._setBadgeText;
	}
	
	if (chrome.action.setBadgeBackgroundColor) {
		_chrome.browserAction.setBadgeBackgroundColor = _chrome.browserAction._setBadgeBackgroundColor;
	}
	
	_chrome.action = _chrome.browserAction;
} else {
	if (chrome.browserAction.setPopup) {
		_chrome.browserAction.setPopup = _chrome.browserAction._setPopup;
	}
	
	if (chrome.browserAction.setBadgeText) {
		_chrome.browserAction.setBadgeText = _chrome.browserAction._setBadgeText;
	}
	
	if (chrome.browserAction.setBadgeBackgroundColor) {
		_chrome.browserAction.setBadgeBackgroundColor = _chrome.browserAction._setBadgeBackgroundColor;
	}
}
