---
layout: layouts/post.njk
title: 'Hello World'
synopsis: A warm hello and some thoughts about why this site exists
image: 
  path: blog/posts/blog1.jpg
  alt: Photo of a sign reading 'Welcome come on in'
  caption: Photo by <a href="https://unsplash.com/photos/AvqpdLRjABs?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Aaron Burden</a> on <a href="https://unsplash.com/search/photos/welcome?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a>
labels:
  - Hello
  - Introduction
date: 2019-04-22
---

It seems only fitting that the first post on this blog should be around the journey that I have taken to create it. Not only create the blog section but the whole portfolio site. It will be useful to provide some context to start off with around why I decided to create the site and what I had before. Around 2 years ago I decided to create a site to showcase my personal projects and also have a feed of what I have been looking at and watching recently. This was my main site until a few days ago when a new incarnation went live. It was clear that a number of issues were present in the old site; both in design and purpose. Responsiveness was completely lacking from the site; this meant that it looked awful on mobile devices. Another issue came from the only feed being sourced from a YouTube playlist, this restricted my ability to share articles and talks that I have been interested in that was outside of YouTube.

Therefore it was clear, out with the old; in with the new. Learning from my mistakes of the past, it was obvious that I needed to start with a CSS framework that would allow me to build upon a strong foundation. In the past I have tried to build the entire template from scratch and realistically CSS is not my strongest skill; not my weakest, but certainly I am more comfortable supplimenting an existing base. I decided Bootstrap would be my new best friend, and started to sketch out a design with the trusty old pen and paper. It was in this phase that I decided to look around for inspiration and came across a great looking bootstrap theme by [Jeromelachaud](https://github.com/jeromelachaud/freelancer-theme) and decided to base my design around it. I chose not to use the template itself as this would allow me greater control and flexibility when adding new components; using the template would also not have allowed me to properly structure towards to the Angular framework.

A few sketches later I set about creating the site, with some frustration here and magic there, it was born; a brand new professional portfolio page. I also decided to integrate with GitLab's CI to provide continuous integration and automatic deployment with both a preprod and prod stage to boot; more on this in another blog post though! So there it was, all done and dusted; brand new site; automated pipeline, but I felt there was still something missing. Dynamic content. I decided to give blogging a try; after having tried it in the past and gave up after a few posts. This time though I have more experience under my belt and a greater appreciation for the sharing of knowledge. I decided to create my own simple interface and service to provide the posts from a MySQL DB, and even markdown integration!

Anyway, that is all for now. First post done! I am hoping to write a piece around my setup with the GitLab CI and hopefully provide some useful bits for anyone trying a similar endeavour