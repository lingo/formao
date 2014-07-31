'use strict';

var Promise   = require('bluebird');
var _         = require('lodash');
var path      = require('path');
var Sequelize = require('sequelize');

// function buildValidationClasses(validationErrors) {
//     var validationClasses = {};
//     for(var k in validationErrors) {
//         if (validationErrors.hasOwnProperty(k)) {
//             validationClasses[k] = {
//                 'class': 'has-error',
//                 'data-message': validationErrors[k]
//             };
//         }
//     }
//     console.log('validationClasses', validationClasses);
//     return validationClasses;
// }

var filterAutoDatesAndID = function(x) { return !x.match(/id$|at$/i); };


var makeID = function(field) {
    field = field.replace(/[^a-zA-Z0-9_-]+/g, '_');
    return [this._attr.id, field].join('_');
};

var formField = function(field, render) {
    // This function is only to be called via .call, so this will be bound
    /* jshint validthis:true */
    var model    = this._model;
    var instance = this._instance;
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
    var type = dbField.type;
    if (typeof type === 'function') {
        type = dbField._typeName;
    }
    switch(type) {
        case Sequelize.BOOLEAN:
            tpl = 'checkbox';
            data.otherAttr = {checked: 'checked'};
            break;
        case Sequelize.ENUM:
            tpl = 'select';
            data.values = dbField.values;
            break;
        case Sequelize.DATE:
            tpl = 'date';
            break;
        case Sequelize.FLOAT:
        case Sequelize.INTEGER:
        case Sequelize.BIGINT:
            tpl = 'number';
            break;
        case Sequelize.TEXT:
            tpl = 'textarea';
            break;
        case Sequelize.VARCHAR:
        /* VARCHAR is the default, drop-through to case below */
        default:
            console.log("Field %s is of type %s", field, dbField.type);
            tpl = 'text';
            break;
    }
    var template = path.join(this._options.templateDir, tpl);
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
    this._options      = {
        templateDir: 'formao'
    };
    this._instance     = null;
    if (this.arguments > 1) {
        this._options = _.assign(this.options, arguments[1]);
    }
    if (this.arguments > 2) {
        this._instance = arguments[2];
    }
    this._model        = model;
    this._attr         = {
        id:    this._model.name + '_Form',
        class: []
    };
    this._method       = 'POST';
    this._action       = null;
    this._formKeys     = Object
                            .keys(this._model.rawAttributes)
                            .filter(filterAutoDatesAndID);
    return this;
}
Form.prototype.data = function() {
    return this._instance;
};
Form.prototype.fill = function(instanceData) {
    this._instance = instanceData;
    return this;
};
Form.prototype.method = function(method) {
    if (arguments.length === 0) {
        return this._method;
    }
    this._method = method;
    return this;
};
Form.prototype.action = function(url) {
    if (arguments.length === 0) {
        return this._action;
    }
    this._action = url;
    return this;
};
Form.prototype.attr = function(attributeMap) {
    if (arguments.length === 0) {
        return this._attr;
    }

    this._attr = _.assign(this._attr, attributeMap);
    return this;
};
Form.prototype.addAttribute = function(key, value) {
    this._attr[key] = value;
    return this;
};
Form.prototype.addClass = function(classes) {
    this._attr.class = _.union(
        this._attr.class,
        classes.split(/\s+/)
    );
    return this;
};
Form.prototype.render = function(app /*, req */) {
    var self          = this;
    var render        = Promise.promisify(app.render, app);
    var fieldPromises = {};
    var req           = null;
    if (arguments.length > 1) {
        req = arguments[1];
    }

    if (!this._action && req && req.url) {
        this._action  = req.url;
    }
    if (!this._instance && req && req.body) {
        this.fill(req.body);
    }

    var template = path.join(this._options.templateDir, 'form');

    this._formKeys.forEach(function(key) {
        fieldPromises[key] = formField.call(self, key, render);
    });

    return Promise.props(fieldPromises)
        .then(function(fields) {
            var data = {
                fields: fields,
                form:   self
            };
            return render(template, data);
        });
};

// module.exports.validationClasses = buildValidationClasses;

module.exports.Formao            = Form;
