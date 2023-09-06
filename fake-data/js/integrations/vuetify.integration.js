function fdIntegrationsVuetifyEnable() {
	
	// checkboxes
	fakeData.registerElement('.v-input.v-input--checkbox, .v-input.v-input--switch', {
		onQuery: function(obj) {
			var element = obj.element;
			var $element = $(element);
			
			var $checkbox = $element.find('input[type=checkbox]');
			
			if (!$checkbox.length) {
				return;
			}
			
			if ($checkbox.prop('disabled')) {
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
			
			var $element  = $(element);
			var $checkbox = $element.find('input[type=checkbox]');
			
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
	
	// radio buttons
	fakeData.registerElement('.v-input .v-input__control .v-radio', {
		onQuery: function (obj) {
			
			var $element  = $(obj.element);
			var $radio = $element.find('input[type=radio]');
			var $group = $element.closest('.v-input--radio-group__input');
			
			
			if ($radio.length == 0) {
				return null;
			}
			
			if ($radio.prop('disabled')) {
				return null;
			}
			
			if ($group.length) {
				
				$group.find('.v-radio').each(function() {
					obj.fill_session.push($(this).get(0));
					obj.fill_session.push($(this).find('input[type=radio]').get(0));
				});
				
			} else {
				obj.fill_session.push($radio.get(0));
				
				$group = $radio;
			}
			
			var options = [];
			
			$group.find('label').each(function(index) {
				options.push({
					text: $(this).text().trim(),
					value: index,
					disabled: $(this).closest('.v-radio').find('input[type=radio]').prop('disabled')
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
			
			var $element  = $(obj.element);
			var $group = $element.closest('.v-input--radio-group__input');
			
			if (value === true) {
				var selected_option = Math.floor(Math.random() * $group.find('.v-radio').length);
				
				$group.find('.v-radio').eq(selected_option).find('input[type=radio]').trigger('click');
			} else if (value !== false && !isNaN(value)) {
				$group.find('.v-radio').eq(parseInt(value)).find('input[type=radio]').trigger('click');
			}
		}
	});
	
	// select
	fakeData.registerElement('.v-input .v-input__control .v-select__slot, .v-input .v-input__control .v-select__slot input, .v-menu__content', {
		isHTMLInput: true,
		overlaps: function(element1, element2) {
			let rect1 = element1.getBoundingClientRect();
			let rect2 = element2.getBoundingClientRect();
			
			return !(rect1.right < rect2.left ||
				rect1.left > rect2.right ||
				rect1.bottom < rect2.top ||
				rect1.top > rect2.bottom);
		},
		onQuery: async function(obj) {
			
			var element  = obj.element;
			var $element = $(element);
			var clicked_on_select_first = true;
			var menuElement;
			
			if ($element.is('.v-menu__content')) {
				menuElement = element;
				var all_selects = document.querySelectorAll('.v-input .v-input__control .v-select__slot');
				var found_input = false;
				clicked_on_select_first = false;
				
				if (!all_selects) {
					return false;
				}
				
				for (var i = 0; i < all_selects.length; i++) {
					if (this.overlaps(all_selects[i], element)) {
						element = all_selects[i];
						$element = $(element);
						found_input = true;
						break;
					}
				}
				
				if (!found_input) {
					return;
				}
			} else if ($element.is('v-input .v-input__control .v-select__slot input')) {
				$element = $element.closest('.v-select__slot');
				element = $element.get(0);
			}
			
			let $v_input = $element.closest('.v-input');
			
			if ($v_input.hasClass('v-input--is-disabled') || $v_input.hasClass('v-input--is-readonly')) {
				return false;
			}
			
			if (!menuElement) {
				menuElement = document.querySelector('.v-menu__content.menuable__content__active');
			}
			
			if (!menuElement || !$(menuElement).is(':visible')) {
				$element.click();
				
				await new Promise(resolve => setTimeout(resolve));
				
				menuElement = document.querySelector('.v-menu__content.menuable__content__active');
			}
			
			if (!menuElement) {
				return;
			}
			
			let options        = [];
			let optionElements = menuElement.querySelectorAll('.v-list-item');
			
			if (!optionElements) {
				return;
			}
			
			Array.from(optionElements).forEach(opt => {
				options.push({
					text:     opt.textContent,
					value:    opt.textContent,
					disabled: opt.matches('.v-list-item--disabled')
				});
			});
			
			if (clicked_on_select_first) {
				$v_input.closest('.v-application').click();
			}
			
			return {
				isValidInput:  true,
				kind:          'option',
				inputType:     'select',
				isMultiSelect: $v_input.hasClass('v-select--is-multi'),
				selector:      fakeData.getUniqueSelector($v_input.get(0)),
				selectOptions: options
			};
		},
		onFill: async function(obj) {
			await new Promise(resolve => setTimeout(resolve));
			
			var element  = obj.element;
			var $element = $(element);
			var menuElement;
			
			var clicked_on_select_first = true;
			
			if ($element.is('.v-menu__content')) {
				menuElement = element;
				var all_selects = document.querySelectorAll('.v-input .v-input__control .v-select__slot');
				var found_input = false;
				clicked_on_select_first = false;
				
				if (!all_selects) {
					return;
				}
				
				for (var i = 0; i < all_selects.length; i++) {
					if (this.overlaps(all_selects[i], element)) {
						element = all_selects[i];
						$element = $(element);
						found_input = true;
						break;
					}
				}
				
				if (!found_input) {
					return;
				}
			}
			
			let $v_input = $element.closest('.v-input');
			
			if (obj.value === false || !obj.options) {
				return;
			}
			
			var selectElements;
			
			if (!obj.isMultiSelect && obj.value === true) {
				selectElements = [obj.options[Math.floor(Math.random() * obj.options.length)]];
			} else if (obj.isMultiSelect || ['$$fd:multi:all', '$$fd:multi:one', '$$fd:multi:random'].includes(obj.value)) {
				switch (obj.value) {
					case '$$fd:multi:all':
						selectElements = obj.options;
						break;
					
					case '$$fd:multi:one':
						selectElements = [obj.options[Math.floor(Math.random() * obj.options.length)]];
						break;
					
					case '$$fd:multi:random':
					default:
						selectElements = obj.options.filter(() => Math.floor(Math.random() * 2));
				}
			} else if (typeof obj.value == 'string') {
				selectElements = obj.options.filter(opt => opt.value == obj.value || opt.text == obj.value);
			}
			
			if (!selectElements || !selectElements.length) {
				return;
			}
			
			selectElements = selectElements.filter(el => !obj.excluded_options.includes(el.text));
			
			if (!menuElement) {
				menuElement = document.querySelector('.v-menu__content.menuable__content__active');
			}
			
			if (!menuElement || !$(menuElement).is(':visible')) {
				$element.click();
				
				await new Promise(resolve => setTimeout(resolve));
				
				menuElement = document.querySelector('.v-menu__content.menuable__content__active');
			}
			
			if (!menuElement) {
				return;
			}
			
			await new Promise(resolve => setTimeout(resolve));
			
			let optionElements = menuElement.querySelectorAll('.v-list-item');
			
			if (obj.isMultiSelect) {
				optionElements.forEach(el => {
					if (el.matches('.v-list-item--active')) {
						el.click();
					}
				});
			}
			
			for (var i = 0; i < selectElements.length; i++) {
				var option_found = Array.from(optionElements).find(el => el.textContent == selectElements[i].text || el.textContent == selectElements[i].value);
				if (option_found) {
					option_found.click();
				}
			}
			
			if ($(menuElement).is(':visible')) {
				await new Promise(resolve => setTimeout(resolve));
				
				if (obj.isMultiSelect) {
					fakeData.triggerInputChangeEvent(document.body, 'mousedown');
					fakeData.triggerInputChangeEvent(document.body, 'click');
				} else {
					$v_input.parent().click();
				}
			}
		}
	});
}
