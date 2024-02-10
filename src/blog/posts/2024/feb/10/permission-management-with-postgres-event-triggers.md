---
layout: layouts/post.njk
title: 'Managing permissions with Postgres event triggers'
synopsis: How event triggers can be used to provide a flexible mechanism for permissions management at scale.
image: 
  path: blog/posts/blog14.webp
  alt: Photo depicting an elephant squirting water from its trunk.
  caption: Photo by <a href="https://unsplash.com/@geraninmo?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Geranimo</a> on <a href="https://unsplash.com/photos/brown-elephant-standing-on-brown-field-during-daytime-AX9sJ-mPoL4?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash">Unsplash</a>
labels:
  - Postgres
  - Event Triggers
  - Kubernetes
  - Self Service
  - CloudSQL
date: 2024-02-10
draft: true
---

### Setting the scene
We (Auto Trader UK, where I work in the infrastructure team) use [GKE (Google Kubernetes Engine)](https://cloud.google.com/kubernetes-engine) to run our application workloads. We use [Google's CloudSQL offering](https://cloud.google.com/sql) to provide developers relational data-stores, such as MySQL and Postgres for their applications to integrate with.

Our in-house abstraction layer atop of tools such as Helm, Kubernetes and Isito provides developers a self-service interface to get an application spun up and deployed to production in minutes without the need to ask for servers to be provisioned, DNS configured and firewalls poked. Equally, our developers don't need to learn all the nuances of the aforementioned cloud technologies and can focus on delivering value in their language of choice.

Applications running within our clusters use [Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) in order to participate in Identity Access and Management (IAM), this grants the application access to Cloud Storage Buckets and CloudSQL without credentials, meaning no secrets, key rotation and overall improves security. In regards to postgres, this means that a login role (a role which has the login attribute set) is bound to a [Google Service Account](https://cloud.google.com/iam/docs/service-account-overview), this provides authentication and we can then use Postgres' standard authorisation/permissions model for the rest.

### Provisioning and management
We make heavy use of [CRDs (Custom Resource Definitions)](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) in order to model processes and infrastructure that is not natively provided by k8s core (or one of the third parties we integrate with, such as Istio) and we recently extended this to include the full provisioning and management of Postgres as a platform feature. Our users can now, from within their application repositories describe:
- The Postgres instance they want, the major version it should be, it's size in terms of CPU and RAM and any flags that need enabling.
- Their database name and any custom roles that should be defined along with the access these roles should ensure (more on this later).
- Users and applications that should have access to the database besides the current workload and what role they should assume.

<custom-element>
    <banner type="error">
        We strongly discourage applications sharing a datastore as a general rule, doing so (generally) creates tight coupling and leads to unexpected interaction, however we have workloads such as <a href="https://docs.confluent.io/platform/current/connect/index.html#what-is-kafka-connect" target="_blank" rel="noopener">Kafka Connect</a> that fundamentally require it. There are also some older (pre-cloud) applications that were written in a way that requires this access.
  </banner>
</custom-element>

When our custom Kubernetes controller sees that one of these resources has been created, it will act to apply the desired configuration, be this provision a new instance, perform an in-place upgrade or create and configure a database. 

We have an opinionated way in which our databases are configured and we allow configuration from users only within the bounds we have set, for example our controller will create an 'owner' role that the application assumes when it connects, this role has `CREATE` permissions on the database and is expected to be owner of all objects within, no other role is granted this access. It is the responsibility of the application to create relations (tables, views) etc either in code or by using a technology such as [Flyway](https://flywaydb.org/).

We also opt to never grant permissions directly to login roles themselves, but instead create higher order roles that we dub 'permissions roles', due to them being granted permissions. We then set the [ROLE configuration parameter](https://www.postgresql.org/docs/current/sql-set-role.html) of the login role to this permissions roles name, meaning that on login they will assume that role. This gives us the flexibility of managing users separately from the database (in terms of K8s resources) and also allows us to configure the permissions of groups of users by altering a single role.

### Custom roles
As briefly mentioned, we allow developers to define custom roles that should be created on their database. These roles can then be shared with other workloads (such as Kafka Connectors, Data Importers etc) in order to allow them restricted access to the database. 

A custom role definition that a developer may define for a Kafka Connector, might look like this:

```yaml
postgres:
  databases:
    myDatabase:
      name: my_awesome_database
      instance: some_instance
      roles:
        kafka-connect:
          permissions:
            perSchema:
              financial_reporting:
                specific:
                  tables:
                    outbox:
                      - SELECT
        sharedWith:
          'my-kafka-connector':
            roles:
              - 'kafka-connect'
          
```

The above may seem a little verbose, I tend to agree, however it provides application developers with the power to configure as broad or fine granularity as they desire. In the above example a role has been defined called `kafka-connect` and it has been given `SELECT` permission on a single table named `outbox` in the `financial_reporting` schema. This role will not be able to access any other database objects, or modify the data in the one table it can access.

Not only does providing this level of granularity protect from unexpected actions by the user of the role, either intentional or not, it also provides for clear auditing (in both git and the K8s cluster) of what access has been extended to other workloads. In the above example we can see the role `kafka-connect` has been shared with the workload named `my-kafka-connector` (workloads are one to one with namespaces in our clusters and are therefore unique).

### An ordering problem
Described in the previous section is a mechanism for defining and sharing custom roles with other workloads, you will note that the example role gave specific access to a single object (table) in a single schema. This is all well and good, assuming that the subject of the grant already exists, if not we would not be able to set up our permissions role.

This posed more of an issue for us than might be immediately obvious, as it seems only logical that users would create tables etc before adding them to a custom role. Ultimately, yes it is logical for this to happen and as a series of events, very may well happen, but one needs to remember the way we are managing the datastore, using a K8s CRD ultimately deployed via helm. This means that as soon as an applications CI/CD pipeline runs it (helm) will create both the applications deployment and the resource representing the database, these will and must be able to handle being applied in any order.

If a developer has a bunch of commits stacked up such as (ordered as a git log, top = latest):
* `da06bf8` Grant access to orders table to kafka-connect
* `c7662cd` Implement API for handling orders and persisting to the database
* `0f9c839` Add SQL migration script to create new orders table 

<br />It's possible and most likely that the database resource will be applied and handled before the application rolls out and creates the table, meaning that when the code creating the role tried to run `GRANT SELECT ON orders TO some_role;` it would have received an error.

There are a few ways to potentially tackle this, some of which might be:
- Document it as a 'known gotcha' and hope that developers will learn to roll out changes in isolation, e.g. add the script to create the table, roll it to prod, then add the grant.
- Make the controller essentially swallow the error and ignore it if the object doesn't exist.
- Somehow hook into the creation of database objects and handle grants on the fly.

<br />Spoiler alert, it's the third one that we went with and this article pertains to! But let's explore those other two.

> Document it as a 'known gotcha' and hope that developers will learn to roll out changes in isolation, e.g. add the script to create the table, roll it to prod, then add the grant.

Adding documentation for quirks and calling it a day is a last resort option really, at best it's annoying for users to have to remember this gotcha and realistically people will understandably forget.

> Make the controller essentially swallow the error and ignore it if the object doesn't exist.

There are a few issues with this one, but the main one is that unless the spec of the resource changes the controller will not run. Therefore if the above scenario plays out as described, the grant will not be applied and then will also not try again until another unrelated change to the resource spec is made. Horrid.

### Event Triggers to the rescue
