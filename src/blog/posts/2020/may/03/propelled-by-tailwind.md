---
layout: layouts/post.njk
title: 'Propelled by a Tailwind'
synopsis: How tailwind helped me to move quickly without everything ending up a big mess
image: 
  path: blog/posts/blog5.jpg
  alt: Jet plane takeoff
  caption: Photo by <a href="https://unsplash.com/@blackpoetry?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">pixpoetry</a> on <a href="https://unsplash.com/s/photos/jet?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a>
labels:
  - Angular
  - CSS
  - Framework
  - Frontend
  - Tailwind
date: 2020-05-03
---

I participate in both front-end and back-end development; focusing mainly on the latter. I do however do a fair amount of front-end development, mostly in Angular, both professionally and for hobby projects. One of the main components of front-end development is the style of the site, defined in `CSS (Cascading Style Sheets)`. It is fair to say that I do not excel at design and CSS; I can get by for hobby projects, and understand how CSS works, I simply do not have the passion for it. I believe that the single pain point and that which takes a huge chunk of time when creating personal projects is writing CSS. Each time I start a project, I think 'this time I shall do write the CSS in a maintainable way', yet each time it ends up in this delicate balance where it seems one style change could send the whole site out of whack.

With this thinking in place; that when starting a new project I need to start again with building this delicate CSS Jenga tower, it was a great surprise when listening to an episode of the [Fish and Scripts podcast](https://fishandscripts.com) one of the hosts mentioned a library called Tailwind. This library was unlike many of the other CSS frameworks out there such as Bootstrap, which aims to provide ready-made components and classes that can be plugged onto elements such as a `<div>` to instantly render a predefined utility like a date picker. Tailwind, on the other hand, is different, it provides classes that add a single CSS property such that `m-4` which adds `margin: 1rem`, the power comes from combining many of these classes to quickly build a component, without worrying about class names, or targeting the right element.

Tailwind helps you to use the `DRY (don't repeat yourself)` principal while also helping to prevent this from happening too early. When writing CSS, you will often find yourself writing in a way that means that you can reuse the class, but often it will only be used once, on that specific element. Tailwind supports creating custom classes that combine multiple tailwind classes, so you can create classes such as `.btn` and `.link` where reuse is required.

Anyway, that is enough advertising for the framework. I have only used it once in a limited fashion, and I am not sure how easy/nice it would be to integrate with an existing project. I am however really excited about the potential this could provide for me to abstract the CSS creation on my projects and not end up fighting with the implementation provided by the likes of bootstrap.

A closing note:
I aim to try to build a small/medium project using Tailwind and give it a proper go. I found an article: [Angular 8 + Tailwind CSS Guide](https://dev.to/seankerwin/angular-8-tailwind-css-guide-3m45) by Sean Kerwin extremely useful in getting tailwind set up to be used inside of Angular. 