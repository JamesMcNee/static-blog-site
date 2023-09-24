---
layout: layouts/post.njk
title: 'To PATCH or not to PATCH; that is not the question'
synopsis: Is the `PATCH` verb neglected? Exploration on the benefits of implementing PATCH on API's
image: 
  path: blog/posts/blog7.jpg
  alt: Patchwork Quilt
  caption: Photo by <a href="https://unsplash.com/@nathanbang?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Nathan Bang</a> on <a href="https://unsplash.com/s/photos/quilt?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a>
labels:
  - HTTP
  - REST
  - PATCH
  - JSON
date: 2021-02-20
---

When creating an API I will usually plan to implement 4 of the HTTP verbs; namely `GET`, `POST`, `DELETE` and `PUT`. These four request methods are all that are needed to implement a CRUD (Create, Read, Update and Delete) interface. It is also common to use the `GET` twice to implement a search interface, extending the acronym to SCRUD (or CRUDS).

There is another common HTTP verb that has not been mentioned above though and that happens to be the subject of this post; I of course refer to `PATCH` and not `HEAD`, `CONNECT`, `OPTIONS` or `TRACE` which are also not mentioned but are a little more on the obscure side.

Recently I decided to implement a `PATCH` method onto an API I was working on as it seemed appropriate. The context around this was to allow a boolean field to be updated and the original state was irrelevant to the client. One such use case would be notifications and marking them as read/acknowledged. With a newfound interest in `PATCH` I began researching the standards governing it and was surprised to find that there are in fact two main types of `PATCH` functionality which I will explore in this post; one being a [Merge Patch](https://tools.ietf.org/html/rfc7396) and the other a [JSON Patch](https://tools.ietf.org/html/rfc6902).

Let's first assume no knowledge of the `PATCH` request method, and for that matter, we can also assume no knowledge of `PUT`. Both of these methods allow for a client to instruct the server to update a specific resource. The `PUT` verb uses a replacement method whereas the `PATCH` verb allows for more surgical alterations. Imagine a simple API that provides methods to interact with a user object and there is a user available at the following location: `/api/user/1`.

The current state of this user is as follows:
```json
{
    "id": 1,
    "forename": "John",
    "surname": "Doe",
    "email": "john.doe@mail.com"
}
```
<br />
<h4>How a PUT request works</h4>

The `PUT` verb allows us to replace the entire state of the resource with what is being provided in the request body. For example, if we wanted to alter the email of the user above we could do the following request: `PUT: /api/user/1`.

```json
{
    "forename": "John",
    "surname": "Doe",
    "email": "john.doe@newmail.com"
}
```

On the face of it, this has done exactly what we wanted, the result is that the email has been updated. The downside of this method is that we need to provide the entire state of the object again meaning not only that our request is bigger than it needs to be but also that we need to know the current state of the resource before updating it.

<br />
<h4>How a PATCH request works</h4>

The `PATCH` verb allows us to selectively replace a section of the state in a more surgical way than that provided by the `PUT` method instead allowing us to alter (or add) individual keys in the JSON document.

As mentioned in the preamble at the beginning of this post, there are two types of `PATCH` implementation. Let's take a look at both:

<h5>The 'Merge Patch' implementation</h5>

This implementation is perhaps the most common one and is the one that I have favoured when implementing a `PATCH` method. The merge patch works by only acting upon keys that are present in the request. An important thing to note here is that this implementation of the `PATCH` verb does not provide a mechanism to treat a `null` value separately than a remove operation i.e. if knowing that a value was explicitly set to null is important then this implementation will not allow for it. If we wanted to update the email of the user (just like we did in the `PUT` example) then we would execute the following request: `PATCH: /api/user/1`.

```json
{
    "email": "john.doe@newmail.com"
}
```
In this case, we only provided the field that we wished to update; there was no need to provide the full state. The spec for the merge patch can be found: [here (RFC 7396)](https://tools.ietf.org/html/rfc7396).

<h5>The 'JSON Patch' implementation</h5>

This implementation uses a format called `JSON Patch` which is a way to describe updates to a JSON document. This format defines a JSON schema that provides for six 'operations'; `Add`, `Remove`, `Replace`, `Copy`, `Move` and `Test`. If we wanted to use the `JSON Patch` format to perform our user update then we would execute the following request: `PATCH: /api/user/1`.

```json
[
    {
        "op": "replace",
        "path": "email",
        "value": "john.doe@newmail.com"
    }
]
```
Again we did not need to provide the full state of the object and instead provided instructions on how to update the original document with our desired change.

Operations are passed inside of a JSON array allowing for multiple operations to be provided at once. There are a few benefits to this implementation of the `PATCH` verb. For one it is more explicit by providing the desired operation, it allows for differentiation between the value of `null` and the removal of a field if this is desired. The spec for the JSON patch can be found: [here (RFC 6902)](https://tools.ietf.org/html/rfc6902).

<br />
<h4>How does the server know the difference...</h4>

... and what if I want to accept both types of patch?

The `Content-Type` header can be used to instruct the server which type of patch you are using. Providing `application/json` as the value can be used to denote a Merge Patch and providing `application/json-patch+json` should denote a `JSON Patch`.

Another header `Accept-Patch` can be used by the server to advertise which types of patch are supported by returning the values mentioned above. See more about this header [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Patch).

<br />
<h4>Summary</h4>

After putting in the time to understand and appreciate the `PATCH` request method I have come around to the thinking that having it is perhaps more useful than having a `PUT` endpoint in many ways. But as the title "To PATCH or not to PATCH; that is not the question" suggests, whether or not we decide to implement `PATCH` is not the real question. It is how we might go about it.

In this post, I explored two different methods of implementing a `PATCH` endpoint. I currently prefer the 'Merge Patch' method but do find the 'JSON Patch' implementation interesting and worth consideration.

<custom-element>
    <banner type="info">
        Below are some resources that I used to help research the content in this post.

- An interesting StackOverflow question and set of answers exploring `PATCH` endpoints in detail. The answers also explore the idempotency of the `PATCH` request method which is a very interesting read. This can be found [here](https://stackoverflow.com/questions/28459418/use-of-put-vs-patch-methods-in-rest-api-real-life-scenarios).
- A great article on the differences between `PUT` and the two implementations of the `PATCH` endpoint. This can be found [here](https://apisyouwonthate.com/blog/put-vs-patch-vs-json-patch).
- RFC 6902 (JSON Patch). This can be found [here](https://tools.ietf.org/html/rfc6902)
- RFC 7396 (Merge Patch). This can be found [here](https://tools.ietf.org/html/rfc7396)
  </banner>
  </custom-element>