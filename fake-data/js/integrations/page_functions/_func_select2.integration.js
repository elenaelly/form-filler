function _func_fdIntegrationsSelect2Enable() {
	window.postMessage({
		event: 'fakedata:select2handler',
		message: 'hello'
	}, "*");
	
	window.addEventListener('message', function (event) {
		if (event.data.event) {
			switch (event.data.event) {
				case 'fakedata:fillselect2':
					if (typeof jQuery != 'undefined') {
						jQuery(event.data.selector).prev('select').val(event.data.value).trigger('change');
					}
					break;
			}
		}
	});
}

// for MV3, _contentScripts is declared in background worker
if (typeof _contentScripts != 'undefined') {
	_contentScripts._func_fdIntegrationsSelect2Enable = _func_fdIntegrationsSelect2Enable;
}
