var config = require('../config');
var dbLink = 'dbs/' + config.documentdb.db;
var collLink = dbLink + '/colls/' + config.documentdb.collection;
var DocumentClient = require('documentdb').DocumentClient;
var host = config.documentdb.host;
var masterKey = config.documentdb.primary_key;
var client = new DocumentClient(host, {masterKey: masterKey});
var alpha3_alpha2 = require('../public/ISO-ZZZZ_to_ISO-WWWW_country_codes.json');

// /**
//  * Get airports per country
//  * Forms select query to fetch all airport per country
//  * @param{Object} airport - airport object with new admin data
//  * @return{string} query - query string for docdb query
//  */
// function form_query(airport) {
//   return {
//     query: `
//       SELECT a.id, a.geometry.coordinates FROM airports a where a.properties.country_code=@alpha2
//     `,
//     parameters: [{
//       name: '@alpha2',
//       value: alpha2
//     }]
//   };
// }

/**
 * Get airports per country
 * Forms select query to fetch all airport per country
 * @param{string} country_admins - Feature collection of country's admins
 * @return{string} query - query string for docdb query
 */
function form_query(country_admins) {
  var alpha3 = country_admins.features[0].properties.ISO;
  var alpha2 = alpha3_alpha2[alpha3];
  if (alpha2.match(/[A-Z]{2}/)) {
    return {
      query: `
      SELECT * FROM airports a where a.properties.country_code=@alpha2
      `,
      parameters: [{
        name: '@alpha2',
        value: alpha2
      }]
    };
  } else {
    console.log('Invalid alpha 2 code!');
  }
}

/**
 * Queries documentdb for airports per a country name
 * @param{string} country_admins - Feature collection of country's admins
 * @return{array} results - array of airports per country
 */
exports.fetch_airports_per_country = function(country_admins) {
  return new Promise(function(resolve, reject) {
    var query = form_query(country_admins);
    client.queryDocuments(collLink, query).toArray(function(err, results) {
      if (err) {
        console.log(err);
      } else {
        console.log(results.length + ' Documents found');
        resolve(results);
      }
    });
  });
};

/**
 * Queries documentdb for airports per a country name
 * @param{string} airport - airport json
 * @return{Promise} Fulfilled when documents are saved.
 */
exports.update_airport = function(airport) {
  var docLink = collLink + '/docs/' + airport.id;
  // var query = form_update_query(airport);
  return new Promise(function(resolve, reject) {
    client.replaceDocument(docLink, airport, function(err, updated, headers) {
      if (err) {
        console.log(err);
      } else {
        console.log(airport.properties.name);
        setTimeout(function() {
          resolve();
        }, 200);
      }
    });
  });
};
