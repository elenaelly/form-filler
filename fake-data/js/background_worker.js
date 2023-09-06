var window = self;

var _contentScripts = {};

importScripts(
	'manifest_version_definer.js',
	"mv_bridge.js",
	"run_code_in_sandbox_function.js",
	"helpers.js",
	"init.js",
	"faker.js",
	"moment-with-locales.js",
	"fuzzyset.js",
	"faker-js-backwards-compatibility.js",
	"faker_defines.js",
	"rsa.js",
	"md5.js",
	"ultra_subscription.js",
	"background.js",

	'integrations/page_functions/_func_fd-public-api.integration.js',
	'integrations/page_functions/_func_select2.integration.js',
	'integrations/page_functions/_func_google-sheets.integration.js',
);
