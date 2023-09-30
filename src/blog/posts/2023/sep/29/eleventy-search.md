---
layout: layouts/post.njk
title: 'Adding dynamic search to a static Eleventy site'
synopsis: This post covers how I went about adding a dynamic search element to a static Eleventy based blog, without compromising on the benefits of SSG.
image: 
  path: blog/posts/blog10.webp
  alt: Autumn forest with a magnifying glass, blurred background but clarity though the glass
  caption: Photo by <a href="https://unsplash.com/@stevenwright?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Steven Wright</a> on <a href="https://unsplash.com/photos/mq8QogEBy00?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
labels:
  - Eleventy
  - Javascript
  - Blog
  - Search
date: 2023-09-29
---

#### Switching to Eleventy
Until recently my blog at [JamesMcNee.co.uk](https://jamesmcnee.co.uk) was a single page application built using the Angular framework a few years ago. I decided to build the blog using Angular because it was, and still is, the framework that I am most familiar and comfortable with. In my day-to-day work, if I need to whip up a quick webapp for users to interact with a system that I am building, my go to will be an Angular based SPA.

With time, I started to call into question my decision to build a blog using the Angular framework. The site was using an old version of the framework and upgrading was taking work, it was using a bespoke custom CMS that I built, powered by a Java API and MongoDB store. It also had a lot of custom CSS, which is not my forte. I wanted something lighter, faster to load and easy to host and maintain.

It was time to explore one of these new-fangled static site generators that everyone has been raving about, promising to solve all the problems I had with my current set up. After a bit of googling, I decided to try out [Eleventy](https://www.11ty.dev/), and I was immediately impressed by both the minimalism and flexibility it provides. So a few hours later, I had ported the pages and content, mainly keeping in the same style as the previous incarnation, but with the extra goodness of using [Tailwind](https://tailwindcss.com/) to do it.

#### Searching for a way to search
The benefits that a static site provides in terms of the web performance and the ease of adding new content are great, but it does pose a challenge for certain features that would be trivial with an API, in this case search... I wanted to add a search component to my blog to allow for quick finding of posts by title and synopsis keywords.

So, like any good developer, I immediately went to Google in hopes of finding someone who has already done the work for me! Alas, my search did not yield a good example on how to implement what I wanted.

#### Building it from scratch
After not having found a good example (there may be good examples, I just did not find one), I set in thinking about how I could implement it myself.

The back of the napkin requirements were simple, the solution should:
- Plug into Eleventys collection framework, so that I could use the same collection of blog posts for rendering and searching.
- Have the ability to dynamically show results within a component, and not require linking off to a separate page.
- Be totally self-contained within the repository, i.e. not using something like Google Site Search.

##### Creating a search payload
The first step to implement this was to get a data source in place, a simple JSON page served on a static route should do it. Here is an example of a nunjucks template that gives the search information for each post on my blog:

**search.json.njk**
```json
{%- raw %}
---json
{
    "permalink": "search.json",
    "eleventyExcludeFromCollections": true,
    "metadata": {
        "url": "https://www.jamesmcnee.com/"
    }
}
---
{
    "results": [
        {%- for post in collections.posts | reverse %}
        {%- set absolutePostUrl = post.url | absoluteUrl(metadata.url) %}
        {
            "url": "{{ absolutePostUrl }}",
            "path": "{{ post.url }}",
            "title": "{{ post.data.title }}",
            "synopsis": "{{ post.data.synopsis }}"
        }
        {% if not loop.last %},{% endif %}
        {%- endfor %}
    ]
}
{% endraw %}
```
This template yields an endpoint at `/search.json` with the following:
```json
{
  "results": [
    ...
    {
      "url": "https://www.jamesmcnee.com/blog/posts/2023/sep/29/eleventy-search/",
      "path": "/blog/posts/2023/sep/29/eleventy-search/",
      "title": "Adding dynamic search to a static Eleventy site",
      "synopsis": "This post covers how I went about adding a dynamic search element to a static Eleventy based blog, without compromising on the benefits of SSG."
    },
    ...
  ]
}
```
This should be enough information to facilitate a search by keyword in the posts title or synopsis text and allow for linking off to the full article.

##### Creating the markup
Next, we need a search component, essentially a text input which can show search results below it.

```html
    <div class="flex">
        <span class="flex-1"></span>
        <div>
            <div class="form-control w-full max-w-xs">
                <label class="label" for="search">
                    <span class="label-text">Search Posts:</span>
                    <span class="label-text-alt">e.g. "Patch"</span>
                </label>
                <input id="search" autocomplete="off" type="search" placeholder="Type here" class="input input-bordered w-full max-w-xs" />
            </div>
            <div id="search-results-container" style="background-color: hsl(var(--b1))" class="card shadow-xl absolute border-gray-600 border-solid border-2 translate-y-2 left-0 ml-[2%] w-[94%] z-50 md:left-auto md:w-96 md:-translate-x-1/2 lg:-translate-x-1/4 invisible">
                <div id="search-results" class="card-body p-4 text-sm max-h-96 overflow-y-scroll"></div>
            </div>
        </div>
    </div>
```

<div class="flex justify-center mb-2">
    <div class="relative">
        <div class="form-control mx-auto sm:w-full md:w-2/3">
            <label class="label" for="search">
                <span class="label-text">Search Posts:</span>
                <span class="label-text-alt">e.g. "Patch"</span>
            </label>
            <input id="search" autocomplete="off" type="search" placeholder="Type here" class="input input-bordered w-full" />
        </div>
        <div id="search-results-container" style="background-color: hsl(var(--b1))" class="card shadow-xl border-gray-600 border-solid border-2 -translate-x-[50%] left-[50%] mt-2 z-50">
            <div id="search-results" class="card-body p-4 text-sm max-h-96 overflow-y-scroll">
                <div class="cursor-pointer">
                    <a class="font-bold mb-0" href="#">Post One</a><p class="mb-0">This is the synopsis for the first post, it gives a brief description as to its content.</p>
                </div>
                <span class="divider mt-0.5 mb-0.5"></span>
                <div class="cursor-pointer">
                    <a class="font-bold mb-0" href="#">Post Two</a><p class="mb-0">This is the synopsis for the second post, it gives a brief description as to its content.</p>
                </div>
            </div>
        </div>
    </div>
</div>



The above is what I came up with, if you want to use it for inspiration, you can find the full [markup for it over on my GitHub](https://github.com/JamesMcNee/static-blog-site/blob/8d110bcdd810d507ad4d7255436e4ab3f5980c16/src/index.njk#L64-L78).

##### Implementing the dynamic results
Now that I had the markup for searching and displaying the results, I just needed to write a bit of Javascript to wire it up to the search payload we created earlier... For this, I just used an inline `<script>` block as it seemed the simplest solution.

```html
<script type="text/javascript">
    function searchShouldBeVisible(visible) {
        document.getElementById('search-results-container').classList.remove(visible ? 'invisible' : 'visible')
        document.getElementById('search-results-container').classList.add(visible ? 'visible' : 'invisible')
    }

    function search(term) {
        // Set search results to invisible if the term is falsy (empty string, or null/undefined)
        if (!term) {
            searchShouldBeVisible(false)
            return
        }

        // Set search results to visible
        searchShouldBeVisible(true)

        // Fetch the full search payload
        const searchResponse = await fetch('/search.json')
        const responseBody = await searchResponse.json()

        // Filter the results array for items that contain the term (ignoring case)
        const filtered = responseBody.results.filter(item => `${item.title}${item.synopsis}`.toLowerCase().includes(term.toLowerCase()))

        // Get the DOM element to populate with results
        const resultsDiv = document.getElementById("search-results")

        // Special handling if nothing found
        if (filtered.length === 0) {
            resultsDiv.innerHTML = 'Nothing found...'
            return
        }

        // Build up the inner HTML for the search results div
        let compiledString = ''
        for (let i = 0; i < filtered.length; i++) {
            const post = filtered[i]
            const card = `<div class="cursor-pointer" onclick="window.location = '${post.path}';"><a class="font-bold mb-0" href="${post.path}">${post.title}</a><p class="mb-0">${post.synopsis}</p></div>`
            compiledString = `${compiledString}${card}`

            if (i !== filtered.length - 1) {
                compiledString = `${compiledString}<span class="divider mt-0.5 mb-0.5"></span>`
            }
        }

        // Assign the compiled string to the innerHTML for the div
        resultsDiv.innerHTML = compiledString
    })
</script>
```

The above is a slightly simplified version of what I ended up with as I also wanted the following features:
- Click outside detection - When the user clicks or taps outside the search results, it should dismiss/hide them
- Search debounce - As I will be binding to the `keyup` event, it would be inefficient to constantly request the search payload for every user keystroke. So I want to wait for the user to finish typing before running the search.

You can, if desired, have a gander at the [full implementation](https://github.com/JamesMcNee/static-blog-site/blob/8d110bcdd810d507ad4d7255436e4ab3f5980c16/src/index.njk#L13-L62) of this on the GitHub repository for this blog. Do note that some of the required functions are off in other files though.

##### Tying it all together
All that is left now is to wire up the search input to the function we have created above. 

```html
<input id="search" autocomplete="off" type="search" placeholder="Type here" class="input input-bordered w-full max-w-xs" 
       onkeyup="search(event.target.value)" />
```

<div class="mx-6 w-2/5 mx-auto">
  <img alt="Image showing a search box with some dummy results under it" class="mx-auto" width="100%" src="/img/blog/posts/post-content/eleventy-search/search-component-finished.png">
</div>

#### Summary
In this post we have explored how we can add a bit of dynamic flare to an otherwise static site and implement a useful and fully customisable search, whilst not having to leave the framework!

If desired, you could extend this to also:
- Show a thumbnail for each search result
- Dismiss the results when clicking outside (see above)
- Debounce the search element (see above)
