// backwards compatible changes
function initFakerLibrary(locale = 'en_US') {
	let parent_faker = faker;
	if (faker._parent) {
		parent_faker = faker._parent;
	}
	
	if (parent_faker) {
		switch (locale.toLowerCase()) {
			case 'af_za': faker = parent_faker.fakerAF_ZA; break;
			case 'ar': faker = parent_faker.fakerAR; break;
			case 'az': faker = parent_faker.fakerAZ; break;
			case 'base': faker = parent_faker.fakerBASE; break;
			case 'cs_cz': faker = parent_faker.fakerCS_CZ; break;
			case 'de': faker = parent_faker.fakerDE; break;
			case 'de_at': faker = parent_faker.fakerDE_AT; break;
			case 'de_ch': faker = parent_faker.fakerDE_CH; break;
			case 'dv': faker = parent_faker.fakerDV; break;
			case 'el': faker = parent_faker.fakerEL; break;
			case 'en': faker = parent_faker.fakerEN; break;
			case 'en_au': faker = parent_faker.fakerEN_AU; break;
			case 'en_au_ocker': faker = parent_faker.fakerEN_AU_ocker; break;
			case 'en_bork': faker = parent_faker.fakerEN_BORK; break;
			case 'en_ca': faker = parent_faker.fakerEN_CA; break;
			case 'en_gb': faker = parent_faker.fakerEN_GB; break;
			case 'en_gh': faker = parent_faker.fakerEN_GH; break;
			case 'en_hk': faker = parent_faker.fakerEN_HK; break;
			case 'en_ie': faker = parent_faker.fakerEN_IE; break;
			case 'en_in': faker = parent_faker.fakerEN_IN; break;
			case 'en_ng': faker = parent_faker.fakerEN_NG; break;
			case 'en_us': faker = parent_faker.fakerEN_US; break;
			case 'en_za': faker = parent_faker.fakerEN_ZA; break;
			case 'es': faker = parent_faker.fakerES; break;
			case 'es_mx': faker = parent_faker.fakerES_MX; break;
			case 'fa': faker = parent_faker.fakerFA; break;
			case 'fi': faker = parent_faker.fakerFI; break;
			case 'fr': faker = parent_faker.fakerFR; break;
			case 'fr_be': faker = parent_faker.fakerFR_BE; break;
			case 'fr_ca': faker = parent_faker.fakerFR_CA; break;
			case 'fr_ch': faker = parent_faker.fakerFR_CH; break;
			case 'fr_lu': faker = parent_faker.fakerFR_LU; break;
			case 'he': faker = parent_faker.fakerHE; break;
			case 'hr': faker = parent_faker.fakerHR; break;
			case 'hu': faker = parent_faker.fakerHU; break;
			case 'hy': faker = parent_faker.fakerHY; break;
			case 'id_id': faker = parent_faker.fakerID_ID; break;
			case 'it': faker = parent_faker.fakerIT; break;
			case 'ja': faker = parent_faker.fakerJA; break;
			case 'ka_ge': faker = parent_faker.fakerKA_GE; break;
			case 'ko': faker = parent_faker.fakerKO; break;
			case 'lv': faker = parent_faker.fakerLV; break;
			case 'mk': faker = parent_faker.fakerMK; break;
			case 'nb_no': faker = parent_faker.fakerNB_NO; break;
			case 'ne': faker = parent_faker.fakerNE; break;
			case 'nl': faker = parent_faker.fakerNL; break;
			case 'nl_be': faker = parent_faker.fakerNL_BE; break;
			case 'pl': faker = parent_faker.fakerPL; break;
			case 'pt_br': faker = parent_faker.fakerPT_BR; break;
			case 'pt_pt': faker = parent_faker.fakerPT_PT; break;
			case 'ro': faker = parent_faker.fakerRO; break;
			case 'ro_md': faker = parent_faker.fakerRO_MD; break;
			case 'ru': faker = parent_faker.fakerRU; break;
			case 'sk': faker = parent_faker.fakerSK; break;
			case 'sr_rs_latin': faker = parent_faker.fakerSR_RS_latin; break;
			case 'sv': faker = parent_faker.fakerSV; break;
			case 'th': faker = parent_faker.fakerTH; break;
			case 'tr': faker = parent_faker.fakerTR; break;
			case 'uk': faker = parent_faker.fakerUK; break;
			case 'ur': faker = parent_faker.fakerUR; break;
			case 'vi': faker = parent_faker.fakerVI; break;
			case 'zh_cn': faker = parent_faker.fakerZH_CN; break;
			case 'zh_tw': faker = parent_faker.fakerZH_TW; break;
			case 'zu_za': faker = parent_faker.fakerZU_ZA; break;
			default: faker = parent_faker.faker; break;
		}
	}
	
	faker._parent = parent_faker;
	faker._current_locale = locale;
	
	faker.locale = locale;
	
	if (!faker.random) {
		faker.random = {};
	}
	
	// backwards compatible functions
	if (!faker.random.number) faker.random.number = faker.datatype.number;
	if (!faker.random.arrayElement) faker.random.arrayElement = faker.helpers.arrayElement;
	if (!faker.company.companyName) faker.company.companyName = faker.company.name;
	if (!faker.phone.phoneNumber) faker.phone.phoneNumber = faker.phone.number;
	if (!('name' in faker)) faker.name = faker.person;
	if (!('address' in faker)) faker.address = faker.location;
	if (!faker.fake) faker.fake = faker.helpers.fake;
}

function setFakerLocale(locale) {
	if (faker._current_locale == locale) {
		return;
	}
	
	initFakerLibrary(locale);
}

initFakerLibrary();
