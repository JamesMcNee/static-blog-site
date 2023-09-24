---
layout: layouts/post.njk
title: 'Spring Shell Application: Purge History'
synopsis: Purging the built in history for a Spring Shell application
image: 
  path: blog/posts/blog4.jpg
  alt: Wet floor slippage sign
  caption: Photo by <a href="https://unsplash.com/@4themorningshoot?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Oliver Hale</a> on <a href="https://unsplash.com/?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a>
labels:
  - Spring
  - Java
  - CLI
  - Shell
  - Terminal
date: 2019-12-15
---

Hello all! It's been a while. I recently had the desire to create a shell application for a project that I am planning on working on; I wanted to create a small proof of concept application first so as to not complicate things. The first few hours of my forray into writing shell based apps was spent choosing a langage, and after much deliberation I decided to stick to what I know; Java and Spring. I am still yet to decide if this was a good idea; it certainly allowed me to be very productive and get a working prototype up in a reasonable amount of time, but I may have taken the easy road by sticking with Java.

Anyway, enough of the pre-amble. It turns out that Spring as always had my back when it came to creating a shell application. No need for manually registering user input and maintaining the app's lifecycle etc, Spring took care of all that, along with allowing me to use Dependency Injection and all the other good stuff spring offers. All of this came bundled up inside of the Spring shell library, or more accurately `spring-shell-starter`.

Spring shell provides some functionality by default, one of which is history; the ability to retain the commands entered by the user for later recall. This feature is extremely useful, and even persists across sessions, history can be recalled simply by typing `history` into the prompt. The issue is, there is no built in way to purge this history, which I deemed a neccessity for the application I was creating (see bottom of this article for a description).

After a bit of digging I found that the History functionality is provided by the `org.jline` package. This is all set up automagically by Spring for us, which is both extremely useful, and also very tedious to change the fucntionality of. There is little documentatin on how Spring is using `jline` so it took some trial and error to find the class that I needed to interact with. The class in question is `LineReader`:  `org.jline.reader.LineReader`. There is an instance method on this class `getHistory()` which provides a history object to which the `purge()` method can be called to wipe it. Simple...

<custom-element><banner type="error">
There is an issue when wiring in the `LineReader` bean as this creates a cyclical dependency. I got around this by marking the bean as Lazy in my components constructor (`@Lazy LineReader lineReader`). This means that it will not be wired in until it is needed, and when it is wired in, a proxy is wired, rather than the real object.</banner></custom-element>


So why did I write this post... I found it tedious to find out how to implement this functionality, and if I can help someone else out then it was worth it!

Here is a sample of the code required:
```java
import org.jline.reader.LineReader;
import org.jline.utils.AttributedString;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.shell.standard.ShellComponent;
import org.springframework.shell.standard.ShellMethod;
import org.springframework.shell.standard.ShellOption;

import java.io.IOException;

@ShellComponent
public class OtherCommands {

    private final LineReader lineReader;

    @Autowired
    public OtherCommands(@Lazy LineReader lineReader) {
        this.lineReader = lineReader;
    }

    @ShellMethod(value = "Clear all search history")
    public AttributedString clearHistory() throws IOException {
        lineReader.getHistory().purge();

        return CommandHelper.standardPrefixed("Info", "Command history has now been purged!");
    }
}
```

For those interested, the project that I wanted this for was an Urban Dictionary definition CLI. I was looking for a public API to play with while I was learning about Spring Shell and that seemed like a fun project; spoiler alert... it was. You can view the code for this, download the binary or fork it for yourself over on [GitHub](https://github.com/JamesMcNee/urban-cli)!