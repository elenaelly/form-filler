function fdIntegrationsSelect2Enable() {
	
	var select2TabEventSource = null;
	var select2TabEventOrigin = null;
	
	fakeData.addEventListener('select2handler', function (event) {
		if (event.data.message == 'hello') {
			select2TabEventSource = event.source;
			select2TabEventOrigin = event.origin;
		}
	});
	
	if (fakeData.getManifestVersion() < 3) {
		var function_to_execute = _func_fdIntegrationsSelect2Enable.toString();
		
		var script = document.createElement('script');
		script.textContent = '(' + function_to_execute + ')()';
		(document.head || document.documentElement).appendChild(script);
		script.remove();
	}
	
	function getSelectOptions(element, only_options = false, ignore_disabled = false) {
		var select_options = $(element).find('> *');
		var select_options_array = [];
		
		if (select_options.length) {
			for(var i = 0; i < select_options.length; i++) {
				if (select_options.eq(i).prop('tagName') == 'OPTGROUP') {
					var optgroup_array = [];
					var optgroup_options = select_options.eq(i).find('> *');
					
					for(var j = 0; j < optgroup_options.length; j++) {
						
						if (ignore_disabled && optgroup_options.get(j).disabled) continue;
						
						if (!only_options) {
							optgroup_array.push({
								text: optgroup_options.get(j).text,
								value: optgroup_options.get(j).value,
								disabled: optgroup_options.get(j).disabled,
							});
						} else {
							select_options_array.push({
								text: optgroup_options.get(j).text,
								value: optgroup_options.get(j).value,
								disabled: optgroup_options.get(j).disabled,
							});
						}
					}
					
					if (!only_options) {
						select_options_array.push({
							label: select_options.get(i).label,
							options: optgroup_array
						});
					}
				} else {
					
					if (ignore_disabled && select_options.get(i).disabled) continue;
					
					select_options_array.push({
						text: select_options.get(i).text,
						value: select_options.get(i).value,
						disabled: select_options.get(i).disabled,
					});
				}
			}
		}
		
		return select_options_array;
	}
	
	fakeData.registerElement('.select2.select2-container', {
		onQuery: function (match) {

			let $element = $(match.element);
			let $parent_select = $element.prev('select');
			
			if (!$element.length || !$parent_select.length) {
				return null;
			}
			
			if ($element.hasClass('select2-container--disabled')) {
				return null;
			}
			
			return {
				isValidInput: true,
				kind: 'option',
				inputType: 'select',
				selector: fakeData.getUniqueSelector($parent_select.get(0)),
				selectOptions: getSelectOptions($parent_select)
			}
		},
		onFill: function (obj) {
			var value = obj.value;
			var element = obj.element;
			var selector = obj.selector;
			var event = obj.event;
			var fill_session = obj.fill_session;

			let $element = $(obj.element);
			let $parent_select = $element.prev('select');
			
			if (fill_session.indexOf($parent_select.get(0)) >= 0) {
				return false;
			}
			
			if (value === false) {
				return false;
			}

			if (select2TabEventSource) {
				if (value === true) {
					let selectOptions = getSelectOptions($parent_select, true, true);
					let randomSelection = selectOptions[Math.floor(Math.random() * (selectOptions.length)) + 0];
					if (!randomSelection) return false;
					
					value = randomSelection.value;
				} else if (value instanceof DeferredPromise) {
					fill_session.push($parent_select.get(0));

					value.then(data => {
						let selectOptions = getSelectOptions($parent_select, true, true);

						let option_value = null;

						for (let i = 0; i < selectOptions.length; i++) {
							if (selectOptions[i].text.toLowerCase() == data.text.toLowerCase() || data.aliases.indexOf(selectOptions[i].text.toLowerCase()) >= 0 || selectOptions[i].value.toLowerCase() == data.text.toLowerCase() || data.aliases.indexOf(selectOptions[i].value.toLowerCase()) >= 0) {
								option_value = selectOptions[i].value;
								break;
							}
						}

						if (!option_value) {
							return;
						}

						select2TabEventSource.postMessage({
							event: 'fakedata:fillselect2',
							selector: selector,
							value: option_value
						}, select2TabEventOrigin);
					});

					return;
				}

				select2TabEventSource.postMessage({
					event: 'fakedata:fillselect2',
					selector: selector,
					value: value
				}, select2TabEventOrigin);
				
				fill_session.push($parent_select.get(0));
			}
		}
	});
}
