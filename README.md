# Formao
[![Build Status](https://travis-ci.org/lingo/formao.svg?branch=master)](https://travis-ci.org/lingo/formao)

## Author
Luke Hudson <formao@speak.geek.nz>

## What is it?
A forms library designed to scaffold HTML forms from your Sequelize models.

## Installation

    npm install formao # --save # Use --save to add to your package.json

## Templates

By  default, Formao uses its own templates.
To see what templates are used for each data type, look at the 
`node_modules/formao/views/formao` directory.

`fieldholder.jade` is used to wrap each input field
`form.jade` is the overall form template
The rest are templates for each input type.

You may copy `node_modules/formao/views/formao/` to your views directory and modify these templates as desired.  You will need to change where the views are searched for using the `templateDir` option (see [Constructor Options](#options)).  For example (assuming you have copied these templates to your views/forms directory):

~~~js
// Look in your app views/forms directory
var form = new Formao(Model, { templateDir: 'forms'})
~~~


## Usage example

~~~js
   var Project = sequelize.define('Project', {
    // Model fields
    ...
    })

    ...
    
    var Formao = require('formao');

    // create a form from the model defined above.
    var form = new Formao(Project)
    
    // then simply
    
    form.render(app, req).then(function(html) {
        res.render('mypage', { form: html });
    });

    // Or, pulling out all the stops.
    form.
        .method('POST')         // set the Method
        .action('/project/add') // Set the Action
        .addAttribute('data-generator', 'formao') // add any custom HTML attribute
        .addClass('test') // Add CSS classes
        .addClass('form bootstrap-form') // optionally add several, space-separated
        .fill(req.body) // Set the input values from this objects keys&values
        .render(app) // finally render the HTML (returns a bluebird promise)
        .then(function(html) {
            // Finally, pass the form HTML to your template
            // If using JADE you'll need to avoid escaping, 
            // e.g.:
            //    .myform
            //      | !{form}
            // See: http://naltatis.github.io/jade-syntax-docs/#escaping
            res.render('projects/add', { form: html }); 
        });
~~~

## TODO

This is a brand new module, so there are lots of things to do.
Here's a quick list.

- [ ] Support more data types (missing some still)
- [ ] Test different dialects
    - [x] sqlite
    - [x] postgres
- [ ] Handle associations?
- [x] Allow for adding custom data into the HTML without editing the templates~
    + Appending in custom association fields to the form?
        * [x] Can be done via formao.appendTemplate or formao.appendHTML
    + For instance, per-input html (bootstrap input-group-addon?)
    + [ ] Appending submit etc to the form (this is rather vital!)
        * [x] Currently a default submit is included in form template, but there should be better methods

## API

### new Formao(Model, options, data)

Create a new form object, scaffolding the given sequelize model.
Note that you'll need to pass in the Model schema definition as the first argument, not an instance.

`Model` sequelize schema of your model (returned from sequelize.define)
`options` optional `Object` with options as listed below
`data` optional `Object` with data to fill the form (see [fill](#formaofilldata))

#### Options
This is an object which may contain the following keys.

`templateDir` Path where Formao will look for templates. This **defaults to formao** and is relative to your application views directory.

## Instance Methods
All these methods are chainable, except for `render`, and other methods when they are used as getters (no arguments provided) instead of setters, e.g. `formao.method()`, `formao.action()`.

### formao.method(/\*method\*/)
Set the form's HTML `method` attribute.
If this is called without an argument, then retrieve the `method` attribute.

### formao.action(/\*action\*/)
Set the form's HTML `action` attribute.
If this is called without an argument, then retrieve the `action` attribute.

### formao.label(fieldName, label)
Override the default (ugly) `<label>` text by specifying a fieldname and the label to use.

### formao.labels(fieldNameToLabelMap)
Override several default labels by specifying an `Object` whose keys are field names and values are the labels to use.  This will be merged with any previously defined labels.

### formao.labels()
Use the previous function as a getter to retrieve the map of field names to labels.

### formao.fill(data)
Use the `data` *Object* to set the input fields values. This may be a sequelize instance.

### formao.addAttribute(key, value)
Add an HTML attribute to the rendered `<form>` tag.

### formao.appendHTML(html)
Append this raw html to the end of the form (before submit)

### formao.appendTemplate(template, data)
Render the given template, using the provided data and append it to the form
before the submit

### formao.addClass(classnames)
Add a CSS class (or several, space-separated) to the `<form>` tag's `class` attribute.

### formao.prerender(req)
Calculates all the viewmodels for the fields, but renders nothing.
You can access these viewmodels via `formao.fields()`
`req` is an optional request to use for filling the from (as with `formao.render`)

### formao.fields()
Return the viewmodel.
This can be used to customize your own forms completely.

#### Example
```js
// Model
var MyModel   = sequelize.define('MyModel', {
    name:        { type: Sequelize.STRING,   allowNull: false },
    description: { type: Sequelize.TEXT,     allowNull: true },
    startDate:   { type: Sequelize.DATE,     allowNull: false, defaultValue: Sequelize.NOW },
    endDate:     { type: Sequelize.DATE,     allowNull: false, defaultValue: Sequelize.NOW },
    stage:       { type: Sequelize.ENUM('pending','processed','cancelled'),  allowNull: false, defaultValue: 'pending'},
    completed:   { type: Sequelize.BOOLEAN,  allowNull: false, defaultValue: false }
});
```

```js
formao.prerender();
formao.fields();
// Returns the following
// These values are set from model defaultValues
// Otherwise, values are set from formao.fill()
{ name: 
   { label: 'Name',
     name: 'name',
     attr: { id: 'MyModel_Form_name' },
     value: '',
     template: 'text' },
  description: 
   { label: 'Description',
     name: 'description',
     attr: { id: 'MyModel_Form_description' },
     value: '',
     template: 'textarea' },
  startDate: 
   { label: 'Start Date',
     name: 'startDate',
     attr: { id: 'MyModel_Form_startDate' },
     value: Date('Sat Aug 02 2014 13:09:48 GMT+0200 (CEST)'),
     template: 'date' },
  endDate: 
   { label: 'End Date',
     name: 'endDate',
     attr: { id: 'MyModel_Form_endDate' },
     value: Date('Sat Aug 02 2014 13:09:48 GMT+0200 (CEST)'),
     template: 'date' },
  stage: 
   { label: 'Stage',
     name: 'stage',
     attr: { id: 'MyModel_Form_stage' },
     value: 'pending',
     values: 
      { pending: 'pending',
        processed: 'processed',
        cancelled: 'cancelled' },
     template: 'select' },
  completed: 
   { label: 'Completed',
     name: 'completed',
     attr: { id: 'MyModel_Form_completed' },
     value: '',
     template: 'checkbox' } }

```

### formao.render(app /*, req */) -> Promise
Render the HTML finally.

`app` This is your Express app.  It is needed to provide the `render` method.
`req` Optionally provide the request to fill the form.  If `fill` and `action` haven't been called, then the `action` defaults to `req.url` and `fill` is called using `req.body`

A [Bluebird][bluebird] promise is returned.


## The name

**Formao** is the colloquial pronounciation in many dialects of spanish of **Formado** which means **formed or trained or educated**. The english phonetic spelling of this would be something like **form-ow**, but hopefully using this package doesn't cause any exclamations of **Ow!**)

[bluebird]: https://www.npmjs.org/package/bluebird "NPM package for bluebird"
