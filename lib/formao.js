'use strict';
/**
 * @author Luke Hudson
 * @license http://opensource.org/licenses/MIT MIT
 * @overview A forms library designed to scaffold HTML forms from your Sequelize models.
 */

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
 * @private
 * @param  {String} field Field name
 * @return {String}       HTML-friendly identifier
 */
var makeID = function(field) {
    field = field.replace(/[^a-zA-Z0-9_-]+/g, '_');
    return [this._attr.id, field].join('_');
};


/**
 * Calculate field data
 * @private
 */
var prerenderFormField = function(field) {
    // This function is only to be called via .call, so *this* will be bound
    /* jshint validthis:true */
    var model    = this._model;
    var instance = this._instance;
    if (!instance) {
        instance = model.build({});
    }
    var dbField = model.rawAttributes[field];
    var data = {
        label: this._labels[field] || field,
        name:  field,
        attr:  {
            id: makeID.call(this, field)
        },
        value: instance[field] || ''
    };

    var tpl = 'text';
    var type;

    var typeOptions = [
        dbField.originalType,
        dbField._typeName,
        dbField.type.toString(),
        dbField.type
    ];
    // Find a valid type!
    for(var i=0; typeof type === 'undefined' && i < typeOptions.length; i++) {
        type = typeOptions[i];
    }
    // console.log("Field %s is of type: ", field, type, dbField);
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
    data.template = tpl;
    return data; // everything else expects a promise, so this too?
};

/**
 * @private
 * Render a form field
 * @param  {String} field    Field name
 * @param  {Function} render Promisifyed app.render
 * @return {Promise}         Promise from render fn resolved with HTML for field.
 */
var formField = function(field, render) {
    // This function is only to be called via .call, so *this* will be bound
    /* jshint validthis:true */
    var data = prerenderFormField.call(this, field);
    var template = path.join(this._options.templateDir, data.template);
    return render(template, data);
};

/**
 * @class  Formao
 * @constructor
 *
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
    this._fields        = {};
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

/**
 * Private for now, hence undocumented.
 * @todo make stable & public
 * @return {Object} Data set on form.
 */
Form.prototype.data = function() {
    return this._instance;
};

/**
 * Use the `data` *Object* to set the input fields values. This may be a
 * sequelize instance.
 *
 * @param {Object} instanceData Map fieldname => value
 * @return {Formao} self-reference for chaining
 */
Form.prototype.fill = function(instanceData) {
    this._instance = instanceData;
    return this;
};

/**
 * Set the form's HTML `method` attribute.
 * If this is called without an argument, then retrieve the `method` attribute.
 *
 * @param  {String} method GET/POST etc.  Generally HTML forms only support GET or POST
 * @return {mixed}  Formao or string
 */
Form.prototype.method = function(method) {
    if (arguments.length === 0) {
        return this._method;
    }
    this._method = method;
    return this;
};

/**
 * Set the form's HTML `action` attribute.
 * If this is called without an argument, then retrieve the `action` attribute.
 *
 * @param  {string} url HTML Action URL
 * @return {mixed}  Formao or String
 */
Form.prototype.action = function(url) {
    if (arguments.length === 0) {
        return this._action;
    }
    this._action = url;
    return this;
};

/**
 * Set attributes on the form element
 * If no arguments are passed, this acts as a getter and returns the current
 * attribute map (HTML attribute name => attribute value)
 *
 * @param  {Object} attributeMap Map of HTML attribute name => attribute value
 * @return {mixed}               Formao or Object
 */
Form.prototype.attr = function(attributeMap) {
    if (arguments.length === 0) {
        return this._attr;
    }

    this._attr = _.assign(this._attr, attributeMap);
    return this;
};

/**
 * Add an HTML attribute to the rendered `<form>` tag.
 *
 * @param {String} key   HTML attribute name
 * @param {String} value HTML attribute value
 * @return {Formao} self-reference for chaining
 */
Form.prototype.addAttribute = function(key, value) {
    this._attr[key] = value;
    return this;
};

/**
 * Add a CSS class (or several, space-separated) to the `<form>` tag's `class`
 * attribute.
 *
 * @param {String} classes CSS classname, or space-separated list of classnames
 * @return {Formao} self-reference for chaining
 */
Form.prototype.addClass = function(classes) {
    this._attr.class = _.union(
        this._attr.class,
        classes.split(/\s+/)
    );
    return this;
};

/**
 * Override the default (ugly) `<label>` text by specifying a fieldname and the
 * label to use.
 *
 * @param {String} key Field name (as named in Model defintion)
 * @param {String} value Field label
 * @return {Formao} self-reference for chaining
 */
Form.prototype.label = function(key, value) {
    this._labels[key] = value;
    return this;
};

/**
 * Override several default labels by specifying an `Object` whose keys are
 * field names and values are the labels to use.  This will be merged with any
 * previously defined labels.
 *
 * If labelMap is not specified, this acts as a getter and returns the current
 * map of fieldnames => labels
 *
 * @param {Object} labelMap Map fieldnames to labels (@see formao.label)
 * @return {mixed} Formao or Object
 */
Form.prototype.labels = function(labelMap) {
    if (arguments.length === 0) {
        return this._labels;
    }
    this._labels = _.assign(this._labels, labelMap);
    return this;
};


/**
 * Render the given template, using the provided data and append it to the form
 * before the submit
 *
 * @param  {String} templateName Name of template to render
 * @param  {Object} data         Data to pass to template
 * @return {Formao}              self-reference for chaining
 */
Form.prototype.appendTemplate = function(templateName, data) {
    this._append.push({
        template:     templateName,
        templateData: data,
        html:         null
    });
    return this;
};

/**
 * Append this raw html to the end of the form (before submit)
 *
 * @param  {String} html Raw HTML to append
 * @return {Formao}      self-reference for chaining
 */
Form.prototype.appendHTML = function(html) {
    this._append.push({
        template: null,
        html:     html
    });
    return this;
};

/**
 * Return the current fields calculated by formao.prerender
 * @todo  finish documenting once API is stable
 * @return {Object} Map of fieldname -> field data
 */
Form.prototype.fields = function() {
    return this._fields;
};

/**
 * Calculate everything, but don't render.
 * Use .fields() to retrieve the data for rendering the fields.
 */
Form.prototype.prerender = function() {
    var self = this;
    self._fields = null;
    self._fields = {};
    this._formKeys.forEach(function(key) {
        self._fields[key] = prerenderFormField.call(self, key);
    });
};

/**
 * Render the HTML finally.
 *
 * `app` This is your Express app.  It is needed to provide the `render` method.
 * `req` Optionally provide the request to fill the form.  If `fill` and `action` haven't been called, then the `action` defaults to `req.url` and `fill` is called using `req.body`
 *
 * @param  {Express} app Express app reference
 * @param  {Request} req Optionally pass in request to auto-fill form data and action.
 * @return {Promise}     A [Bluebird](https://www.npmjs.org/package/bluebird) promise is returned.
 */
Form.prototype.render = function(app /*, req */) {
    var self          = this;
    var render        = Promise.promisify(app.render, app);
    var fieldPromises = {};
    var req           = null;
    if (arguments.length > 1) {
        req = arguments[1];
    }

    // Fill form from request, if request is provided
    // and data hasn't already been set.
    if (!this._action && req && req.url) {
        this._action  = req.url;
    }
    if (!this._instance && req && req.body) {
        this.fill(req.body);
    }

    // Calculate the template dir relative to app views directory.
    // if this hasn't already been set
    if (!this._options.templateDir) {
        this._options.templateDir = path.relative(
            app.get('views'),
            path.resolve(__dirname, '../views/formao')
        );
    }
    var template = path.join(this._options.templateDir, 'form');

    // Setup field rendering promises
    this._formKeys.forEach(function(key) {
        fieldPromises[key] = formField.call(self, key, render);
    });

    // Set up HTML append promises
    var appends = [];
    this._append.forEach(function(item) {
        if (item.template) {
            if (item.templateData) {
                appends.push(render(item.template, item.templateData));
            } else {
                appends.push(render(item.template));
            }
        } else {
            appends.push(Promise.resolve(item.html));
        }
    });

    // Generate HTML for appending
    var appendHTML = '';

    Promise.reduce(appends, function(accum, html) { return html; }, '')
        .then(function(html) {
            appendHTML = html;
        });

    // Return promise based on rendering all fields,
    // then rendering form.
    return Promise.props(fieldPromises)
        .then(function(fields) {
            var data = {
                fields:      fields,
                form:        self,
                submitLabel: self._labels[Formao.SUBMIT],
                append:      appendHTML
            };
            return render(template, data);
        });
};

/**
 * 'Magic' string to set label for submit element
 * @type {String}
 */
Form.SUBMIT = '__formao__submit__label__';
// module.exports.validationClasses = buildValidationClasses;

module.exports.Formao            = Form;
