---
layout: layouts/post.njk
title: 'Preventing log spam in Java'
synopsis: How tailwind helped me to move quickly without everything ending up a big mess
image: 
  path: blog/posts/blog6.jpg
  alt: Wooden logs stacked to fill frame
  caption: Photo by <a href="https://unsplash.com/@etiennegirardet?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Etienne Girardet</a> on <a href="https://unsplash.com/s/photos/logging?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a>
labels:
  - Buffer
  - Java
  - Logging
  - Spam
date: 2020-08-15
---

Logging when something unexpected happens in an app is often a useful endeavour and provides valuable information to help diagnose and remedy potential errors. Logging infrastructure such as Elasticsearch (with a UI such as Kibana) allow for the easy storage and retrieval of log messages; ingesting and storing this data however has a cost.

In the everyday running of an application it might be normal to see a dozen messages in the logs. In this case it is very useful to have as much information as possible about each individual log to make sure that the diagnosis and remedy is as swift as possible. While it is useful to have this level of detail when there are so few logs, it is not very useful if there are thousands all pointing to the same error.

It is inevitable that an app will at some point run into an issue; this could be a simple issue such as loss of network connection. In this scenario it is important not to flood the logs with messages that could span into the thousands. Doing so puts strain on logging infrastructure but also makes it even more difficult to see other logs that may have happened around the same time.

This issue will be especially prevalent with asynchronous operations such as Kafka consumers where the number of messages is not always consistent.

In order to mitigate this issue I have created a `CountingWindowBuffer` class which once a defined threshold is hit will act as a circuit breaker to prevent the aforementioned log spam.

```java
private final ThresholdBuffer buffer = new CountingWinowedBuffer(5, Duration.ofMinutes(1),
                (count) -> LOGGER.error(String.format("Something catastrophic has happened %d times... This is a disaster!!", count)));
                
public void handleSomeAsyncAction(Action a) {
  try {
    //...
  } catch (Exception e) {
    buffer.increment(() -> LOGGER.error("Some more specific text about this particular error + the original exception", e));
  }
}
```

Notice in the above example we defined a threshold of 5 and a window of 1 minute, this would mean that once the `increment()` method is called 5 times the buffer would activate and the supplied function will no longer be called. Instead once the window has elapsed, the function defined within the buffers constructor is executed. The number of executions within the window will also be provided to this function.

Using the above `CountingWindowBuffer` we can maintain the standard logging that we find useful while also ensuring that during an incident that may cause a drastic increase in logs we do not spam our logs.

You can find the code for this buffer over on my GitHub [here](https://github.com/JamesMcNee/CountingWindowedBuffer).