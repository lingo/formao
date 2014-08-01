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

/**
 * Make an HTML-happy ID from field and form names
 * @param  {String} field Field name
 * @return {String}       HTML-friendly identifier
 */
var makeID = function(field) {
    field = field.replace(/[^a-zA-Z0-9_-]+/g, '_');
    return [this._attr.id, field].join('_');
};

/**
 * Render a form field
 * @param  {String} field    Field name
 * @param  {Function} render Promisifyed app.render
 * @return {Promise}         Promise from render fn resolved with HTML for field.
 */
var formField = function(field, render) {
    // This function is only to be called via .call, so *this* will be bound
    /* jshint validthis:true */

    var model    = this._model;
    var instance = this._instance;
    if (!instance) {
        instance = model.build({});
    }
    var dbField = model.rawAttributes[field];
    var data = {
        label:   this._labels[field] || field,
        name:    field,
        inputID: makeID.call(this, field),
        value:   instance[field] || ''
    };

    var tpl = 'text';
    var type = dbField.type;
    if (dbField.originalType) {
        type = dbField.originalType;
    } else if (typeof type === 'function') {
        type = dbField._typeName;
    } else if (typeof type === 'object') {
        type = type.toString();
    } else {
        type = dbField.type;
    }
    switch(type) {
        case Sequelize.BOOLEAN:
            // Have to add BOOLEAN due to
            // weird PostgreSQL issue,
            // that dbField.originalType isn't set for BOOLEAN
        case 'BOOLEAN':
            tpl = 'checkbox';
            break;

        case 'ENUM':
        case Sequelize.ENUM:
            tpl = 'select';
            data.values = _.indexBy(dbField.values);
            break;

        case Sequelize.DATE:
        case 'TIMESTAMP WITH TIME ZONE':
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

        /* VARCHAR is the default, drop-through to case below */
        case Sequelize.VARCHAR:
        default:
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
        templateDir: null // will calculate in render() unless set by caller
    };
    this._instance     = null;
    if (arguments.length > 1) {
        this._options = _.assign(this._options, arguments[1]);
    }
    if (arguments.length > 2) {
        this._instance = arguments[2];
    }
    this._model        = model;
    this._attr         = {
        id:    this._model.name + '_Form',
        class: []
    };
    this._append        = [];
    this._perItemAppend = [];
    this._labels        = {};
    this._method        = 'POST';
    this._action        = null;
    this._formKeys      = Object
                            .keys(this._model.rawAttributes)
                            .filter(filterAutoDatesAndID);
    var self = this;
    this._formKeys.forEach(function(key) {
        var label = key.replace(/([a-z])([A-Z])/g, '$1 $2');
        label = label[0].toUpperCase() + label.slice(1);
        self._labels[key] = label;
    });
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

Form.prototype.label = function(key, value) {
    this._labels[key] = value;
    return this;
};

Form.prototype.labels = function(labelMap) {
    if (arguments.length === 0) {
        return this._labels;
    }
    this._labels = _.assign(this._labels, labelMap);
    return this;
};

Form.prototype.appendTemplate = function(templateName) {
    this._append.push({
        template: templateName,
        html:     null
    });
    return this;
};

Form.prototype.appendHTML = function(html) {
    this._append.push({
        template: null,
        html:     html
    });
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
    if (!this._options.templateDir) {
        // Calculate the template dir relative to app views directory.
        this._options.templateDir = path.relative(
            app.get('views'),
            path.resolve(__dirname, '../views/formao')
        );
    }
    var template = path.join(this._options.templateDir, 'form');

    this._formKeys.forEach(function(key) {
        fieldPromises[key] = formField.call(self, key, render);
    });

    var appends = [];
    this._append.forEach(function(item) {
        if (item.template) {
            appends.push(render(item.template));
        } else {
            appends.push(Promise.resolve(item.html));
        }
    });

    var appendHTML = '';

    Promise.reduce(appends, function(accum, html) { return html; }, '')
        .then(function(html) {
            appendHTML = html;
        });

    return Promise.props(fieldPromises)
        .then(function(fields) {
            var data = {
                fields: fields,
                form:   self,
                append: appendHTML
            };
            return render(template, data);
        });
};

// module.exports.validationClasses = buildValidationClasses;

module.exports.Formao            = Form;
