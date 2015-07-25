"use strict";
 
angular.module('app.service.db', [
    "ionic"
])

.factory('DBService', 
		function($rootScope, $cordovaSQLite, $q, $ionicHistory) {

				//db = $cordovaSQLite.openDB({ name: "crm.db" });
				var db = window.openDatabase("crm.db", "1.0", "CRM", 200000); 

				return {
						executeSQL: function(query, fieldArray) {
								var deferred = $q.defer();

								$cordovaSQLite.execute(db, query, fieldArray).then(function(res) {
									console.log(query, fieldArray, "(Rows affected: "+res.rowsAffected+")");
									deferred.resolve(res);
								}, function (err) {
										console.error(err);
										console.error(query, fieldArray);
										deferred.reject(err);
								});

								return deferred.promise; 
						},
						execute: function(query, fieldArray, keepCache) {
								var self = this;
								var deferred = $q.defer();

								self.executeSQL(query, fieldArray).then(function(res) {
										if (!keepCache) $ionicHistory.clearCache(); // clear cache by default on UPDATE's and DELETE's
										deferred.resolve(res);
								}, function (err) {
										deferred.reject(err);
								});

								return deferred.promise; 
						},
						insert: function(query, fieldArray, entity) {
								var self = this;
								var deferred = $q.defer();

								entity = entity || {};

								self.execute(query, fieldArray).then(function(res) {
										entity.id = res.insertId;
										deferred.resolve(entity);
								}, function (err) {
										deferred.reject(err);
								});

								return deferred.promise; 
						},
						select: function(query, fieldArray) {
								var self = this;
								var deferred = $q.defer();

								self.executeSQL(query, fieldArray).then(function(res) {
										if (res.rows.length > 0){
												var len   = res.rows.length;
												var rows = [];
												for (var i=0; i<len; i++){
														rows.push(res.rows.item(i));
												}
												deferred.resolve(rows);
										} else {
												deferred.resolve(undefined);
										}
								}, function (err) {
										deferred.reject(err);
								});

								return deferred.promise; 
						},
						selectOne: function(query, fieldArray) {
								var self = this;
								var deferred = $q.defer();

								self.select(query, fieldArray).then(function(rows) {
									if (rows) {
										deferred.resolve(rows[0]);  
									} else {
										deferred.resolve(undefined);
									}
									
								}, function (err) {
									deferred.reject(err);
								});

								return deferred.promise; 
						},            
						selectOneInteger: function(query, fieldArray) {
								var self = this;
								var deferred = $q.defer();

								self.selectOne(query, fieldArray).then(function(row) {
									if (row) {
										deferred.resolve(parseInt(row.item[0]));  
									} else {
										deferred.resolve(0);
									}
									
								}, function (err) {
									deferred.reject(err);
								});

								return deferred.promise; 
						},
						exists: function(query, fieldArray){
								var self = this;
								var deferred = $q.defer();

								self.select(query, fieldArray).then(function(rows) {
									if (rows) {
										deferred.resolve(true);  
									} else {
										deferred.resolve(false);
									}
									
								}, function (err) {
									deferred.reject(err);
								});

								return deferred.promise; 
						},
						insertIfNotExists: function(selectSQL, selectFieldArray, insertSQL, insertFieldArray){
								var self = this;
								var deferred = $q.defer();

								self.select(selectSQL, selectFieldArray).then(function(obj){
										if (obj) {
												deferred.resolve(obj);
										} else {
												self.insert(insertSQL, insertFieldArray).then(function(obj){
														deferred.resolve(obj);
												});
										}
								});
								return deferred.promise;
						},
						dump: function(){

						},
						dumpTable: function(tableName){
								console.log("DUMP "+tableName);
								this.select("SELECT * FROM "+tableName, []).then(function(row){
										console.log(row);
								})
						},
						checkDbVersion: function() {
								var self = this;

								// move to a constant
								var dbVersion = "1.0";

								// Read version from app vars.  Reinitialize if different.
								return self.selectOne("SELECT value FROM APP_VARS WHERE name='DB_VERSION'").then(
										function(row){
											if (row.value !== dbVersion){
												return self.initialize(dbVersion);
											} else {
												return $q.when("true")
											}
										}, function(){
											return self.initialize(dbVersion);
										}
								)

						},
						initialize: function(dbVersion) {

								var self = this;

								// http://www.sqlite.org/lang.html
								var dropPromises = [
									self.executeSQL("DROP TABLE IF EXISTS USER_ENTITY_RECENTS"),
									self.executeSQL("DROP TABLE IF EXISTS USER_ENTITY_FAVS"),
									self.executeSQL("DROP TABLE IF EXISTS USER_AGENCIES"),
									self.executeSQL("DROP TABLE IF EXISTS USERS"),
									self.executeSQL("DROP TABLE IF EXISTS ENTITY_ACTIVITIES"),
									self.executeSQL("DROP TABLE IF EXISTS ENTITY_OPPORTUNITIES"),
									self.executeSQL("DROP TABLE IF EXISTS ENTITY_MEMBERS"),
									self.executeSQL("DROP TABLE IF EXISTS ENTITIES"),
									self.executeSQL("DROP TABLE IF EXISTS AGENCIES"),
									self.executeSQL("DROP TABLE IF EXISTS APP_VARS")
								];

								var createPromises = [
									self.executeSQL("CREATE TABLE IF NOT EXISTS APP_VARS             (name TEXT NOT NULL, value TEXT NOT NULL)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS AGENCIES             (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cellPhone TEXT NOT NULL, email TEXT NOT NULL)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS ENTITIES             (id INTEGER PRIMARY KEY AUTOINCREMENT, agencyId INTEGER NOT NULL, entityType TEXT NOT NULL, householdId TEXT, name TEXT, firstName TEXT, lastName TEXT, cellPhone TEXT, email TEXT, addr1 TEXT, city TEXT, state TEXT, zip TEXT, latitude REAL, longitude REAL)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS ENTITY_MEMBERS       (id INTEGER PRIMARY KEY AUTOINCREMENT, entityId INTEGER NOT NULL, memberEntityId INTEGER NOT NULL)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS ENTITY_OPPORTUNITIES (id INTEGER PRIMARY KEY AUTOINCREMENT, entityId INTEGER NOT NULL, oppType TEXT NOT NULL, amount REAL, dueDate TEXT, personFullName TEXT, personCity TEXT, personState TEXT)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS ENTITY_ACTIVITIES    (id INTEGER PRIMARY KEY AUTOINCREMENT, entityId INTEGER NOT NULL, actType TEXT NOT NULL, descr TEXT, status TEXT, priority TEXT, actDate TEXT)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS USERS                (id INTEGER PRIMARY KEY AUTOINCREMENT, networkId TEXT UNIQUE NOT NULL, firstName TEXT NOT NULL, lastName TEXT NOT NULL, email TEXT, defaultAgencyId INTEGER, latitude REAL, longitude REAL)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS USER_AGENCIES        (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, agencyId INTEGER NOT NULL)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS USER_ENTITY_FAVS     (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, entityId INTEGER NOT NULL)"),
									self.executeSQL("CREATE TABLE IF NOT EXISTS USER_ENTITY_RECENTS  (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, entityId INTEGER NOT NULL)")
								]

								var data = {
										"AGENCIES": 
										[
											{"id": 1, "name": "Johnson Agency", "cellPhone": "617-000-0002", "email": "jking@fakemail.com",
													"ENTITIES": [
															{"id": "1", "entityType": "PSN", "firstName": "James", "lastName": "King", "householdId": 13, "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com", "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191434", "longitude": "-89.45439",
																	"ACTIVITIES": [
																			{"actType":"NOTE", "descr":"note, note, note","status":"Completed","priority":"High","actDate":"01-01-2015"},
																			{"actType":"SCHED","descr":"Discuss Life Ins","status":"Not Started","priority":"Medium","actDate":"01-01-2015 5:15pm"}
																	], "OPPORTUNITIES": [
																			{"oppType": "Casualty", "amount": "100.00", "dueDate": "01/01/2015", "personFullName": "James King", "personCity": "Waunakee", "personState": "WI"}, 
																			{"oppType": "Umbrella", "amount": "200.00", "dueDate": "02/01/2015", "personFullName": "James King", "personCity": "Madison", "personState": "WI"}, 
																			{"oppType": "Casualty", "amount": "300.00", "dueDate": "03/01/2015", "personFullName": "Don Wilson", "personCity": "Madison", "personState": "WI"}, 
																			{"oppType": "Casualty", "amount": "400.00", "dueDate": "04/01/2015", "personFullName": "Don Wilson", "personCity": "Madison", "personState": "WI"}
																	]
															}, 
															{"id": "2", "entityType": "PSN", "firstName": "Julie", "lastName": "Taylor", "householdId": 13, "department": "Marketing", "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191534", "longitude": "-89.45449"}, 
															{"id": "3", "entityType": "PSN", "firstName": "Eugene", "lastName": "Lee", "householdId": 14, "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com",                                 "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191634", "longitude": "-89.45439"}, 
															{"id": "4", "entityType": "PSN", "firstName": "John", "lastName": "Williams", "householdId": 14, "cellPhone": "617-000-0004", "officePhone": "781-000-0004", "email": "jwilliams@fakemail.com",                         "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191734", "longitude": "-89.45449"}, 
															{"id": "5", "entityType": "PSN", "firstName": "Ray", "lastName": "Moore", "householdId": 14, "cellPhone": "617-000-0005", "officePhone": "781-000-0005", "email": "rmoore@fakemail.com",                                "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"}, 
															{"id": "6", "entityType": "PSN", "firstName": "Paul", "lastName": "Jones", "householdId": 14, "cellPhone": "617-000-0006", "officePhone": "781-000-0006", "email": "pjones@fakemail.com",                               "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191934", "longitude": "-89.45449"}, 
															{"id": "7", "entityType": "PSN", "firstName": "Paula", "lastName": "Gates", "householdId": 15, "cellPhone": "617-000-0007", "officePhone": "781-000-0007", "email": "pgates@fakemail.com",                              "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191434", "longitude": "-89.45459"}, 
															{"id": "8", "entityType": "PSN", "firstName": "Lisa", "lastName": "Wong", "householdId": 15, "cellPhone": "617-000-0008", "officePhone": "781-000-0008", "email": "lwong@fakemail.com",                                 "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191434", "longitude": "-89.45469"}, 
															{"id": "9", "entityType": "PSN", "firstName": "Gary", "lastName": "Donovan", "householdId": 15, "cellPhone": "617-000-0009", "officePhone": "781-000-0009", "email": "gdonovan@fakemail.com",                           "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191534", "longitude": "-89.45479"}, 
															{"id": "10", "entityType": "PSN", "firstName": "Kathleen", "lastName": "Byrne", "householdId": 16,  "cellPhone": "617-000-0010", "officePhone": "781-000-0010", "email": "kbyrne@fakemail.com",                         "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191634", "longitude": "-89.45489"}, 
															{"id": "11", "entityType": "PSN", "firstName": "Amy", "lastName": "Jones", "householdId": 16, "cellPhone": "617-000-0011", "officePhone": "781-000-0011", "email": "ajones@fakemail.com",                               "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191734", "longitude": "-89.45499"}, 
															{"id": "12", "entityType": "PSN", "firstName": "Steven", "lastName": "Wells", "householdId": 16, "cellPhone": "617-000-0012", "officePhone": "781-000-0012", "email": "swells@fakemail.com",                            "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": "13", "entityType": "HOU",  "name": "James and Linda King", "MEMBERS": [1,2], "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com", 										"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": "14", "entityType": "HOU",  "name": "Julie and Jim Taylor", "MEMBERS": [3,4,5,6], "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", 									"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": "15", "entityType": "HOU",  "name": "Eugene and Julie Lee", "MEMBERS": [7,8,9], "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com", 										"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": "16", "entityType": "HOU",  "name": "Steven and Ingrid Wells", "members": [10,11,12], "cellPhone": "617-000-0012", "officePhone": "781-000-0012", "email": "swells@fakemail.com", 								"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": "17", "entityType": "ORG",  "name": "Johnson Construction", "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com", 															"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": "18", "entityType": "ORG",  "name": "Acme Accounting", "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", 																"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": "19", "entityType": "ORG",  "name": "Hunter Houses", "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com", 																	"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": "20", "entityType": "ORG",  "name": "Steven Consruction", "cellPhone": "617-000-0012", "officePhone": "781-000-0012", "email": "swells@fakemail.com", 															"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"}
													]
											}, 
											{"id": 2, "name": "Acme Agency", "cellPhone": "617-000-0002",  "email": "jtaylor@fakemail.com", 
													"ENTITIES": [
															{"id": 21, "entityType": "PSN", "firstName": "James", "lastName": "King", "householdId": 21, "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com",                                 "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191434", "longitude": "-89.45439"}, 
															{"id": 22, "entityType": "PSN", "firstName": "Julie", "lastName": "Taylor", "householdId": 22, "department": "Marketing", "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com",  "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191534", "longitude": "-89.45449"}, 
															{"id": 23, "entityType": "PSN", "firstName": "Eugene", "lastName": "Lee", "householdId": 23, "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com",                                  "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191634", "longitude": "-89.45439"}, 
															{"id": 24, "entityType": "PSN", "firstName": "John", "lastName": "Williams", "householdId": 24, "cellPhone": "617-000-0004", "officePhone": "781-000-0004", "email": "jwilliams@fakemail.com",                          "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191734", "longitude": "-89.45449"},
															{"id": 25, "entityType": "HOU",  "name": "James and Linda King", "MEMBERS": [21,22], "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com",                                         "addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 26, "entityType": "HOU",  "name": "Julie and Jim Taylor", "MEMBERS": [23,24], "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", 										"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 29, "entityType": "ORG",  "name": "Johnson Construction", "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com", 															"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 30, "entityType": "ORG",  "name": "Acme Accounting", "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", 																"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 31, "entityType": "ORG",  "name": "Hunter Houses", "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com", 																	"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 32, "entityType": "ORG",  "name": "Steven Consruction", "cellPhone": "617-000-0012", "officePhone": "781-000-0012", "email": "swells@fakemail.com", 																"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"}
													]
											}, 
											{"id": 3, "name": "Hunter Agency", "cellPhone": "617-000-0003", "email": "elee@fakemail.com", 
													"ENTITIES": [
															{"id": 41, "entityType": "PSN", "firstName": "James", "lastName": "King", "householdId": 51, "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com",                                	"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191434", "longitude": "-89.45439"}, 
															{"id": 42, "entityType": "PSN", "firstName": "Julie", "lastName": "Taylor", "householdId": 51, "department": "Marketing", "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", 	"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191534", "longitude": "-89.45449"}, 
															{"id": 43, "entityType": "PSN", "firstName": "Eugene", "lastName": "Lee", "householdId": 52, "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com",                                 	"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191634", "longitude": "-89.45439"}, 
															{"id": 44, "entityType": "PSN", "firstName": "John", "lastName": "Williams", "householdId": 52, "cellPhone": "617-000-0004", "officePhone": "781-000-0004", "email": "jwilliams@fakemail.com",                         	"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191734", "longitude": "-89.45449"},
															{"id": 51, "entityType": "HOU",  "name": "James and Linda King", "MEMBERS": [41,42], "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com", 										"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 52, "entityType": "HOU",  "name": "Julie and Jim Taylor", "MEMBERS": [43.44], "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", 										"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 55, "entityType": "ORG",  "name": "Johnson Construction", "cellPhone": "617-000-0001", "officePhone": "781-000-0001", "email": "jking@fakemail.com", 															"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 56, "entityType": "ORG",  "name": "Acme Accounting", "cellPhone": "617-000-0002", "officePhone": "781-000-0002", "email": "jtaylor@fakemail.com", 																"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 57, "entityType": "ORG",  "name": "Hunter Houses", "cellPhone": "617-000-0003", "officePhone": "781-000-0003", "email": "elee@fakemail.com", 																	"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"},
															{"id": 58, "entityType": "ORG",  "name": "Steven Consruction", "cellPhone": "617-000-0012", "officePhone": "781-000-0012", "email": "swells@fakemail.com", 																"addr1": "100 Main St", "city": "Waunakee", "state":"WI", "zip":"53597", "latitude": "43.191834", "longitude": "-89.45439"}
													]
											}
										],
										"USERS": [
											{"id": "1", "networkId":"BXE004", "firstName": "Brent", "lastName": "Engwall", "defaultAgencyId":1, "email": "bengwall@amfam.com", "latitude": "43.191434", "longitude": "-89.45439", "FAVORITES":["1","2","3"], "RECENTS":[], "AGENCIES":["1","2","3"]} 
										],
								};

								var agencyPromises = [];
								_.each(data.AGENCIES, function(agency){
										agencyPromises.push(

												self.insert("INSERT INTO AGENCIES (id, name, cellPhone, email) VALUES (?,?,?,?)", [agency.id, agency.name, agency.cellPhone, agency.email]).then(function() {
													
														var entityPromises = [];
														_.each(agency.ENTITIES, function(entity){
																entityPromises.push(

																		self.insert("INSERT INTO ENTITIES (id, agencyId, entityType, householdId, name, firstName, lastName, cellPhone, email, addr1, city, state, zip, latitude, longitude) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", 
																			[entity.id, agency.id, entity.entityType, entity.householdId, entity.name, entity.firstName, entity.lastName, entity.cellPhone, entity.email, entity.addr1, entity.city, entity.state, entity.zip, entity.latitude, entity.longitude]).then(function() {

																				var subEntityPromises = [];

																				_.each(entity.MEMBERS, function(memberId){
																						subEntityPromises.push(
																							self.insert("INSERT INTO ENTITY_MEMBERS (entityId, memberEntityId) VALUES (?,?)", [entity.id, memberId])
																						);
																				});

																				_.each(entity.ACTIVITIES, function(activity){
																						subEntityPromises.push(
																								self.insert("INSERT INTO ENTITY_ACTIVITIES (entityId, actType, descr, status, priority, actDate) VALUES (?,?,?,?,?,?)", 
																									[entity.id, activity.actType, activity.descr, activity.status, activity.priority, activity.actDate])
																						);
																				});
																				
																				_.each(entity.OPPORTUNITIES, function(opportunity){
																						subEntityPromises.push(
																								self.insert("INSERT INTO ENTITY_OPPORTUNITIES (entityId, oppType, amount, dueDate, personFullName, personCity, personState) VALUES (?,?,?,?,?,?,?)", 
																									[entity.id, opportunity.oppType, opportunity.amount, opportunity.dueDate, opportunity.personFullName, opportunity.personCity, opportunity.personState]) 
																						);
																				});

																				return $q.all(subEntityPromises);
																		})

																);
														});

														return $q.all(entityPromises);
												})

										);
								});

								var userPromises = [];
								_.each(data.USERS, function(user){
										userPromises.push(

												self.insert("INSERT INTO USERS (id, networkId, firstName, lastName, defaultAgencyId, latitude, longitude) VALUES (?,?,?,?,?,?,?)", 
														[user.id, user.networkId, user.firstName, user.lastName, user.defaultAgencyId, user.latitude, user.longitude]).then(function() {
													
														var subUserPromises = [];

														_.each(user.AGENCIES, function(agencyId){
																subUserPromises.push(self.insert("INSERT INTO USER_AGENCIES (userId, agencyId) VALUES (?,?)", [user.id, agencyId]));
														});

														_.each(user.FAVORITES, function(entityId){
																subUserPromises.push(self.insert("INSERT INTO USER_ENTITY_FAVS (userId, entityId) VALUES (?,?)", [user.id, entityId]));
														});
														
														_.each(user.RECENTS, function(entityId){
																subUserPromises.push(self.insert("INSERT INTO USER_ENTITY_RECENTS (userId, entityId) VALUES (?,?)", [user.id, entityId]));
														});

														return $q.all(subUserPromises);

												})
										);
								});

				var initPromises = [
					self.insert("INSERT INTO APP_VARS (name, value) VALUES (?,?)", ['DB_VERSION', dbVersion])
				];

								return $q.all(dropPromises).then(function(){
									return $q.all(createPromises).then(function(){
										return $q.all(agencyPromises).then(function(){
											return $q.all(userPromises).then(function(){
												return $q.all(initPromises).then(function(){
													return undefined;
													console.log("DB Initialized");
												});
											});
										});
									});
								});

						}

				}

		}
)

