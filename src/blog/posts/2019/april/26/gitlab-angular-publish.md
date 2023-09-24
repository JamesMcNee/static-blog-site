---
layout: layouts/post.njk
title: 'Using GitLab CI to build and publish an Angular app [FTP]'
synopsis: Exploration on how to use the Gitlab CI to build and publish an Angular application via FTP to a host
image: 
  path: blog/posts/blog2.jpg
  alt: Photo of two pipelines running side by side
  caption: Photo by <a href="https://unsplash.com/photos/L4gN0aeaPY4?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Quinten de Graaf</a> on <a href="https://unsplash.com/search/photos/pipeline?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a>
labels:
  - Gitlab
  - Pipeline
  - FTP
  - CI/CD
date: 2019-04-22
---

After recently deciding to update my portfolio page I thought it was time that I moved (*slightly*) towards a more professional automated publishing mechanism; for context my previous method was to directly upload a site via FTP. This called for... a pipeline!

Having used [GoCD](https://www.gocd.org/) at my place of employment, I already had a good understanding of how a CI/CD (Continuous Integration/Delivery) system worked. My requirements for this pipeline were simple, build my angular app (using node) and publish the compiled project (via FTP) to my web host. I decided that as part of my pipeline I would also like a preprod stage, so that I can view my site in a production like environment before it went live.

While GoCD is a decent piece of software it felt a bit heavy for what I needed. I didn't want to set up a CI/CD environment for all my projects, I just wanted a single pipeline. I remembered that after I made the move a few months ago from GitHub to GitLab, there was a pipeline feature built in. It was a pleasant surprise when I discovered that it was also **100% free**.

The setup process for the pipeline was different from what I have seen before; it uses a config file, rather than a GUI based solution. However this was fine, so I did a bit of Googling and found a good starting point on how to configure a pipeline with a node image. It was suprisingly intuitive to setup, first I setup a cache that I would shove the node_modules directory into and also the dist folder which would cache images and the like. This will save time with subsiquent builds by using cached resources rather than redownloading them from NPM.
```yml
cache:
  key: "$CI_BUILD_REF_NAME"
  untracked: true
  paths:
    - node_modules/
    - dist/
```
After this I needed to define the stages for my job, as mentioned I wanted to **build**, publish to a **preprod** environment and then finally to a **production** one.
```yml
stages:
  - build
  - preprod
  - prod
```
Next was to setup the first stage which is of course the build stage. Here my angular code will be compiled and bundled together.
```yml
runBuild:
  image: node:latest # Use the node image (has node installed)
  before_script:
   - npm install
  stage: build
  script:
    - npm run-script build:prod
```
Now I needed to copy the compiled source onto my FTP server in the preprod directory. This was where it got slightly more complicated as
- I needed to abstract my FTP login details so to not store them in plain text on git.
- I needed to understand how to use a CLI to copy files via FTP

After some more Googling and browsing StackOverflow I found a [useful post](https://stackoverflow.com/questions/41633518/automated-gitlab-ci-yml-lftp-configuration/41645006#41645006) describing the various options of the CLI; with this and another [helpful post](https://forum.gitlab.com/t/deploy-with-ci-on-ftp-server/9437/2) on the GitLab forum I created a preprod job:
```yml
runPublishPreProd:
  stage: preprod
  before_script: 
    - apt-get update
    - apt-get install -y lftp # Install the FTP library
  artifacts:
    name: "$CI_BUILD_NAME/$CI_BUILD_REF_NAME" # Using the artifact from the previous stage
    paths:
    - dist/ # Path inside the artifact bundle
    expire_in: 2d # Keep around for 2 days
  script:
    - cd dist/portfolio/ # Change into the dist/portfolio directory (that came from the build stage)
    - lftp -u $FTP_USERNAME,$FTP_PASSWORD $FTP_HOST -e "mirror -e -R -p ./ preprod-main-site ; quit"
    - echo "Deployment Completed!"
  dependencies:
    - runBuild # This stage cannot be run until the runBuild task has been completed.
```
This was it, very simple. Now it was time to do the prod stage, which was almost identical except that I needed to add a manual trigger; this allows me to verify in preprod before pushing live. It was as simple as adding the following to the end of the task:
```yml
  when: 
    manual
```

Overall a pretty decent experience. I now have a pipeline that is triggered by pushing to the git repository and auto deploys into preprod. Hopefully this post will be of use to anyone who is wanting to do a similar thing!