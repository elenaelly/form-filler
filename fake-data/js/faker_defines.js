var fakers_default_settings = {
	password_length: 15,
	password_memorable: false,
	phone_format: '###-###-####',
	lorem_words_count: 3,
	lorem_paragraph_sentences: 3,
	lorem_paragraphs_count: 3,
	datetime_format: 'YYYY-MM-DD HH:mm:ss',
	number_min: 0,
	number_max: 666,
	number_step: 1
};

var faker_to_moment_locales = {
	"en_AU": "en-au",
	"en_AU_ocker": "en-au",
	"en_BORK": "en",
	"en_CA": "en-ca",
	"fr_CA": "fr-ca",
	"zh_CN": "zh-cn",
	"zh_TW": "zh-tw",
	"nl": "nl",
	"en": "en",
	"fa": "fa",
	"fr": "fr",
	"ge": "ka",
	"de": "de",
	"de_AT": "de-at",
	"de_CH": "de-ch",
	"en_GB": "en-gb",
	"en_IND": "en-gb",
	"id_ID": "id",
	"en_IE": "en-ie",
	"it": "it",
	"ja": "ja",
	"ko": "ko",
	"nep": "ne",
	"nb_NO": "nb",
	"pl": "pl",
	"pt_BR": "pt-br",
	"ru": "ru",
	"sk": "sk",
	"es": "es",
	"es_MX": "es-us",
	"sv": "sv",
	"tr": "tr",
	"uk": "uk",
	"en_US": "en",
	"vi": "vi",
	"ar": "ar",
	"az": "az",
	"cz": "cs",
	"en_ZA": "en",
	"fi": "fi",
	"fr_CH": "fr-ch",
	"nl_BE": "nl-be",
	"pt_PT": "pt",
	"ro": "ro",
};

var original_fakers = {
	'Fake Data Cloud/Email': {
		label: 'Email',
		callback: function(prefix, domain) {
			return fakeData.getUltraSubscriptionObject.getFakerUltraDefines().emailAddress.callback(prefix, domain);
		}
	},
    'Fake Data Cloud/Phone': {
		label: 'Phone',
		callback: function(format) {
			return fakeData.getUltraSubscriptionObject.getFakerUltraDefines().phone.callback(format || fakers_default_settings.phone_format);
		}
	},
    'Fake Data Cloud/Country': {
		label: 'Country',
		callback: function() {
			return fakeData.getUltraSubscriptionObject.getFakerUltraDefines().country.callback();
		}
	},
    'Fake Data Cloud/State': {
		label: 'State',
		callback: function() {
			return fakeData.getUltraSubscriptionObject.getFakerUltraDefines().state.callback();
		}
	},
    'Fake Data Cloud/City': {
		label: 'City',
		callback: function() {
			return fakeData.getUltraSubscriptionObject.getFakerUltraDefines().city.callback();
		}
	},
    'Fake Data Cloud/Address': {
		label: 'Address',
		callback: function() {
			return fakeData.getUltraSubscriptionObject.getFakerUltraDefines().address.callback();
		}
	},
    'Fake Data Cloud/Zip': {
		label: 'Zip',
		callback: function() {
			return fakeData.getUltraSubscriptionObject.getFakerUltraDefines().zip.callback();
		}
	},
	'Fake Data/Dataset': {
		label: 'Dataset',
		callback: function (dataset, column) {
			return fakeData.getDatasetValue(dataset, column);
		}
	},
    full_name: {
        label: 'Full Name',
        callback: function(gender) {
			var firstName = faker.person.firstName(gender);
			var lastName = faker.person.lastName(gender);
			
			return firstName + " " + lastName;
		}
    },
    first_name: {
		label: 'First Name',
		callback: function(gender) {
			return faker.person.firstName(gender);
		}
	},
	last_name: {
		label: 'Last Name',
		callback: function(gender) {
			return faker.person.lastName(gender);
		}
	},
	email: {
		label: 'Email',
		callback: function() {
			return faker.internet.email().toLowerCase();
		}
	},
	username: {
		label: 'Username',
		callback: faker.internet.userName
	},
	password: {
		label: 'Password',
		callback: function(length, memorable) {
			return faker.internet.password(length || fakers_default_settings.password_length, memorable || fakers_default_settings.password_memorable);
		}
	},
	phone: {
		label: 'Phone',
		callback: function(format) {
			return faker.phone.number(format || fakers_default_settings.phone_format);
		}
	},
	job_title: {
		label: 'Job Title',
		callback: faker.person.jobTitle
	},
	company: {
		label: 'Company',
		callback: faker.company.name
	},
	address: {
		label: 'Address',
		callback: function() {
			var street_address = fakerFromLocale('address.street_address', faker.location.streetAddress);
			
			street_address = street_address.split(' ').map(e => {
				return !isNaN(parseInt(e)) ? parseInt(e) : e;
			}).join(' ');
			
			return street_address;
		}
	},
	city: {
		label: 'City',
		callback: function() {
			return fakerFromLocale('location.cityName', faker.location.cityName);
		}
	},
	country: {
		label: 'Country',
		callback: function() {
			return fakerFromLocale('address.country', faker.location.country);
		}
	},
	state: {
		label: 'State',
		callback: function() {
			return fakerFromLocale('address.state', faker.location.state);
		}
	},
	zip: {
		label: 'Zip',
		callback: faker.location.zipCode
	},
	words: {
		label: 'Lorem Words',
		callback: function(count) {
			return faker.lorem.words(count || fakers_default_settings.lorem_words_count);
		}
	},
	sentence: {
		label: 'Lorem Sentence',
		callback: faker.lorem.sentence
	},
	paragraph: {
		label: 'Lorem Paragraph',
		callback: function(count) {
			return faker.lorem.paragraph(count || fakers_default_settings.lorem_paragraph_sentences);
		}
	},
	text: {
		label: 'Lorem Text',
		callback: function(count) {
			return faker.lorem.paragraphs(count || fakers_default_settings.lorem_paragraphs_count);
		}
	},
	datetime: {
    	label: 'Date & Time',
		callback: function(format, from, to) {
		    var current_date = new Date();
		    var current_time = current_date.getTime();
			var one_year = 31536000000;
			
			if (from && !to) {
				to = new Date(from.getTime() + one_year);
			}
			
			if (to && !from && to.getTime() < current_time) {
				from = new Date(to.getTime() - one_year);
			}
			
			if (!from) from = new Date(current_time - one_year);
		    if (!to) to = new Date(current_time + one_year);
			
			var random_date = faker.date.between(from, to);
			
			return moment(random_date).format(format || fakers_default_settings.datetime_format);
		}
	},
	number: {
    	label: 'Number',
		callback: function(min, max, step) {
			
    		min = parseInt(min);
    		max = parseInt(max);
    		step = parseInt(step);
			
			min = !isNaN(min) && min !== null ? min : fakers_default_settings.number_min;
			max = !isNaN(max) && max !== null ? max : fakers_default_settings.number_max;
			step = !isNaN(step) && step !== null ? step : fakers_default_settings.number_step;
			step = Math.max(step, 1);
    		
    		if (min > max) {
    			min = 0;
			}
   
			var result = Math.floor(Math.random()* (((max-min) / step)+1));
			result = result * step + min;
			
    		return result;
		}
	}
};

var fakers = {};
var extra_fake_fields = {};
