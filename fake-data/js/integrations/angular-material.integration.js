function fdIntegrationsAngularMaterialEnable() {
	
	fakeData.registerElement('mat-checkbox, mat-slide-toggle', {
		onQuery: function (obj) {
			
			$element  = $(obj.element);
			$checkbox = $element.find('input[type=checkbox]');
			
			if ($checkbox.length == 0) {
				return null;
			}
			
			if ($element.hasClass('mat-checkbox-disabled') || $element.hasClass('mat-disabled') || $checkbox.prop('disabled')) {
				return null;
			}
			
			obj.fill_session.push($checkbox.get(0));
			
			return {
				isValidInput: true,
				kind:         'option',
				inputType:    'checkbox',
				selector:     fakeData.getUniqueSelector($checkbox.get(0)),
			}
		},
		onFill:  function (obj) {
			var value    = obj.value;
			var element  = obj.element;
			var selector = obj.selector;
			var event    = obj.event;
			
			$element  = $(element);
			$checkbox = $element.find('input[type=checkbox]');
			
			var click = false;
			
			if (value === true) {
				click = !!Math.floor(Math.random() * 2);
			} else if (value !== false) {
				if (value == 'checked' && !$checkbox.prop('checked')) {
					click = true;
				} else if (value == 'unchecked' && $checkbox.prop('checked')) {
					click = true;
				}
			}
			
			if (click) {
				$checkbox.trigger('click');
			}
		}
	});
	
	fakeData.registerElement('mat-radio-button', {
		onQuery: function (obj) {
			
			$element  = $(obj.element);
			$radio = $element.find('input[type=radio]');
			$group = $element.closest('mat-radio-group');
			
			
			if ($radio.length == 0) {
				return null;
			}
			
			if ($element.hasClass('mat-radio-disabled') || $radio.prop('disabled')) {
				return null;
			}
			
			if ($group.length) {
				
				$group.find('mat-radio-button').each(function() {
					obj.fill_session.push($(this).get(0));
					obj.fill_session.push($(this).find('input[type=radio]').get(0));
				});
				
			} else {
				obj.fill_session.push($radio.get(0));
			}
			
			var options = [];
			
			$group.find('.mat-radio-label-content').each(function(index) {
				options.push({
					text: $(this).text().trim(),
					value: index,
					disabled: $(this).closest('mat-radio-button').hasClass('mat-radio-disabled')
				});
			});
			
			return {
				isValidInput: true,
				kind:         'option',
				inputType:    'radio',
				selector:     fakeData.getUniqueSelector($radio.get(0)),
				selectOptions: options
			}
			
		},
		onFill:  function (obj) {
			var value    = obj.value;
			var element  = obj.element;
			var selector = obj.selector;
			var event    = obj.event;
			
			$element  = $(obj.element);
			$radio = $element.find('input[type=radio]');
			$group = $element.closest('mat-radio-group');
			
			if (value === true) {
				var selected_option = Math.floor(Math.random() * $group.find('mat-radio-button').length);
				
				$group.find('mat-radio-button').eq(selected_option).find('input[type=radio]').trigger('click');
			} else if (value !== false && !isNaN(value)) {
				$group.find('mat-radio-button').eq(parseInt(value)).find('input[type=radio]').trigger('click');
			}
		}
	});
	
	fakeData.registerElement('mat-select', {
		onQuery: function (obj) {
			
			$element  = $(obj.element);
			
			if ($element.hasClass('mat-select-disabled')) {
				return null;
			}
			
			$element.click();
			
			return new Promise(function(resolve) {
				
				var mat_select_interval = setInterval(function() {
					
					if (!$('mat-option').length) return;
					
					var options = [];
					var currentOption = options;
					var insideOptGroup = false;
					
					var optGroupLeftPos = null;
					if ($('.cdk-overlay-container mat-optgroup').length) {
						optGroupLeftPos = $('.cdk-overlay-container mat-optgroup:first .mat-optgroup-label:first').offset().left;
					}
					
					$('.cdk-overlay-container').find('mat-option, mat-optgroup').each(function (index) {
						
						if ($(this).is('mat-optgroup')) {
							var optgroup = {
								label: $(this).find('.mat-optgroup-label:first').text().trim(),
								options: []
							};
							
							options.push(optgroup);
							currentOption = optgroup.options;
							
						} else {
							if ($(this).find('.mat-option-text:first').offset().left <= optGroupLeftPos) {
								currentOption = options;
							}
							
							currentOption.push({
								text:     $(this).find('.mat-option-text').text().trim(),
								value:    $(this).find('.mat-option-text').text().trim(),
								disabled: $(this).hasClass('mat-option-disabled')
							});
						}
					});
					
					$('.cdk-overlay-backdrop').click();
					
					clearInterval(mat_select_interval);
					
					resolve({
						isValidInput: true,
						kind:         'option',
						inputType:    'select',
						selector:     fakeData.getUniqueSelector($element.get(0)),
						selectOptions: options
					});
				});
			});
		},
		onFill:  function (obj) {
			var value    = obj.value;
			var element  = obj.element;
			var selector = obj.selector;
			var event    = obj.event;
			
			$element  = $(element);
			
			if ($element.hasClass('mat-select-disabled')) {
				return null;
			}
			
			return new Promise(function(resolve) {
				
				if (value === true) {
					$element.click();
					
					var menu_was_opened = false;
					var mat_select_interval = setInterval(function() {
						
						if (!$('.cdk-overlay-container mat-option').length) {
							if (menu_was_opened) {
								clearInterval(mat_select_interval);
								mat_select_interval = null;
								resolve();
							}
							
							return;
						}
						
						if (!menu_was_opened) {
							menu_was_opened = true;
							
							var matOptionSelector = 'mat-option:not(.mat-selected):not(.mat-option-disabled)';
							
							var selected_option = Math.floor(Math.random() * $('.cdk-overlay-container').find(matOptionSelector).length);
							
							$('.cdk-overlay-container').find(matOptionSelector).eq(selected_option).trigger('click');
							
							$('.cdk-overlay-backdrop').click();
						}
					});
					
					setTimeout(function() {
						if (mat_select_interval) {
							clearInterval(mat_select_interval);
							mat_select_interval = null;
							resolve();
						}
					}, 1000);
					
				} else if (value !== null && value !== false) {
					$element.click();
					
					var menu_was_opened = false;
					var mat_select_interval = setInterval(function() {
						
						if (!$('.cdk-overlay-container mat-option').length) {
							if (menu_was_opened) {
								clearInterval(mat_select_interval);
								mat_select_interval = null;
								resolve();
							}
							
							return;
						}
						
						if (!menu_was_opened) {
							menu_was_opened = true;
							
							var matOptionSelector = 'mat-option';
							
							$('.cdk-overlay-container').find(matOptionSelector).each(function () {
								if ($(this).find('.mat-option-text:first').text().trim() === value.trim()) {
									$(this).trigger('click');
									return false;
								}
							});
							
							$('.cdk-overlay-backdrop').click();
						}
					});
					
					setTimeout(function() {
						if (mat_select_interval) {
							clearInterval(mat_select_interval);
							mat_select_interval = null;
							resolve();
						}
					}, 1000);
					
				} else {
					resolve();
				}
			});
		}
	});
}