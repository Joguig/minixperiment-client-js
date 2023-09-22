var MinixperimentClient = require('minixperiment-client');
var LocalProvider       = require('minixperiment-client/lib/providers/local');

// Experiment configuration is a map of experiment UUID to experiment config;
// use descriptive names for the experiment UUID constant!
var EXPERIMENT_FEATURE_NEW_THING = 'af03a4d0-8754-448a-aef6-0aa9daab861d';
var EXPERIMENT_BASED_ON_USER     = '1418cd1a-66ba-11e7-907b-a6006ad3dba0';
var EXPERIMENT_BASED_ON_CHANNEL  = '5e32612c-66ba-11e7-907b-a6006ad3dba0';
var EXPERIMENT_WILL_OVERRIDE     = '72aa8e9a-d958-4858-bdad-6a44388f9d76';
var EXPERIMENT_MAYBE_OVERRIDE    = '2ef17794-14af-4448-bf23-691c96a72995';
var EXPERIMENT_DEPRECATED        = 'a2266ebf-0022-46c4-aa06-9db83a44df00';

// Create the defaults for the client; if anything goes wrong, you'll be
// guaranteed to at least get back a sensible value so your application won't
// break.
var defaults = {};
defaults[EXPERIMENT_FEATURE_NEW_THING] = 'new thing default value';
defaults[EXPERIMENT_BASED_ON_USER]     = 'no username supplied using default';
defaults[EXPERIMENT_BASED_ON_CHANNEL]  = 'no channel supplied using default';
defaults[EXPERIMENT_WILL_OVERRIDE]     = 'overridden experiment default value';
defaults[EXPERIMENT_MAYBE_OVERRIDE]    = 'possibly overridden default';
defaults[EXPERIMENT_DEPRECATED]        = 'default behavior';

// This example uses the LocalProvider to source experiment configurations; if
// you are using a LocalProvider, you'll have to manually generate (or retrieve
// yourself) the experiment configs.
var experimentConfigs = {};
experimentConfigs[EXPERIMENT_FEATURE_NEW_THING] = {
	name:   "Some new feature",
	t: 1,
	groups: [
		{ value: 'control',       weight: 9 },
		{ value: 'the new thing', weight: 1 }
	]
};
experimentConfigs[EXPERIMENT_BASED_ON_USER] = {
	name:   "Cool feature made only for cool users",
	t: 2,
	groups: [
		{ value: 'control',       weight: 2 },
		{ value: 'the new thing', weight: 7 }
	]
};
experimentConfigs[EXPERIMENT_BASED_ON_CHANNEL] = {
	name:   "Cool feature made only for cool channels",
	t: 3,
	groups: [
		{ value: 'control',       weight: 3 },
		{ value: 'the new thing', weight: 2 }
	]
};
experimentConfigs[EXPERIMENT_WILL_OVERRIDE] = {
	name:   "An experiment that will get overridden, e.g. for staff",
	t: 1,
	groups: [
		{ value: 'the boring treatment everyone gets', weight: 1 }
	]
};
experimentConfigs[EXPERIMENT_MAYBE_OVERRIDE] = {
	name:   "An experiment that could be overridden, if the override wasn't a rejected Promise",
	t: 1,
	groups: [
		{ value: 'control', weight: 1 }
	]
};
// EXPERIMENT_DEPRECATED intentionally omitted from the configuration

var experimentOverrides = {};
experimentOverrides[EXPERIMENT_WILL_OVERRIDE] = 'special new thing';
experimentOverrides[EXPERIMENT_MAYBE_OVERRIDE] = Promise.reject('not actually an override');

// Create the MinixperimentClient
var client = new MinixperimentClient({
	// you MUST provide a valid set of defaults for the experiments you are
	// interested in!
	defaults: defaults,
	// you MUST provide a valid device ID!
	deviceID: "minixperiment-example-" + (Date.now()),
	// you MAY provide an overrides object, which indicates any experiments that
	// may ignore the assignment algorithm due to business concerns.
	overrides: experimentOverrides,
	// you MUST provide a valid platform! This defines where the library is
	// being used - "web", "xboxone", etc.
	platform: "web-example",
	// you MUST use a provider to retrieve the experiment configurations!
	// Minixperiment supplies two providers that should cover a vast majority
	// of use cases:
	//   - LocalProvider: use when you can get the experiment configuration from
	//                    some location that is relatively opaque to libraries
	//                    like Minixperiment
	//   - ServiceProvider: use when the experiment configuration is located at
	//                      a specific, publicly accessible URI, e.g. the
	//                      Minixperiment backend service.
	provider: new LocalProvider(experimentConfigs),
	// you MUST inject a valid Promises/A+ compliant library
	Promise: Promise,
	// you *should* provide the username of the current user, if available; this
	// is used primarily for tracking purposes, though some experiments may use
	// this value to determine experiment assignments.
	login: "KappaYOLOSWAG98"
});

// Meanwhile, in another part of your app...
var assignment = client.get(EXPERIMENT_FEATURE_NEW_THING);

// the retrieved assignment is a Promise, and cannot be used directly!
console.info("Retrieved device_id assignment: %o", assignment);

// wait until the configured provider has retrieved its configuration and made
// the data available to you, the consumer.
assignment.then(function(value) {
	switch (value) {
		case 'control':
			console.info("You were assigned the Control group. You're missing out!");
		break;
		case 'the new thing':
			console.info("You got the cool new thing! Congrats!");
		break;
	}
});

// you can also run experiments segmented based on username - just set t: 2 in config
assignment = client.get(EXPERIMENT_BASED_ON_USER);

console.info("Retrieved username assignment: %o", assignment);

assignment.then(function(value) {
	switch (value) {
		case 'control':
			console.info("Your username wasn't cool enough, try again next time!");
		break;
		case 'the new thing':
			console.info("Your username means 'the new thing' in Arabic!");
		break;
	}
});

// you can even run experiments based on the channel the user is watching: just include
// the channel in the options when getting the assignment
assignment = client.get(EXPERIMENT_BASED_ON_CHANNEL, {channel: "BobbyRoss9001"});

console.info("Retrieved channel assignment: %o", assignment);

// wait until the configured provider has retrieved its configuration and made
// the data available to you, the consumer.
assignment.then(function(value) {
	switch (value) {
		case 'control':
			console.info("You're watching a boring channel. Just control...");
		break;
		case 'the new thing':
			console.info("This channel is PogChamp look how new it is!");
		break;
	}
});

// if you don't specify a channel, you will just get the default treatment :(
assignment = client.get(EXPERIMENT_BASED_ON_CHANNEL);

console.info("Retrieved no-channel-specified assignment: %o", assignment);

// wait until the configured provider has retrieved its configuration and made
// the data available to you, the consumer.
assignment.then(function(value) {
	switch (value) {
		case 'control':
			console.info("You're watching a boring channel. Just control...");
		break;
		case 'the new thing':
			console.info("This channel is PogChamp look how new it is!");
		break;
	}
});

// of course, if you try to get the configuration for an experiment that is not
// in the set of configured experiments...
var deprecatedExperimentAssignment = client.get(EXPERIMENT_DEPRECATED);
// nothing bad will happen; you'll just get the configured default value. You
// will also NEVER get a thrown error from `get`, nor will the returned Promise
// be rejected. You are GUARANTEED to get *a* value in the promise.
deprecatedExperimentAssignment.then(function(value) {
    switch (value) {
    case 'something that used to be an experiment treatment group':
        console.info("You'll never see this, because the experiment does not exist");
        break;
    case 'default behavior':
        console.info("You got the default value instead of an error!");
        break
    }
});

// There are many reasons you might get the default value back:
//
// 1. The service you're using for experiment configuration is down, and you
//    weren't able to get the configuration file
// 2. The experiment you were predicating behavior on has been archived and is
//     no longer in the set of experiments returned by the service
//
// so make sure you provide a *valid* default value whenever you're retrieving
// an assignment!

// Experiment treatment assignments can also be overridden, if there are
// business reasons to do so that are opaque to the experiment service. For
// example, when the HTML5 player is first rolled out, only users who should
// never see ads (e.g. Turbo users) should get it; this is not a situation that
// the experiment service can easily determine, and it is up to the consumer to
// assert that this is the experimental treatment assigned to the user. This
// unifies the consumption experience for experiment branching, and preserves
// any logging of experimental assignments & results that are associated with
// the experiment.
client.get(EXPERIMENT_WILL_OVERRIDE).then(function(treatment) {
    console.info("Was assigned the `%s` bucket for the experiment override", treatment);
});

// Of course, your overrides may be conditional on factors that can only be
// determined asynchronously. For any override provided to the library that
// is a rejected Promise, the override is ignored and the standard assignment
// algorithm is used.
client.get(EXPERIMENT_MAYBE_OVERRIDE).then(function(treatment) {
	console.info("Was assigned the `%s` bucket for the experiment with a rejected override", treatment);
});
