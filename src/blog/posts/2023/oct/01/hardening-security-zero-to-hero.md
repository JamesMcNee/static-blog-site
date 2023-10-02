---
layout: layouts/post.njk
title: 'Hardening Security: From Zero to Hero'
synopsis: How I went from scoring a D- to an A+ on a site security report in a few hours, some coffee and of course, a little code.
image: 
  path: blog/posts/blog11.webp
  alt: Desk with smart phone laid upon it showing a screen with a padlock and the word secured below
  caption: Photo by <a href="https://unsplash.com/@danny144?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Dan Nelson</a> on <a href="https://unsplash.com/photos/ah-HeguOe9k?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
labels:
  - CSP
  - Security
  - Javascript
  - Eleventy
  - HTTP
  - Headers
date: 2023-10-01
---

#### Preface

I think it's important to preface this article with the following disclaimer... I am by no means a security expert! Everything that you read here is just documentation of what I have implemented for my blog at [JamesMcNee.co.uk](https://jamesmcnee.co.uk). As you will read though, I have not just made this up off the top of my head. I have used the tools that have been written by security experts to evaluate the hardiness of a website.

With this in mind, this post serves to explain how I took my blog (the one you're reading now, unless I have rebuilt it again!) from having a weak `D-` score over at [observatory.mozilla.org](https://observatory.mozilla.org) to a smug `A+` in a couple of hours (and cups of coffee <i class="ri-cup-line"></i>).

#### But what makes a site 'secure'?
Good question, and one that until I saw my abysmal score I didn't know either! Well, that's not quite true, there are obvious things like not sending passwords in plain text, using TLS/SSL over HTTPS rather than HTTP etc, but this post focuses on the more nuanced ways that a site can be exploited.

All of this stemmed from running a scan on [observatory.mozilla.org](https://observatory.mozilla.org) after I saw it linked in a post I was reading. I had already been using Google's [Lighthouse](https://pagespeed.web.dev/) to improve the performance of my site, so when I hit run on the Mozilla Observatory, I braced myself to be informed on how brilliant I am (_\*cough\*_ Eleventy and Cloudflare are). So when the results came in and I had been awarded a `D-` I could only laugh with shame.

##### So What was wrong?
Well, Observatory found the following issues with my site (I will be exploring these in more detail in the coming sections, so below are the descriptions paraphrased from [MDN](https://developer.mozilla.org/)):
- **<span class="text-red-700">[-25 Points]</span> No Content Security Policy ([CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP))**: An added layer of security that helps to detect and mitigate certain types of attacks, including Cross-Site Scripting (XSS) and data injection attacks. These attacks are used for everything from data theft, to site defacement, to malware distribution.
- **<span class="text-red-700">[-20 Points]</span> No HTTP Strict Transport Security ([HSTS](https://developer.mozilla.org/en-US/docs/Glossary/HSTS))**: Allows a website to inform the browser that it should never load the site using HTTP and should automatically convert all attempts to access the site using HTTP to HTTPS requests instead. It consists of one HTTP header, `Strict-Transport-Security`, sent by the server with the resource.
- **<span class="text-red-700">[-20 Points]</span> No X-Frame-Options ([XFO](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options))**: Used to indicate whether a browser should be allowed to render a page in a `<frame>`, `<iframe>`, `<embed>` or `<object>`. Sites can use this to avoid click-jacking attacks, by ensuring that their content is not embedded into other sites.
- **<span class="text-red-700">[-10 Points]</span> No X-XSS-Protection ([XXSS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection))**: A feature of Internet Explorer, Chrome and Safari that stops pages from loading when they detect reflected cross-site scripting (XSS) attacks. These protections are largely unnecessary in modern browsers when sites implement a strong `CSP`.

If one thing is clear, it's that my team will not be winning whatever game we're playing with a scorecard like that... There were some positive results in the report too, alas I cannot take credit for those, they were because my host ([Cloudflare Pages](https://pages.cloudflare.com/)) had taken care of them for me.

Let's work through that list, adding a CSP seems to be the biggest hitter as it will not only wipe out that top negative report (CSP), but it will also remove the last one (XXSS).

<div class="divider"><i class="ri-lock-line"></i></div>

#### Implementing a Content Security Policy (CSP)
I have an admission to make, although I have heard those three letters banded around both online and in my workplace, I never really understood what a CSP was. It always seemed to be some mythical beast that front-end folks would cheer about once conquered as if they had just slain a dragon. This gave me reason enough to avoid knowing more about it, that is of course until I did not really have a choice!

So, assuming that you have already read the definition above from MDN, and pulled a face at the vagueness of it, I shall attempt to summarise. A CSP is an HTTP header that instructs clients (browsers) where the server expects content to be loaded from, thus preventing assets from loading from an unknown source. It describes where things like images, video, scripts and styles are allowed to originate from and each of these are individually addressable within the header.

<div class="md:ml-6">

##### A brief note on the `<meta>` tag
It's possible to emulate HTTP response headers (to varying degrees of success) using the `<meta>` tag, and setting the `http-equiv` attribute to the name of the header you're trying to use. If you have never come across this concept before, you can read more about it over on [this page by w3](https://www.w3.org/International/questions/qa-http-and-lang#meta_summary), the standards authority for the web.

It is possible to have a CSP implemented using a `<meta>` tag, but there are some caveats (beyond the fact that using this tag is discouraged), the main one is that CSP reporting (more on this later) is not supported using this approach. Some additional features that are also not supported when using the meta tag approach, you can read more about them over at [content-security-policy.com](https://content-security-policy.com/examples/meta/).
</div>

As touched on, a CSP header comprises rules targeting the various pieces of dynamic content that a site can load, here are the ones that were important to me, along with where I wanted to allow content from:
- **`img-src`**: Allow images to be loaded from any origin.
- **`media-src`**: Allow audio/video to be loaded from any origin too.
- **`style-src`**: Allow styles to only be loadable from my own origins jamesmcnee[.co.uk | .com], along with a specific style for [utterances](https://utteranc.es), which I use for my post comments section.
- **`script-src`**: Allow scripts to be loadable from my own origins and utterances.
- **`frame-src`**: Allow `i-frames` etc to connect to my own origins and utterances.
- **`frame-ancestors`**: Do not allow my site to be i-framed, anywhere. If I need to do this for my own origin in the future, I'll open it up.
- **`object-src`**: Do not allow `<object>` and `<embed>` elements.

Most of these rules seem simple enough, the tricky part comes from `inline-scripts` and `inline-styles` i.e. the `<script>` and `<style>` tags, and also directives like `onclick="doSomething()"` and `style="color: blue;"`.

<div class="md:ml-6">

##### Why would inline scripts and styles be a problem?
I am going to focus on the first of these two because the exploit is easier to demonstrate, but you can read more about how styles can be exploited in this insightful and detailed [<i class="ri-stack-overflow-line"></i> Stack Overflow answer](https://stackoverflow.com/a/41925838). 

Imagine the following script that displays what the user searched for:
```javascript
<script type="text/javascript">
    const searchTerm = getQueryParam("term");
    
    document.getElementById('search-results').innerHTML(`<h1>${searchTerm}</h1>`);
</script>
```
This looks harmless enough, but what about if I set my url to `mydomain.com?term=<script>alert("EVIL")</script>`? All of a sudden I have injected code into the webpage (alert is used as a display that arbitrary code can be executed), this could be exploited to make the browser do anything!

Obviously, if a bad actor wants to do this to their own browser, then all the power to them, the issue comes when this URL is hidden inside a link somewhere else and an unsuspecting party clicks it.
</div>

Okay, I am convinced, inline scripts are bad... But they are so convenient... I had a few small inline scripts on various pages throughout my blog that made sense to live there. This brings me to the workaround/solution for the inline script problem...

You can do one of four things, listed in order of general preference sentiment:
1. Move any inline scripts into separate script files and load them into your site as you would for external dependencies.
2. Use a [nonce](https://content-security-policy.com/nonce/) (number once) to bind the HTTP response from the server and the scripts returned in the body. As demonstrated here.
3. Take a [hash](https://content-security-policy.com/hash/) of the script's content and add this to the CSP to mark the script as safe/allowed.
4. Last resort, you can allow `inline-scripts` in your CSP, but this greatly weakens the protections a CSP provides. Think carefully before doing this.

In my case, I used a combination of `1` (shifting scripts to separate files) and `3` (Using a hash of inline scripts/styles), I also removed any random `style` attributes that I had placed on elements with tailwind classes. I will not detail how to generate the hash, because it's explained [well on the content-security-policy.com](https://content-security-policy.com/hash/) website, as are most CSP concepts, so it's worth a browse.

I actually believe that using the nonce technique is a good option, and if it was easily doable for my setup, I may have chosen to do this rather than move scripts out into their own files. Alas, because I have a static site, hosted by Cloudflare Pages, I cannot easily inject a nonce value onto each script tag per request without using something like CF workers. I'd rather avoid the additional complexity and potential cost (you get so much for free), and just use the other two mechanisms.

<div class="md:ml-6">

##### A brief note on CSP reporting
CSP's provide the ability to report violations to a given endpoint. I did not end up actually using this feature, but it can be a good way to implement a CSP in a limited fashion, by enabling report only mode, to make sure that nothing is missed.

You can read more about this feature, including how to utilise it, [over on MDN here](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-to).

</div>

##### Building the CSP
Right, let's actually build the CSP header.

A CSP header looks like the following:
```yaml
  Content-Security-Policy: default-src 'self' domain.tld *.domain.tld; img-src *; ...
```

Each directive (e.g. `default-src`, `image-src`, etc) is separated by a semi-colon (`;`) and each source (e.g. `domain.tld`) by a space.

My host ([Cloudflare Pages](https://pages.cloudflare.com/)) supports the somewhat well-known pattern of accepting a `_headers` file that defines additional response headers to serve on content, many static site hosts such as Netlify and GitHub pages also subscribe to this. This file takes the form of a path match pattern and then key-value based headers. e.g.

```yaml
/blog/*
  X-MY-CUSTOM-HEADER: Value
```

In the above example, any request to a path that starts with `/blog` e.g. `/blog/my-page` would have the `X-MY-CUSTOM-HEADER` response header attached.

Initially, I began to implement the CSP header manually by adding to my `_headers` file a `Content-Security-Policy` header on the `/*` root. But this quickly became unwieldy to work with as I ended up needing to duplicate strings (like my domain for example). As I am using Eleventy (which I briefly wrote about my switch to in this [previous post](http://localhost:8080/blog/posts/2023/sep/29/eleventy-search/#switching-to-eleventy)) I decided that the `_headers` could just be a templated file and I could then use Javascript to add a [shortcode](https://www.11ty.dev/docs/shortcodes/) to build my CSP.

So now I had shifted the big unwieldy string from a text file into Javascript, which whilst better, was still pretty grim having to do lots of string interpolation. Before I went off and built a little function to generate the CSP, I googled and found that someone already had created a [content-security-policy-builder](https://www.npmjs.com/package/content-security-policy-builder) library! Horray! This library allows you to pass in a structured object representing the CSP and it will do the string templating for you.

In the end, this is what I ended up with
```javascript
eleventyConfig.addShortcode('csp', () => {
    const cspBuilder = require("content-security-policy-builder")

    const myDomains = ['jamesmcnee.com', 'jamesmcnee.co.uk']

    const defaultSrc = `'self' ${myDomains.join(' ')} ${myDomains.map(d => '*.' + d).join(' ')}`

    const allowedInlineScriptHashes = [
        'sha256-smKXypSFxzKD9ffC0rSshp292sAzf/X7cquCvQEA8XA=' // The post search script on index
    ]

    // If this has changed and needs updating, the browser spits out correct the value in the console; obviously check https://github.com/utterance/utterances/blob/master/src/client.ts#L50-L72 looks ok first.
    const utterancesInlineStyleHash = 'sha256-9HupEqQsOKAA3TMVtaZh8USULhFpwYGuWFk+44sVSgg='

    return cspBuilder({
        directives: {
            'default-src': defaultSrc,
            'img-src': '*',
            'media-src': '*',
            'style-src': `${defaultSrc} '${utterancesInlineStyleHash}'`,
            'script-src': `${defaultSrc} ${allowedInlineScriptHashes.length > 0 ? `'unsafe-inline'` : ''} ${allowedInlineScriptHashes.map(hash => `'${hash}'`).join(' ')} https://utteranc.es`,
            'script-src-attr': `'unsafe-hashes' 'sha256-1jAmyYXcRq6zFldLe/GCgIDJBiOONdXjTLgEFMDnDSM='`, // This is to allow the preloading of stylesheets
            'frame-src': `${defaultSrc} https://utteranc.es`,
            'frame-ancestors': `'none'`,
            'object-src': `'none'`
        }
    })
})
```
<custom-element>
    <banner type="info">
        Now, let me first address `unsafe-inline` here, before I get comments (I wish) telling me that I said it was bad and then went and used it! Well it's actually considered best practice to add `unsafe-inline` as a fallback for older browsers that don't support the hashing of scripts, if the browser does, it will be discounted. Therefore, I conditionally add it based on if I have a script hash or not!
  </banner>
</custom-element>

I can then use this shortcode in my `_headers` template file which now looks like

{% raw %}
```yaml
---
permalink: _headers
---
/*
  Content-Security-Policy: {% csp %}
```
The `{% csp %}` here will be expanded during the eleventy build to the actual full CSP. In-case you're curious, this is what the templated file looks like using the above settings in the builder
{% endraw %}

```yaml
---
permalink: _headers
---
/*
  Content-Security-Policy: default-src 'self' jamesmcnee.com jamesmcnee.co.uk *.jamesmcnee.com *.jamesmcnee.co.uk; img-src *; media-src *; style-src 'self' jamesmcnee.com jamesmcnee.co.uk *.jamesmcnee.com *.jamesmcnee.co.uk 'sha256-9HupEqQsOKAA3TMVtaZh8USULhFpwYGuWFk+44sVSgg='; script-src 'self' jamesmcnee.com jamesmcnee.co.uk *.jamesmcnee.com *.jamesmcnee.co.uk 'unsafe-inline' 'sha256-smKXypSFxzKD9ffC0rSshp292sAzf/X7cquCvQEA8XA=' https://utteranc.es; script-src-attr 'unsafe-hashes' 'sha256-1jAmyYXcRq6zFldLe/GCgIDJBiOONdXjTLgEFMDnDSM='; frame-src 'self' jamesmcnee.com jamesmcnee.co.uk *.jamesmcnee.com *.jamesmcnee.co.uk https://utteranc.es; frame-ancestors 'none'; object-src 'none'
```

Right-o CSP done, `+25 points`, `+10 points` for handing XSS protection (implicit in the CSP) and `+5 points` for having a strong CSP! Next...

<div class="divider"><i class="ri-lock-line"></i></div>

#### Implementing HTTP Strict Transport Security (HSTS)
Next on the agenda was to tackle `HSTS`, which if you remember is essentially not allowing HTTP traffic and enforcing that it be upgraded to HTTPS.

This one is much simpler than the last (you will be glad to hear), it is essentially just setting a response header, as I described at the end of the previous section, I can do this on my host using a `_headers` file. The header consists of three elements:
- Max Age <sup>(*required)</sup>: The time, in seconds, that the browser should remember that a site is only to be accessed using HTTPS. Recommended to be set as 2 years.
- Include Sub Domains: If specified the rule will be applied to all subdomains as well as the current domain.
- Preload: An optional parameter than when specified (must also have a max age of > 1 year, and include subdomains set to true) will include your domain in a list that browsers use to determine if your domain should only use HTTPS, without even making a request.

For this one, I just applied all of the settings, I set my max age as `2 years`, included sub-domains and opted into the preload register. My `_headers` file now looks like:

{% raw %}
```yaml
---
permalink: _headers
---
/*
    Content-Security-Policy: {% csp %}
    Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
{% endraw %}

Another one done, `+20 points` for ~~gryffindor~~ me! Next!

<div class="divider"><i class="ri-lock-line"></i></div>

#### Implementing X-Frame-Options (XFO)
The final one on the list was to tackle `XFO`, you will remember that this is essentially setting whether your site should be allowed to be rendered inside an `i-frame` etc. Allowing your site to be embedded can be used to facilitate a `click-jacking` attack, whereby buttons on your site, could be hidden behind elements so that the user doesn't know that they are clicking them.

This header `X-Frame-Options` can be set to either `DENY` or `SAMEORIGIN`, the former blocks being embedded altogether, while the latter allows for you to i-frame your own site.

As I do not have a good reason to allow this, even on my own origin, I opted to set this to deny. My final `_headers` file looks like this

{% raw %}
```yaml
---
permalink: _headers
---
/*
    Content-Security-Policy: {% csp %}
    Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
    X-Frame-Options: DENY
```
{% endraw %}

Boom, that's a wrap, final one done, `+20 points` and an additional `+5 points` too apparently!

#### Summarising
If you made it this far, thanks, I hope it was useful! In this post, I covered how I took my static Eleventy site from having a security rating of `D-` score over at [observatory.mozilla.org](https://observatory.mozilla.org) to `A+` in a few hours, and now, hopefully, you can do the same!

The main things that needed doing on my site, and that I covered were:
- Implementing a strong CSP to ensure that content is only being loaded from origins I expect
- Adding an HSTS header to ensure that HTTPS is always used when accessing my site...
- Adding an XFO header to ensure that my site is not i-framed anywhere, helping to reduce `click-jacking`