

'use strict';
/**
 * Testing of ???
 */
process.env.NODE_ENV = 'test';

var should  = require('should');

var Sequelize = require('sequelize');

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
  completed:   { type: Sequelize.BOOLEAN,  allowNull: false, defaultValue: false }
});

describe('It should render form correctly', function() {
    // this.timeout(0);

    beforeEach(function(done) {
        done();
    });
    before(function(done) {
        done();
    });

    it('should test something', function(done) {
        var Formao = require('../utils/forms').reForm;
        var form = new Formao(database.models.Project);
        form
            .action('/project');
        done(new Error("NOT IMPLEMENTED"));
    });
});

