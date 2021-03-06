'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const { BlogPost } = require('../models');
const { closeServer, runServer, app } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

// this function deletes the entire database.
// we'll call it in an `afterEach` block below
// to ensure  ata from one test does not stick
// around for next one
function tearDownDb() {
  return new Promise((resolve, reject) => {
    console.warn('Deleting database');
    mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}


// used to put randomish documents in db
// so we have data to work with and assert about.
// we use the Faker library to automatically
// generate placeholder values for author, title, content
// and then we insert that data into mongo
function seedBlogPostData() {
  console.info('seeding blog post data');
  const seedData = [];
  for (let i = 1; i <= 10; i++) {
    seedData.push(generateBlogData());
  }
  // this will return a promise
  return BlogPost.insertMany(seedData);
}

function generateBlogData() {
  return {
    author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.text()
    };
  
}


describe('blog posts API resource', function () {

  before(function () {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function () {
    return seedBlogPostData();
  });

  afterEach(function () {
    // tear down database so we ensure no state from this test
    // effects any coming after.
    return tearDownDb();
  });

  after(function () {
    return closeServer();
  });

  // note the use of nested `describe` blocks.
  // this allows us to make clearer, more discrete tests that focus
  // on proving something small
  describe('GET endpoint', function () {

    it('should return all existing posts', function () {
      // strategy:
      //    1. get back all posts returned by by GET request to `/posts`
      //    2. prove res has right status, data type
      //    3. prove the number of posts we got back is equal to number
      //       in db.
      let res;
      return chai.request(app)
        .get('/posts')
        .then(_res => {
          res = _res;
          res.should.have.status(200);
          // otherwise our db seeding didn't work
          res.body.should.have.length.of.at.least(1);
          console.log(res.body);
          return BlogPost.count();
        })
        .then(count => {
          // the number of returned posts should be same
          // as number of posts in DB
          res.body.should.have.length(count);
        });
    });


    it('should return posts with the right fields', function() {
      let resBlogPosts;
      return chai.request(app)
      .get('/posts')
      .then(function(res) {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.have.length.of.at.least(1);

        res.body.forEach(function(post) {
          post.should.be.a('object');
          post.should.include.keys('id', 'author', 'title', 'content', 'created');
        });
        resBlogPosts = res.body[0];
        return BlogPost.findById(resBlogPosts.id);
      })
      .then(function(post) {
        resBlogPosts.id.should.equal(post.id);
        resBlogPosts.author.should.contain(post.author.firstName);
        resBlogPosts.author.should.contain(post.author.lastName);
        resBlogPosts.title.should.equal(post.title);
        resBlogPosts.content.should.equal(post.content);
      });
    });
});

describe('POST Endpoint', function() {
  it('it should add a new blog post', function() {
    const newBlogPost = generateBlogData();

    return chai.request(app)
    .post('/posts')
    .send(newBlogPost)
    .then(function(res) {
      res.should.have.status(201);
      res.should.be.json;
      res.body.should.be.a('object');
      res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
      res.body.author.should.contain(newBlogPost.author.firstName);
      res.body.author.should.contain(newBlogPost.author.lastName);
      res.body.title.should.equal(newBlogPost.title);
      res.body.content.should.equal(newBlogPost.content);

      return BlogPost.findById(res.body.id);
    })
    .then(function(post) {
        post.title.should.equal(newBlogPost.title);
        post.content.should.equal(newBlogPost.content);
        post.author.firstName.should.equal(newBlogPost.author.firstName);
        post.author.lastName.should.equal(newBlogPost.author.lastName);
    });
  });

});

describe('PUT Endpoint', function() {

  it('should update fields you send over', function() {
      const updateData = {
        title: 'foo',
        content: 'bbbbbbbbbggdsghgdsgfjhdsgfhjdsgfhjdgfhjdsgfjhdgfhjdsgfjsdhgfjhdsgfhjdsgfjhdsgfhjdgjhdgfhjgfhdgfjhdgfjhdgfhjdgfhjfghjdgfhdjgfhhd'
      };

      return BlogPost
        .findOne()
        .then(function(post) {
          updateData.id = post.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);

          return BlogPost.findById(updateData.id);
        })
        .then(function(post) {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
        });
    });
});



  describe('DELETE endpoint', function() {
    // strategy:
    //  1. get a restaurant
    //  2. make a DELETE request for that restaurant's id
    //  3. assert that response has right status code
    //  4. prove that restaurant with the id doesn't exist in db anymore
    it('delete a blog post by id', function() {

      let post;

      return BlogPost
        .findOne()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(function(_post) {
          should.not.exist(_post);
        });
    });
  });

});