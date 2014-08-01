'use strict';

var Sequelize = require('sequelize-sqlite').sequelize,
    sequelize = new Sequelize('database', 'username', 'password', {
        dialect: 'sqlite',
        storage: 'testdb.sqlite',
        logging: false
    });

var MyModel   = sequelize.define('MyModel', {
    name:        { type: Sequelize.STRING,   allowNull: false },
    description: { type: Sequelize.TEXT,     allowNull: true },
    startDate:   { type: Sequelize.DATE,     allowNull: false, defaultValue: Sequelize.NOW },
    endDate:     { type: Sequelize.DATE,     allowNull: false, defaultValue: Sequelize.NOW },
    stage:       { type: Sequelize.ENUM('pending','processed','cancelled'),  allowNull: false, defaultValue: 'pending'},
    completed:   { type: Sequelize.BOOLEAN,  allowNull: false, defaultValue: false }
});

var express = require('express');
var app     = express();
var path    = require('path');

app.set('views', path.resolve(__dirname, '../views'));
app.set('view engine', 'jade');

module.exports = {
    app:    app,
    models: {MyModel: MyModel},
    db:     sequelize
};