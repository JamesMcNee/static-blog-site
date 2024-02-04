---
layout: layouts/post.njk
title: 'Making Postgres a self service feature'
synopsis: A core part of many applications is the datastore that they use to... well store data, amongst other things. This article details how we opened the door for developers to 'self-serve' their Postgres datastores.
image: 
  path: blog/posts/blog14.webp
  alt: Photo depicting an elephant squirting water from its trunk, 
  caption: Photo by <a href="https://unsplash.com/@geraninmo?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Geranimo</a> on <a href="https://unsplash.com/photos/brown-elephant-standing-on-brown-field-during-daytime-AX9sJ-mPoL4?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>
labels:
  - Postgres
  - Kubernetes
  - CRD
  - Self Service
  - CloudSQL
date: 2024-02-03
draft: true
---

### A history of our datastore estate
The company I work for (Auto Trader), within the last 5 years or so, has completed a full cloud migration. Moving from two 'on premise' datacenters to a fully public cloud infrastructure, built atop of GKE (Google Kubernetes Engine). If you want to know more about the cloud migration as a whole, why not read these [Google](https://cloud.google.com/customers/auto-trader-uk) and [Cloudflare](https://www.cloudflare.com/en-gb/case-studies/auto-trader-on-premises-cloud-migration/) case studies.

In terms of datastores, the journey, like the cloud migration as a whole, has been interesting. Pre-migration, when applications were running on premise, there were two options for datastore that developers could choose from, MongoDB for NoSQL or Oracle as the RDBMS (Relational Database Management System), both hosted on premise. The latter of these was by far the most prevalent choice amongst developers, both because its use predated Mongo but also because our developers were (and largely still are) more comfortable with relational datastores.

Once the cloud migration kicked off, an alternative for both of these technologies were sought, and eventually found, settling on MongoDB Atlas (Mongo's own SaaS offering) and CloudSQL (Google's SQL offering). There is [an article](https://cloud.google.com/blog/products/databases/how-auto-trader-migrated-its-on-prem-databases-to-cloud-sql), written during the time of the migration which provides further reading on the journey to CloudSQL if you're interested.

### Semi-Automated provisioning
The configuration for our CloudSQL datastores were split between being IAC (Infrastructure as Code), defined in terraform, and manual provisioning via a bespoke 'CLI' (Command Line Interface). The instances (servers) were defined fully in Terraform and any changes such as scaling, upgrades and flags etc would be applied via CI/CD. Database provisioning and changes however, were applied manually by database engineers, this included creating and decommissioning databases, but also altering things like role configuration and creating users (login roles).

If a developer needed a new Postgres database, they would need to request one be created by the database engineers, who would work with developers to decide where the database best sat. On am existing shared multi-tenant instance, or if a brand new instance was required. The factors that went into these decisions were things like expected throughput and volume of data, along with trying to co-locate 'related' databases, in the hope of making things like co-ordinating upgrades easier.

### Custom Resource Definitions

As mentioned, we use GKE to run our applications, which means that we create Kubernetes resources such as Deployments, Services and Secrets for each application we run. We also make extensive use of [CRDs (Custom Resource Definition)](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) for managing things like Slack Groups (so we can tag maintainers in alerts), Kafka Topics (to control access) and much more. Therefore, when we started looking at making Postgres a self serve option, it seemed only logical that we would model it using Kubernetes resources.

#### Postgres Instance 
