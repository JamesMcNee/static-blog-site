---
layout: layouts/post.njk
title: 'Reverse Proxies: Take care what is being exposed!'
synopsis: Reverse proxies such as nginx, Spring Cloud Gateway and others are awesome, but it's easy to over expose your infrastructure.. This post explores limiting what gets proxied.
image: 
  path: blog/posts/blog8.jpg
  alt: Major road junction denoting interconnection
  caption: Photo by <a href="https://unsplash.com/@dnevozhai?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Denys Nevozhai</a> on <a href="https://unsplash.com/?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a>
labels:
  - Reverse Proxy
  - Security
  - HTTP
date: 2021-02-20
---

Having a microservice architecture certainly has advantages; it allows a service to be fully independent meaning that it can be both deployed and scaled separately while also allowing for a smaller code base which often helps developers to keep the codebase relatively clean. Microservices also allow for a trimmed down, domain-specific API which is not often the case when dealing with a monolith as it can be tempting to pull in multiple modules to build a single API response; this makes it hard to decouple and refactor.

One of the downsides to using this architecture though is that it moves away from the single URL / API' approach that is the preferred / most common way to interact with the services of a company. To illustrate this, imagine that a social network company wishes to allow developers to access some of its information, let's call this company... TwitBook. There are 3 data points that TwitBook wish to expose: `User Data`, `Post Data` and `Message History`. Each of these three data points are available internally via three separate apps, each with their own URL and REST API. TwitBook does not wish to expose these APIs as three individual, detached services but would like them to all appear as one with an API structure such as this: `developer.twitbook.tld/api/user/{userId}`, `developer.twitbook.tld/api/post/{postId}` and `developer.twitbook.tld/api/message/{messageId}`. Having endpoints exposed as a single API is also the most standard way for a front-end to communicate with its back-end service.

In order to have our cake and eat it too, have a detached microservice architecture but the benefits of a unified API, we can leverage a piece of technology known as the **reverse proxy**.

<custom-element>
    <banner type="info">

**What is a reverse proxy?**
<br />
A reverse proxy in its simplest form is a service that sits in front of multiple other services in which traffic (usually from the internet) is routed via. This layer can be used to add a layer of security, load balance, cache content and/or act as a facade for a microservice architecture (which this post focuses on).
<br />

<div class="text-centre"><img src="/img/blog/posts/post-content/reverse-proxy/reverse-proxy-dark.svg" width="70%" /></div>
Further reading around what a reverse proxy is and how it compares to a regular proxy can be found online such as 

[this](https://www.cloudflare.com/en-gb/learning/cdn/glossary/reverse-proxy) article from Cloudflare.

</banner>
</custom-element>

<br />
<br />

#### Sorry... It's time for the other shoe to drop

So far, the reverse proxy sounds like a pretty ideal solution to creating the facade of a unified API within a microservice ecosystem, and it absolutely is. The problem that this post describes is not from the use of the technology itself but rather from misuse of it and a potential oversight when configuring a reverse proxy.

If we consider the earlier example of TwitBook and the desire to expose a single API that provides data from multiple services, a naive configuration for a reverse proxy might look something like this:
```json
{
  "/api/user": "user-service.internal.twitbook.tld",
  "/api/post": "post-service.internal.twitbook.tld",
  "/api/message": "messaging-service.internal.twitbook.tld"
}
```  
Here we are forwarding any request to `developer.twitbook.tld/api/user` to the internal user service and are doing similar for both post and message endpoints. At first glance, everything seems fine here and unfortunately, this is sometimes where the configuration ends. We are able to access any current endpoint **and** any endpoint that is added to one of these services in the future; hopefully, now the issue is starting to become clear.

The intention seldom is to expose every endpoint of the downstream service, this is especially true if the service in question has admin endpoints exposed. One could argue here that the admin endpoints should be exposed via a different port or at the very least have auth that is different from that of the 'regular' endpoints but not always!

<br />

#### I'm convinced! How can we solve this?

It's pretty simple really, only forward the endpoints that you actually want to expose and to go one step further... restrict the HTTP methods that are forwarded too. Here is a simplified example config illustrating this:

```json
{
  "/api/user": {
    "target": "user-service.internal.twitbook.tld",
    "whitelist": [
      {
        "path": "/",
        "methods": ["GET", "POST"]
      },
      {
        "path": "/{id}",
        "methods": ["GET", "PUT", "PATCH", "DELETE"]
      }
    ]
  }
}
```

The implementation of this will depend on the framework that is being used for the reverse proxy, but hopefully, the idea has been conveyed. Using this method alone is not the only steps that should be taken to secure the proxy, it is vital to ensure that there are sufficient auth and user-level privileges in most cases too, but is a step up from just blindly forwarding everything.