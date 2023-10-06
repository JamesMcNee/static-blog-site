---
layout: layouts/post.njk
title: 'Google Analytics click events in Angular 2+ (the easy way)'
synopsis: How I integrated Google Analytics with an Angular application to provide basic metrics on clicks etc.
image: 
  path: blog/posts/blog3.jpg
  alt: Webpage with graphs and charts
  caption: Photo by <a href="https://unsplash.com/photos/JKUTrJ4vK00?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Luke Chesser</a> on <a href="https://unsplash.com/search/photos/analytics?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a>
labels:
  - Angular
  - Directive
  - Google Analytics
  - How to
  - Typescript
date: 2019-04-29
---

I recently wanted to add Google Analytics into my portfolio page and blog to track engagement and interaction. I did not need anything fancy basically just page views and button/link clicks. I started as I usually do by doing a quick google, something similar to '*Google Analytics Angular*' and found a good article from Kissa Eric on [Scotch.io](https://scotch.io) (unfortunately the page has now been removed) with a detailed breakdown on how exactly GA can be added to an Angular project.

It basically boils down to adding the javascript provided by Google to the *index.html* file then creating an Angular service to send GA tracking events. As mentioned, this article was really useful in helping me to add Google Analytics to my project. The one area I think that was lacking however was in the way that it is recommended to send events on button clicks etc. The method provided is very programatic, binding to the click event of the element and then passing data to the service like this:
```typescript
// Template
<input type="button" value="Click Me!" (click)="trackButton()" />

// Component
constructor(private analyticsService: AnalyticsService){}

trackButton() {
    this.analyticsService.emitEvent("category", "action", "label", "value");
}
```
While this method certainly works, it means that you are either requied to create a method for each click, or pass arguments into one method; either option is not ideal. In an ideal circumstance we would not have to edit the component at all. This is why I decided to create a directive that can fulfil this task. See below:
```typescript
import { Directive, Input, HostListener } from '@angular/core';
import { GoogleAnalyticsService } from './google-analytics.service';

@Directive({
  selector: '[app-analytics]'
})
export class AnalyticsDirective {

  @Input("anayticsCategory") category: string;
  @Input("anayticsAction") action: string;
  @Input("anayticsLabel") label: string;
  @Input("anayticsvalue") value: number;

  constructor(private _analyticsService: GoogleAnalyticsService) {
  }

  @HostListener('click') onClick() {
    this._analyticsService.emitEvent(this.category, this.action, this.label, this.value);
  }
}
```
This directive allows me to tag an input or any element really and have click tracking applied; all without having to add any code to the componet itself. An example of how to add this in the template:
```html
<li (click)="gotoHome()" app-analytics anayticsCategory="navigation" 
    anayticsAction="click" anayticsLabel="header-home-link">Home</li>
```
As you can see I have added the directive to the list item *app-analytics*, I use 'navigation' as my *analyticsCategory* to allow grouping of all navigation events in GA. I then set the *analyticsAction* and *analyticsLabel*.

In summary, following the aforementioned tutorial on [Scotch.io](https://scotch.io/tutorials/integrating-google-analytics-with-angular-2), along with my directive, you can create a powerful way of tracking click events on any element. With a little tweaking you could also track other events like hovering etc.