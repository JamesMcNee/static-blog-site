---
layout: layouts/post.njk
title: 'Gradle Plugin: Adding an external dependency'
description: The first post on the blog
synopsis: It's a small world, after all!
date: 2022-01-01
---

I recently took on a bit of a side project to create a grade plugin to consolidate some shared build time concerns across a number of projects at my workplace. While I thoroughly enjoyed writing the plugin and learned a lot about how Gradle works (I would recommend the exercise to all as a learning experience), I did hit some roadblocks along the way. One of which this post is intended to address and hopefully provide some help to others who are trying to solve the same problem.

**Problem statement:**<br/>
I would like my plugin to add an external dependency to the project it is applied to.

<custom-element>
    <banner type="info">

**Jargon**:

Let's just start by defining some terms that will be used that may not be obvious as to what they refer to.

**Configuration**: In Gradle, a configuration in the context of dependencies is the scope that it will be applied within. For example, in a Java project, the common scopes that we see are `implementation` and `testImplementation`. These two scopes define if the dependency will be available for use in the main application code or only in tests.

 </banner>
</custom-element>

Diving into the code, let's imagine that we have a brand new plugin (this post will not cover how to create this, but official documentation can be found [here](https://docs.gradle.org/current/userguide/custom_plugins.html)). Out main plugin class looks like this:

```java
#CONFIG: { "title": "MyAwesomePlugin.java", "simpleCodeBlock": false }
public class MyAwesomePlugin implements Plugin<Project> {

    @Override
    public void apply(Project project) {

    }
}
```
Adding an external dependency is in theory not actually that much of an issue, we can simply use the `project.getDependencies().add()` method. The main issue comes when determining what to pass into this method. Let's take a look at the signature of the method: `Dependency add(String configurationName, Object dependencyNotation)`. We know what `configurationName` is (see jargon section above), but what on earth are we supposed to pass as `dependencyNotation`?

- String Notation: Simply a String written using Gradle dependency notation e.g. `com.mycompany:my-awesome-dependency:1.2.3`. There are ways to also specify things like strictness when using these 'simple' declarations, this is somewhat documented [here](https://docs.gradle.org/current/userguide/single_versions.html#simple_version_declaration_semantics).
- Map Notation: This is where you pass a `Map<String, String>` containing key-value pairs representing the dependency. The documentation on this is either non existent or elusive, but for example: `"group": "com.mycompany", "name": "my-awesome-dependency", "version": "1.2.3"`.

It is also possible that you pass in an object that implements one of the `Dependency` interfaces that the Gradle API provides. I would recommend against this though as there are no default implementations provided and you would therefore need to implement it yourself. This may not be such an issue but there are some methods on the interface that may require somewhat complicated logic to satisfy.

```java
#CONFIG: { "title": "MyAwesomePlugin.java", "simpleCodeBlock": false }
public class MyAwesomePlugin implements Plugin<Project> {

    @Override
    public void apply(Project project) {
        project.getDependencies().add("implementation", "com.mycompany:my-awesome-dependency:1.2.3");
    }
}
```
And that is it! It's not terribly complicated but it's also not immediately obvious, so hopefully, this post helps someone out.

**Closing Remarks:**

The Gradle API is very flexible and does a lot of 'magic', I have found myself fighting with this and trying to keep things nice and typed but sometimes you have just got to let Gradle do its thing!

