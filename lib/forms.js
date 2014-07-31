'use strict';

var Promise = require('bluebird');
var _       = require('lodash');
var path    = require('path');

function helpers(req, res, next) {
	res.locals.formField = formField;
	res.locals.models    = database.models;
	next();
}

function buildValidationClasses(validationErrors) {
    var validationClasses = {};
    for(var k in validationErrors) {
        if (validationErrors.hasOwnProperty(k)) {
            validationClasses[k] = {
                'class': 'has-error',
                'data-message': validationErrors[k]
            };
        }
    }
    console.log('validationClasses', validationClasses);
    return validationClasses;
}

var filterAutoDatesAndID = function(x) { return !x.match(/id$|at$/i); };


var makeID = function(field) {
    field = field.replace(/[^a-zA-Z0-9_-]+/g, '_');
    return [this.attr.id, field].join('_');
};

var formField = function(field, render) {
    // This function is only to be called via .call, so this will be bound
    /* jshint validthis:true */

    var model    = this.model;
    var instance = this.instance;
    if (!instance) {
        instance = model.build({});
    }
    var dbField = model.rawAttributes[field];
    var data = {
        label:   field,
        name:    field,
        inputID: makeID.call(this, field),
        value:   instance[field] || ''
    };
    var database = {type: []};

    var tpl = 'text';
    switch(dbField.type) {
        case database.type.BOOLEAN:
            tpl = 'checkbox';
            data.otherAttr = {checked: 'checked'};
            break;
        case database.type.ENUM:
            tpl = 'select';
            data.values = dbField.values;
            break;
        case database.type.DATE:
            tpl = 'date';
            break;
        case database.type.FLOAT:
        case database.type.INTEGER:
        case database.type.BIGINT:
            tpl = 'number';
            break;

        case database.type.STRING:
        /* STRING is the default, drop-through to case below */
        default:
            tpl = 'text';
            break;
    }
    var template = path.join(this.options.templateDir, tpl);
    return render(template, data);
};

/**
 * # Scaffold forms from Sequelize models
 *
 * ## Example
 *
 * ~~~js
 *     var reFormed = require('reformed');
 *     var form = new reFormed.Form(database.model('Project'))
 *     form.
 *         .method('POST')
 *         .action('/project/add')
 *         .addAttribute('id', 'myForm')
 *         .addClass('test')
 *         .addClass('form bootstrap-form')
 *         .fill(req.body)
 *         .render(app)
 *         .then(function(html) {
 *             res.render('projects.jade', { form: html });
 *         });
 * ~~~
 *
 * ## Options
 *     templateDir      Override template directory for custom themeing
 *                         Defaults to 'forms/'
 *
 * @param {Sequelize.Model} model    Model (not instance) to use
 * @param {Obhect} options Additional Form options (see Options)
 * @param {Instance} instance Optional model instance to use for filling form data
 */
function Form(model /*, options, instance */) {
    this.options      = {
        templateDir: 'forms'
    };
    this.instance     = null;
    if (this.arguments > 1) {
        this.options = _.assign(this.options, arguments[1]);
    }
    if (this.arguments > 2) {
        this.instance = arguments[2];
    }
    this.model        = model;
    this.extraClasses = [];
    this.attr         = {
        id: this.model.name + '_Form'
    };
    this.method       = 'POST';
    this.action       = null;
    this.formKeys     = Object.keys(model.rawAttributes).filter(filterAutoDatesAndID);
    return this;
}
Form.prototype.fill = function(instanceData) {
    this.instance = instanceData;
    return this;
};
Form.prototype.method = function(method) {
    this.method = method;
    return this;
};
Form.prototype.action = function(url) {
    this.action = url;
    return this;
};
Form.prototype.attr = function(attributeMap) {
    this.attr = attributeMap;
};
Form.prototype.addAttribute = function(key, value) {
    this.attr[key] = value;
};
Form.prototype.addClass = function(classes) {
    this.extraClasses = _.intersection(
        this.extraClasses,
        classes.split(/\s+/)
    );
    return this;
};
Form.prototype.render = function(app, req) {
    var render        = Promise.promisify(app.render, app);
    if (!this.action) {
        this.action = req.url;
    }
    var fieldPromises = {};

    this.formKeys.forEach(function(key) {
        fieldPromises[key] = formField.call(this, key, render);
    });

    var template = path.join(this.options.templateDir, 'form');
    var self     = this;

    return Promise.props(fieldPromises)
        .then(function(fields) {
            var data = {
                fields: fields,
                form:   self
            };
            return render(template, data);
        });
};

module.exports.validationClasses = buildValidationClasses;

module.exports.reForm = Form;
