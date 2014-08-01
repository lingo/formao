'use strict';
/**
 * Testing of Formao
 */
process.env.NODE_ENV = 'test';

var should  = require('should');
var cheerio = require('cheerio');

var config = require('./config');
var Formao = require('../index').Formao;

describe('Code should work!', function() {
    // console.log(config.models.MyModel.rawAttributes);

    var form        = null;
    var fakeRequest = {
        url: '/testaction',
        body: {
            name:        'Test name',
            description: 'Test description',
            startDate:   new Date('2014-08-01 00:32'),
            endDate:     new Date('2014-08-30 00:32'),
            completed:   false
        }
    };

    // this.timeout(0);

    beforeEach(function(done) {
        form = null;
        form = new Formao(config.models.MyModel);
        done();
    });
    // before(function(done) {
    //     done();
    // });

    it('should set action', function() {
        form.action('/project');
        should.equal(form.action(), '/project');
    });

    it('should set method', function() {
        form.method('GET');
        form.method().should.equal('GET');
    });

    it('should set options', function() {
        form = null;
        form = new Formao(config.models.MyModel, {
            templateDir: 'abc/def'
        });

        form.should.have.property('_options');
        form._options.should.have.property('templateDir', 'abc/def');
    });


    it('should chain set action and method', function() {
        form
            .action('/project')
            .method('GET');
        form.method().should.equal('GET');
        form.action().should.equal('/project');
    });

    it('should generate ID and be able to override', function() {
        form.attr().should.have.property('id', 'MyModel_Form');
        form.addAttribute('id', '123');
        form.attr().should.have.property('id', '123');
    });

    it('should add single class', function() {
        form.addClass('test');
        form.attr().should.have.property('class', ['test']);
    });

    it('should add more classes', function() {
        form
            .addClass('test')
            .addClass('another test');
        form.attr().should.have.property('class', ['test','another']);
    });

    it('should render correctly', function(done) {
        form
            .addClass('mytest')
            .addClass('verbose')
            .addAttribute('data-testing', '12345')
            .method('PUT')
            .action(fakeRequest.url)
            .render(config.app, fakeRequest)
            .then(function(html) {
                var $    = cheerio.load(html);
                var $form = $('form#MyModel_Form');
                should.exist($form);
                $form.attr('data-testing').should.equal('12345');
                $form.attr('method').should.equal('PUT');
                $form.attr('action').should.equal(fakeRequest.url);
                $form.attr('class').should.equal('mytest verbose');
                $form.find('input').should.have.length(4);
                $form.find('textarea').should.have.length(1);
                $form.find('textarea').text().should.equal(fakeRequest.body.description);
                $form.find('input.date').should.have.length(2);
                $form.find('input#MyModel_Form_name').val().should.equal(fakeRequest.body.name);
                done();
            })
            .catch(done);
    });
});

