function fdIntegrationsGoogleFormsEnable() {
	
	if (window.location.href.substring(0, 30) != 'https://docs.google.com/forms/') {
		return;
	}
	
	function getUniqueSelectorGoogleForm($element, is_radio_grid = false) {
		var element = $element.get(0);
		
		var $parents = $element.parents('[role=listitem]');
		var $parent = $parents.last();
		
		var heading = '^GooglFormItemHeading^' + $parent.find('[role=heading]').text();
		
		if ($parents.length > 1) {
			for (var i = 0; i <= $parents.length - 2; i++) {
				heading += ' ^GooglFormItemHeading^' + $($parents[i]).text();
			}
		}
		
		if (is_radio_grid) {
			var $parent_group = $element.parents('[role=radiogroup]');
			if ($parent_group.length > 0) {
				heading += ' ^GooglFormItemHeading^' + $($($parent_group[0]).find('div').get(0)).text();
			}
		}


		return heading;
	}
	
	fakeData.registerElement('[role=checkbox]', {
		onQuery: function (obj) {

			let $checkbox = $(obj.element);
			
			if ($checkbox.length == 0) {
				return null;
			}
			
			obj.fill_session.push($checkbox.get(0));
			
			var uniqueSelector = getUniqueSelectorGoogleForm($checkbox);
			
			return {
				isValidInput: true,
				kind:         'option',
				inputType:    'checkbox',
				selector:     uniqueSelector,
			}
		},
		onFill:  function (obj) {
			var value    = obj.value;
			var element  = obj.element;
			var selector = obj.selector;
			var event    = obj.event;

			let $checkbox = $(element);
			
			var click = false;
			
			if (value === true) {
				click = !!Math.floor(Math.random() * 2);
			} else if (value !== false) {
				if (value == 'checked' && ($checkbox.attr('aria-checked') != 'true')) {
					click = true;
				} else if (value == 'unchecked' && ($checkbox.attr('aria-checked') == 'true')) {
					click = true;
				}
			}
			
			if (click) {
				$checkbox.trigger('click');
			}
		}
	});
	
	fakeData.registerElement('input[type=text], textarea', {
		isHTMLInput: true,
		onQuery: function (obj) {
			
			let $input = $(obj.element);
			
			if ($input.length == 0) {
				return null;
			}
			
			obj.fill_session.push($input.get(0));
			
			var uniqueSelector = getUniqueSelectorGoogleForm($input);
			
			return {
				isValidInput: true,
				kind:         'unnamed',
				inputType: $input.attr('type') || 'text',
				selector:     uniqueSelector,
			}
		},
		onFill:  function (obj) {
			
			var set_check_status = null;
			
			setTimeout(function() {
				var $element  = $(obj.element);
				
				var $checkbox = $element.closest('[role=listitem]').find('[role=checkbox]');
				var $radio = $element.closest('[role=listitem]').find('[role=radio]').last();
				
				if (($checkbox.length == 0 && $radio.length == 0) || obj.fill_session_type == 'single') {
					$element.val(obj.value);
				} else if ($checkbox.length > 0 && ($checkbox.attr('aria-checked') == 'true')) {
					$element.val(obj.value);
				} else if ($radio.length > 0 && ($radio.attr('aria-checked') == 'true')) {
					$element.val(obj.value);
				} else {
					$element.val('');
					
					set_check_status = false;
					
					if ($radio.length > 0) {
						var $checked_radio = $element.closest('[role=listitem]').find('[role=radio][aria-checked=true]');
					}
				}
				
				fakeData.triggerInputChangeEvent($element.get(0), 'input');
				fakeData.triggerInputChangeEvent($element.get(0), 'change');
				
				if (set_check_status !== null) {
					setTimeout(function() {
						
						if (!set_check_status) {
							if ($checkbox.length > 0 && ($checkbox.attr('aria-checked') == 'true')) {
								$checkbox.trigger('click');
							}
						} else {
							if ($checkbox.length > 0 && ($checkbox.attr('aria-checked') != 'true')) {
								$checkbox.trigger('click');
							}
						}
						
						if ($checked_radio && $checked_radio.length && $checked_radio.attr('aria-checked') != 'true') {
							$checked_radio.trigger('click');
						}
					}, 100);
				}
				
			}, 100);
		}
	});
	
	fakeData.registerElement('[role=radio]', {
		onQuery: function (obj) {

			var $element  = $(obj.element);
			var $radio = $element;

			var $parent = $element.closest('[role=listitem]');
			var $group = null;
			
			$element.parents('div').each(function() {
				if ($(this).find('[role=radio]').length > 1) {
					$group = $(this);
					return false;
				}
			});
			
			var is_grid = false;
			
			var $parents = $element.parents('[role=listitem]');
			
			let $main_parent = $parents.last();
			
			if ($main_parent.find('[role=radiogroup]').length > 1) {
				is_grid = true;
			}
			
			if (!$group) {
				return;
			}

			if ($radio.length == 0) {
				return null;
			}
			
			if ($group.length) {
				$group.find('[role=radio]').each(function() {
					obj.fill_session.push($(this).get(0));
				});

			} else {
				obj.fill_session.push($radio.get(0));
			}

			var options = [];

			if (is_grid) {
				var $labels_group = $($main_parent.find('[role=radiogroup]')[0]).prev().find('div');
				
				for (var i = 1; i < $labels_group.length; i++) {
					options.push({
						text: $($labels_group[i]).text().trim(),
						value: i - 1,
						disabled: false
					});
				}
			} else {
				$group.find('label').each(function(index) {
					options.push({
						text: $(this).text().trim(),
						value: index,
						disabled: false
					});
				});

			}
			
			var uniqueSelector = getUniqueSelectorGoogleForm($element, is_grid);
			
			return {
				isValidInput: true,
				kind:         'option',
				inputType:    'radio',
				selector:     uniqueSelector,
				selectOptions: options
			}

		},
		onFill:  function (obj) {
			var value    = obj.value;
			var element  = obj.element;
			var selector = obj.selector;
			var event    = obj.event;
			
			let $element = $(obj.element);
			let $radio = $element;
			let $group = $element.closest('[role=radiogroup]');

			var selected_element_index = null;
			
			if ($group.length == 0) {
				return;
			}
			
			if (value === true) {
				selected_element_index = Math.floor(Math.random() * $group.find('[role=radio]').length);
			} else if (value !== false && !isNaN(value)) {
				selected_element_index = parseInt(value);
			}
			
			if ($group.find('[role=radio]').eq(selected_element_index).attr('aria-checked') != 'true') {
				$group.find('[role=radio]').eq(selected_element_index).trigger('click');
			}
		}
	});
	
	fakeData.registerElement('[role=listbox]', {
		onQuery: function (obj) {
			
			let $element = $(obj.element);
			var $options = $element.find('[role=option]').not('[data-value=""]');

			var options = [];
			var currentOption = options;
			
			$options.each(function (index) {
				currentOption.push({
					text:     $(this).text().trim(),
					value:    $(this).text().trim(),
					disabled: false
				});
			});
			
			var uniqueSelector = getUniqueSelectorGoogleForm($element);
			
			return {
				isValidInput: true,
				kind:         'option',
				inputType:    'select',
				selector:     uniqueSelector,
				selectOptions: options
			};
		},
		onFill:  function (obj) {
			var value    = obj.value;
			var element  = obj.element;
			var selector = obj.selector;
			var event    = obj.event;
			
			let $element = $(element);
			
			return new Promise(function(resolve) {
				var menu_was_opened = false;
				var select_interval = null;

				if (value === true) {
					$element.find('[role=option]').eq(0).click();
					
					select_interval = setInterval(function() {

						if ($element.attr('aria-expanded') != 'true') {
							if (menu_was_opened) {
								clearInterval(select_interval);
								select_interval = null;
								resolve();
							}

							return;
						}

						if (!menu_was_opened) {
							menu_was_opened = true;
							
							var $options = $element.find('[role=option]').not('[data-value=""]').not('[aria-selected=true]');
							var selected_option = Math.floor(Math.random() * $options.length);
							
							$options.eq(selected_option).click();
						}
					});

					setTimeout(function() {
						if (select_interval) {
							clearInterval(select_interval);
							select_interval = null;
							resolve();
						}
					}, 500);

				} else if (value !== null && value !== false) {
					
					$element.find('[role=option]').eq(0).click();
					
					select_interval = setInterval(function() {

						if ($element.attr('aria-expanded') != 'true') {
							if (menu_was_opened) {
								clearInterval(select_interval);
								select_interval = null;
								resolve();
							}

							return;
						}

						if (!menu_was_opened) {
							menu_was_opened = true;
							
							var $options = $element.find('[role=option]').not('[data-value=""]');

							$options.each(function () {
								if ($(this).text().trim() === value.trim()) {
									$(this).trigger('click');
									return false;
								}
							});
						}
					});

					setTimeout(function() {
						if (select_interval && !menu_was_opened) {
							$element.find('[role=option]').eq(0).click();
						}
					}, 500);
					
					setTimeout(function() {
						if (select_interval) {
							clearInterval(select_interval);
							select_interval = null;
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
