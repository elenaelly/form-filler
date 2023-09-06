function fdIntegrationsReactSelectEnable() {
	
	fakeData.registerElement('div[class*="css-"][class*="-container"]', {
		onQuery: async function(obj) {
			
			var element = obj.element;
			
			obj.fill_session.push(element);
			
			// check if it's likely to be a react-select element
			if (!Array.from(element.classList).filter(className => {
				return /^css-([a-zA-Z0-9]+)-container/.test(className);
			}).length) {
				
				while (element.parentNode.matches('[class*="css-"][class*="-container"], [class*="css-"][class*="-control"]')) {
					element = element.parentNode;
				}
				
				if (!Array.from(element.classList).filter(className => {
					return /^css-([a-zA-Z0-9]+)-container/.test(className);
				}).length) {
					return;
				}
			}
			
			var $element = $(element);
			
			element.querySelectorAll('input').forEach(input => {
				obj.fill_session.push(input);
			})
			
			// check if it's even more likely to be a react-select element
			let $controlDiv = $element.find('div[class*="css-"][class*="-control"]');
			if (!$controlDiv.length || !Array.from($controlDiv.get(0).classList).filter(className => {
				return /^css-([a-zA-Z0-9]+)-control/.test(className);
			}).length) {
				return;
			}
			
			obj.fill_session.push(element);
			
			var indicatorDiv = element.querySelectorAll('div[class*=indicator] svg');
			
			if (indicatorDiv.length == 0) {
				return;
			}
			
			if (indicatorDiv.length == 1) {
				indicatorDiv = indicatorDiv[0].parentNode;
			} else {
				indicatorDiv = Array.from(indicatorDiv).filter(el => {
					if (el.parentNode.classList.contains('select__dropdown-indicator')) {
						return true;
					} else if (el.querySelector('path')
					.getAttribute('d') == 'M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z') {
						return true;
					}
					return false;
				})[0].parentNode;
			}
			
			if (!indicatorDiv) {
				return;
			}
			
			
			await new Promise(resolve => setTimeout(resolve));
			
			let menuElement = Array.from(element.children).filter(el => el.matches('div[class*="css-"][class*="-menu"]') && Array.from(el.classList).filter(className => {
				return /^css-([a-zA-Z0-9]+)-menu/.test(className);
			}).length)[0];
			if (!menuElement) {
				var ev = document.createEvent('MouseEvent');
				ev.initEvent('mousedown', true, false);
				indicatorDiv.dispatchEvent(ev);
			}
			
			await new Promise(resolve => setTimeout(resolve));
			
			menuElement = Array.from(element.children).filter(el => el.matches('div[class*="css-"][class*="-menu"]') && Array.from(el.classList).filter(className => {
				return /^css-([a-zA-Z0-9]+)-menu/.test(className);
			}).length)[0];
			if (!menuElement) {
				return;
			}
			
			await new Promise(resolve => setTimeout(resolve));
			
			let options        = [];
			let optionElements = menuElement.querySelectorAll('div[class*="css-"][class*="-option"]');
			let selectedMultiElements = element.querySelectorAll('[class*="-multiValue"]');
			if (!optionElements && !selectedMultiElements) {
				return;
			}
			
			Array.from(optionElements).concat(Array.from(selectedMultiElements)).forEach(opt => {
				options.push({
					text:     opt.textContent,
					value:    opt.textContent,
					disabled: opt.matches('[class*="is-disabled"]')
				});
			});
			
			
			if (document.body.contains(menuElement)) {
				var ev = document.createEvent('MouseEvent');
				ev.initEvent('mousedown', true, false);
				indicatorDiv.dispatchEvent(ev);
			}
			
			return {
				isValidInput:  true,
				kind:          'option',
				inputType:     'select',
				isMultiSelect: selectedMultiElements && selectedMultiElements.length,
				selector:      fakeData.getUniqueSelector(element),
				selectOptions: options
			};
		},
		onFill: async function(obj) {
			
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
			
			if (!selectElements) {
				return;
			}
			
			selectElements = selectElements.filter(el => !obj.excluded_options.includes(el.text));
			
			var element = obj.element;
			
			// check if it's likely to be a react-select element
			if (!Array.from(element.classList).filter(className => {
				return /^css-([a-zA-Z0-9]+)-container/.test(className);
			}).length) {
				
				while (element.parentNode.matches('[class*="css-"][class*="-container"], [class*="css-"][class*="-control"]')) {
					element = element.parentNode;
				}
				
				if (!Array.from(element.classList).filter(className => {
					return /^css-([a-zA-Z0-9]+)-container/.test(className);
				}).length) {
					return;
				}
			}
			
			var $element = $(element);
			
			// check if it's even more likely to be a react-select element
			let $controlDiv = $element.find('div[class*="css-"][class*="-control"]');
			if (!$controlDiv.length || !Array.from($controlDiv.get(0).classList).filter(className => {
				return /^css-([a-zA-Z0-9]+)-control/.test(className);
			}).length) {
				return;
			}
			
			obj.fill_session.push(element);
			
			var indicatorDiv = element.querySelectorAll('div[class*=indicator] svg');
			
			if (indicatorDiv.length == 0) {
				return;
			}
			
			if (indicatorDiv.length == 1) {
				indicatorDiv = indicatorDiv[0].parentNode;
			} else {
				indicatorDiv = Array.from(indicatorDiv).filter(el => {
					if (el.parentNode.classList.contains('select__dropdown-indicator')) {
						return true;
					} else if (el.querySelector('path')
					.getAttribute('d') == 'M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z') {
						return true;
					}
					return false;
				})[0].parentNode;
			}
			
			if (!indicatorDiv) {
				return;
			}
			
			await new Promise(resolve => setTimeout(resolve));
			
			let menuElement = Array.from(element.children).filter(el => el.matches('div[class*="css-"][class*="-menu"]') && Array.from(el.classList).filter(className => {
				return /^css-([a-zA-Z0-9]+)-menu/.test(className);
			}).length)[0];
			if (!menuElement) {
				var ev = document.createEvent('MouseEvent');
				ev.initEvent('mousedown', true, false);
				indicatorDiv.dispatchEvent(ev);
			}
			
			await new Promise(resolve => setTimeout(resolve));
			
			menuElement = Array.from(element.children).filter(el => el.matches('div[class*="css-"][class*="-menu"]') && Array.from(el.classList).filter(className => {
				return /^css-([a-zA-Z0-9]+)-menu/.test(className);
			}).length)[0];
			if (!menuElement) {
				return;
			}
			
			await new Promise(resolve => setTimeout(resolve));
			
			if (obj.isMultiSelect) {
				var selectedMultiValues = Array.from(element.querySelectorAll('[class*="-multiValue"]'));
				if (selectedMultiValues && selectedMultiValues.length) {
					selectedMultiValues.forEach(el => el.querySelector('svg').parentNode.click());
				}
			}
			
			let options        = [];
			let optionElements = menuElement.querySelectorAll('div[class*="css-"][class*="-option"]');
			if (!optionElements) {
				return;
			}
			
			for (var i = 0; i < selectElements.length; i++) {
				if (!document.body.contains(menuElement)) {
					
					var ev = document.createEvent('MouseEvent');
					ev.initEvent('mousedown', true, false);
					indicatorDiv.dispatchEvent(ev);
					
					await new Promise(resolve => setTimeout(resolve));
					
					menuElement = Array.from(element.children).filter(el => el.matches('div[class*="css-"][class*="-menu"]') && Array.from(el.classList).filter(className => {
						return /^css-([a-zA-Z0-9]+)-menu/.test(className);
					}).length)[0];
					
					if (!document.body.contains(menuElement)) {
						break;
					}
					
					optionElements = menuElement.querySelectorAll('div[class*="css-"][class*="-option"]');
					
					if (!optionElements) {
						break;
					}
				}
				
				var option_found = Array.from(optionElements).find(el => el.textContent == selectElements[i].text || el.textContent == selectElements[i].value);
				if (option_found) {
					option_found.click();
				}
			}
			
			if (document.body.contains(menuElement)) {
				var ev = document.createEvent('MouseEvent');
				ev.initEvent('mousedown', true, false);
				indicatorDiv.dispatchEvent(ev);
			}
		}
	});
}
