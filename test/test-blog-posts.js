'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');


const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {Test_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
	console.info('seeding blog post data');
	const seedData = [];
	for (let i = 1; i <= 10; i++) {
		seedData.push(generateBlogData());
	}
	return BlogPost.insertMany(seedData);
}


function generateBlogData() {
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		title: faker.lorem.sentence(),
		content: faker.lorem.paragraphs(),
		created: faker.date.past()
	}
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Blog Posts API Resource', function() {
	before(function() {
    return runServer(Test_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

describe('GET endpoint', function() {

    it('should return all existing blog posts', function() {
      // strategy:
      //    1. get back all restaurants returned by by GET request to `/restaurants`
      //    2. prove res has right status, data type
      //    3. prove the number of restaurants we got back is equal to number
      //       in db.
      //
      // need to have access to mutate and access `res` across
      // `.then()` calls below, so declare it here so can modify in place
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          // so subsequent .then blocks can access response object
          res = _res;
          expect(res).to.have.status(200);
           //otherwise our db seeding didn't work
          expect(res.body.posts).to.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          expect(res.body.posts).to.have.length.of(count);
        });
   


  });

 });

  });
  





