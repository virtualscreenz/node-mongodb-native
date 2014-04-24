var Runner = require('integra').Runner
	, Cover = require('integra').Cover
	, RCover = require('integra').RCover
	, NodeVersionFilter = require('./filters/node_version_filter')
	, MongoDBVersionFilter = require('./filters/mongodb_version_filter')
	, MongoDBTopologyFilter = require('./filters/mongodb_topology_filter')
	, FileFilter = require('integra').FileFilter
  , f = require('util').format;

/**
 * Standalone MongoDB Configuration
 */
var createConfiguration = function(options) {  
  options = options || {};

  // Create the configuration
  var Configuration = function(context) {
  	var mongo = require('../lib/mongodb');
  	var Db = mongo.Db;
  	var Server = mongo.Server;
  	var ServerManager = require('../test/tools/server_manager').ServerManager;
    var database = "integration_tests";
    var url = options.url || "mongodb://%slocalhost:27017/" + database;
    var port = options.port || 27017;
    var host = options.host || 'localhost';
    var writeConcern = options.writeConcern || {w:1};
    var writeConcernMax = options.writeConcernMax || {w:1};
    
    // Override manager or use default
    var manager = options.manager ? options.manager() : new ServerManager({
    	journal:false
    });  

    // clone
    var clone = function(o) {
      var p = {}; for(var name in o) p[name] = o[name];
      return p;
    }

    // return configuration
  	return {		
  		start: function(callback) {
        manager.start(true, function(err) {
          if(err) throw err;
          callback();
        });
  		},

  		stop: function(callback) {
        manager.killAll(function(err) {
          callback();
        });        
  		},

  		restart: function(callback) {
  			manager.stop(3, function() {
  				manager.start(false, callback);
  			})
  		},

  		setup: function(callback) {
  			callback();
  		},

  		teardown: function(callback) {
  			callback();
  		},

  		newDbInstance: function(dbOptions, serverOptions) {
        // Override implementation
        if(options.newDbInstance) return options.newDbInstance(dbOptions, serverOptions);

        // Fall back
  			var port = serverOptions && serverOptions.port || options.port || 27017;
  			var host = serverOptions && serverOptions.host || 'localhost';
  			if(dbOptions.w == null
  					&& dbOptions.fsync == null
  					&& dbOptions.wtimeout == null
  					&& dbOptions.j == null) dbOptions.w = 1;

        // Default topology
        var topology = Server;
        // If we have a specific topology
        if(options.topology) {
          topology = options.topology;
        }

  			// Return a new db instance
  			return new Db(database, new topology(host, port, serverOptions), dbOptions);
  		},

  		newDbInstanceWithDomainSocket: function(dbOptions, serverOptions) {
        // Override implementation
        if(options.newDbInstanceWithDomainSocket) return options.newDbInstanceWithDomainSocket(dbOptions, serverOptions);

        // If we have a topology
        if(options.topology) {
          return topology(null, null, serverOptions);
        }

        // Fall back
  			var host = serverOptions && serverOptions.host || "/tmp/mongodb-27017.sock";

  			// If we explicitly testing undefined port behavior
  			if(serverOptions && serverOptions.port == 'undefined') {
  				return new Db('integration_tests', new Server(host, undefined, serverOptions), dbOptions);
  			}

  			// Normal socket connection
        return new Db('integration_tests', new Server(host, serverOptions), dbOptions);
  		},

  		url: function(username, password) {
        // Fall back
  			var auth = "";

  			if(username && password) {
  				auth = f("%s:%s@", username, password);
  			}

  			return f(url, auth);
  		},

  		// Additional parameters needed
  		require: mongo,
  		database: database || options.database,
  		nativeParser: true,
  		port: port,
  		host: host,
  		writeConcern: function() { return clone(writeConcern) },
      writeConcernMax: function() { return clone(writeConcernMax) }
  	}
  }

  return Configuration;
}

// Set up the runner
var runner = new Runner({
		logLevel:'info'
	, runners: 1
	, failFast: true
});

var testFiles =[
		'/test/tests/functional/mongo_reply_parser_tests.js'
  , '/test/tests/functional/connection_pool_tests.js'
  , '/test/tests/functional/gridstore/readstream_tests.js'
  , '/test/tests/functional/gridstore/grid_tests.js'
  , '/test/tests/functional/gridstore/gridstore_direct_streaming_tests.js'
  , '/test/tests/functional/gridstore/gridstore_tests.js'
  , '/test/tests/functional/gridstore/gridstore_stream_tests.js'
  , '/test/tests/functional/gridstore/gridstore_file_tests.js'
  , '/test/tests/functional/util_tests.js'
  , '/test/tests/functional/multiple_db_tests.js'
  , '/test/tests/functional/logging_tests.js'
  , '/test/tests/functional/custom_pk_tests.js'
  , '/test/tests/functional/geo_tests.js'
  , '/test/tests/functional/write_preferences_tests.js'
  , '/test/tests/functional/remove_tests.js'
  , '/test/tests/functional/unicode_tests.js'
  , '/test/tests/functional/raw_tests.js'
  , '/test/tests/functional/mapreduce_tests.js'
  , '/test/tests/functional/cursorstream_tests.js'
  , '/test/tests/functional/index_tests.js'
  , '/test/tests/functional/cursor_tests.js'
  , '/test/tests/functional/find_tests.js'
  , '/test/tests/functional/insert_tests.js'
  , '/test/tests/functional/admin_mode_tests.js'
  , '/test/tests/functional/aggregation_tests.js'
  , '/test/tests/functional/exception_tests.js'
  , '/test/tests/functional/error_tests.js'
  , '/test/tests/functional/command_generation_tests.js'
  , '/test/tests/functional/uri_tests.js'
  , '/test/tests/functional/url_parser_tests.js'
  , '/test/tests/functional/objectid_tests.js'
  , '/test/tests/functional/connection_tests.js'
  , '/test/tests/functional/collection_tests.js'
  , '/test/tests/functional/db_tests.js'
  , '/test/tests/functional/read_preferences_tests.js'
  // , '/test/tests/functional/fluent_api/aggregation_tests.js'
  , '/test/tests/functional/maxtimems_tests.js'
  , '/test/tests/functional/mongo_client_tests.js'
  , '/test/tests/functional/fluent_api/batch_write_ordered_tests.js'
  , '/test/tests/functional/fluent_api/batch_write_unordered_tests.js'
  , '/test/tests/functional/fluent_api/batch_write_concerns_tests.js'
]

// Add all the tests to run
testFiles.forEach(function(t) {
	if(t != "") runner.add(t);
});

// // Add the Coverage plugin
// runner.plugin(new Cover({
// 	logLevel: "info"
// 	, filters: [
// 			/_tests.js/
// 		,	"js-bson"
// 		, "/tests/"
// 		, "/tools/"
// 	]
// }));

// // Add the RCoverage plugin
// runner.plugin(new RCover({
// 		logLevel: "info"
// 	, filters: [
// 			/_tests.js/
// 		,	"js-bson"
// 		, "/tests/"
// 		, "/tools/"
// 	]
// }));

// Add a Node version plugin
runner.plugin(new NodeVersionFilter());
// Add a MongoDB version plugin
runner.plugin(new MongoDBVersionFilter());
// Add a Topology filter plugin
runner.plugin(new MongoDBTopologyFilter());

// Exit when done
runner.on('exit', function(errors, results) {
	process.exit(0)
});

// Run the tests
runner.run(createConfiguration());
// runner.run(createConfiguration({
//   port: 30000,
//   url: "mongodb://%slocalhost:30000/integration_tests",
//   writeConcernMax: {w: 'majority', wtimeout: 5000},
//   topology: function(host, port, serverOptions) {
//     var m = require('../lib/mongodb');
//     host = host || 'locahost'; port = port || 30000;
//     return new m.ReplSet([new m.Server(host, port, serverOptions)], {poolSize: 1});
//   }, 
//   manager: function() {
//     var ReplicaSetManager = require('../test/tools/replica_set_manager').ReplicaSetManager;
//     // Replicaset settings
//     var replicasetOptions = { 
//         retries:120, secondary_count:2
//       , passive_count:0, arbiter_count:1
//       , start_port: 30000
//       , tags:[{"dc1":"ny"}, {"dc1":"ny"}, {"dc2":"sf"}]
//     }
    
//     // Return manager
//     return new ReplicaSetManager(replicasetOptions);
//   },
// }));
// runner.run(createConfiguration({
//   port: 50000,
//   url: "mongodb://%slocalhost:50000/integration_tests",
//   writeConcernMax: {w: 'majority', wtimeout: 5000},
//   topology: function(host, port, serverOptions) {
//     var m = require('../lib/mongodb');
//     host = host || 'locahost'; port = port || 50000;
//     return new m.Mongos([new m.Server(host, port, serverOptions)]);
//   }, 

//   manager: function() {
//     var ShardedManager = require('../test/tools/sharded_manager').ShardedManager;
//     // Replicaset settings
//     var options = { 
//         numberOfReplicaSets: 1
//       , numberOfMongosServers: 1
//       , replPortRangeSet: 30000
//       , mongosRangeSet: 50000
//       , db: "integration_tests"
//       , collection: 'test_distinct_queries'
//     }
    
//     // Return manager
//     return new ShardedManager(options);
//   }
// }));






