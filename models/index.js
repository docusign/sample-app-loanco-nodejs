// Type 1: In-memory only datastore (no need to load the database)
var Datastore = require('nedb');
var models = {};

models.Envelope = new Datastore();

module.exports = models;

