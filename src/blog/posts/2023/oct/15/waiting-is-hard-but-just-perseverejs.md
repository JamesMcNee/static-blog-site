---
layout: layouts/post.njk
title: 'Waiting is hard... but just Persevere(JS)'
synopsis: Waiting for asynchronous events is something that is needed more and more, especially when testing messaging systems like Apache Kafka and RabbitMQ. This post explores the javascript library that I built in order to help facilitate this.
image: 
  path: blog/posts/blog13.webp
  alt: Wooden clocks of various shapes and sizes piled with their faces showing
  caption: Photo by <a href="https://unsplash.com/@jontyson?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Jon Tyson</a> on <a href="https://unsplash.com/photos/FlHdnPO6dlw?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>
labels:
  - Await
  - Persevere
  - Kafka
  - Testing
date: 2023-10-15
draft: true
---

### Preface
Working with technologies that are asynchronous in nature, such as messaging queues like Apache Kafka and RabbitMQ, brings not only some new interesting mechanisms for communication but also a few challenges to deal with in terms of verifying they are working as expected.

I'm a big fan of what I like to call 'shallow integration tests', these are tests that cover the integration around a single slice of your application, without testing the whole thing (a full integration test). Let's explore this a little further as it'll help with context.

### Shallow Integration Testing
In order to properly explain what I mean by 'shallow integration tests', it's somewhat important to touch on those either side of them, namely unit and integration tests.

- **Unit Tests** are those that are focused on the testing of a single unit of code, e.g. a function/method. They are isolated in what they test, meaning that they do not rely on external factors such as the network or a database. The aim of unit testing is to prove that given a set of inputs/conditions the isolated unit responds/behaves as expected.
- **Integration Tests** differ from unit tests in that rather than testing an isolated piece of code such as a function or method, they test the integration between all the units of your application. Integration tests tend to be higher level than a unit test, not exercising every edge case, but rather testing core flows through your application.

<br>
When I refer to a 'shallow integration test' what I am referring to is a test that sits at a boundary of your application and tests the integration between your code that interacts with an external system (or is interacted with). Most commonly this will either be at the `repository` or `controller` layer.<br><br>

- A **repository** is a class that is responsible for handling data exchange between your application and an external system, this could be a database, HTTP service, message queue or even something like a printer.
- A **controller** is a class that handles the interaction into your application, this could be a set of HTTP endpoints, a console/terminal prompt a consumer of a messaging queue or even a physical button that someone might press.

<br>
Imagine that we have an application that serves a HTTP API for a library, one of the functions that this API performs is allowing patrons to check if books are available to borrow. The API is backed by a `MongoDB` database which it can use to track and update the availability of books.
