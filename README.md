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

- Support more data types (missing some still)
- Test different dialects
- Handle associations?
- Allow for adding custom data into the HTML without editing the templates
    + For instance, per-input html (bootstrap input-group-addon?)
    + Appending submit etc to the form (this is rather vital!)
        * Currently a default submit is included in form template
    + Appending in custom association fields to the form

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

### formao.render(app /*, req */) -> Promise
Render the HTML finally.

`app` This is your Express app.  It is needed to provide the `render` method.
`req` Optionally provide the request to fill the form.  If `fill` and `action` haven't been called, then the `action` defaults to `req.url` and `fill` is called using `req.body`

A [Bluebird][bluebird] promise is returned.


[bluebird]: https://www.npmjs.org/package/bluebird "NPM package for bluebird"
