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
We (Auto Trader UK, where I work in the infrastructure team) use [GKE (Google Kubernetes Engine)](https://cloud.google.com/kubernetes-engine) to run our application workloads. We use [Google's CloudSQL offering](https://cloud.google.com/sql) to provide developers with relational data stores, such as MySQL and Postgres for their applications to integrate with.

Our in-house abstraction layer atop tools such as Helm, Kubernetes and Isito provides developers with a self-service interface to get an application spun up and deployed to production in minutes without the need to ask for servers to be provisioned, DNS configured and firewalls poked. Equally, our developers don't need to learn all the nuances of the aforementioned cloud technologies and can focus on delivering value in their language of choice.

Applications running within our clusters use [Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) to participate in Identity Access and Management (IAM), this grants the application access to Cloud Storage Buckets and CloudSQL without credentials, meaning no secrets, key rotation and overall improves security. In regards to Postgres, this means that a login role (a role which has the login attribute set) is bound to a [Google Service Account](https://cloud.google.com/iam/docs/service-account-overview), this provides authentication and we can then use Postgres' standard authorisation/permissions model for the rest.

### Provisioning and management
We make heavy use of [CRDs (Custom Resource Definitions)](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) to model processes and infrastructure that is not natively provided by k8s core (or one of the third parties we integrate with, such as Istio) and we recently extended this to include the full provisioning and management of Postgres as a platform feature. Our users can now, from within their application repositories describe:
- The Postgres instance they want, the major version it should be, its size, in terms of CPU and RAM and any flags that need enabling.
- Their database name and any custom roles that should be defined along with the access these roles should ensure (more on this later).
- Users and applications that should have access to the database besides the current workload and what role they should assume.

<custom-element>
    <banner type="error">
        We strongly discourage applications sharing a datastore as a general rule, doing so (generally) creates tight coupling and leads to unexpected interaction, however, we have workloads such as <a href="https://docs.confluent.io/platform/current/connect/index.html#what-is-kafka-connect" target="_blank" rel="noopener">Kafka Connect</a> that fundamentally require it. Some older (pre-cloud) applications were written in a way that requires this access.
  </banner>
</custom-element>

When our custom Kubernetes controller sees that one of these resources has been created, it will act to apply the desired configuration, be this provision a new instance, perform an in-place upgrade or create and configure a database.

We have an opinionated way in which our databases are configured and we allow configuration from users only within the bounds we have set, for example, our controller will create an 'owner' role that the application assumes when it connects, this role has `CREATE` permissions on the database and is expected to be the owner of all objects within, no other role is granted this access. It is the responsibility of the application to create relations (tables, views) etc either in code or by using a technology such as [Flyway](https://flywaydb.org/).

We also opt to never grant permissions directly to login roles themselves, but instead create higher order roles that we dub 'permissions roles', due to them being granted permissions. We then set the [ROLE configuration parameter](https://www.postgresql.org/docs/current/sql-set-role.html) of the login role to this permissions roles name, meaning that on login they will assume that role. This gives us the flexibility of managing users separately from the database (in terms of K8s resources) and also allows us to configure the permissions of groups of users by altering a single role.

### Custom roles
As briefly mentioned, we allow developers to define custom roles that should be created on their database. These roles can then be shared with other workloads (such as Kafka Connectors, Data Importers etc) to allow them restricted access to the database.

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

The above may seem a little verbose, with which I would tend to agree, however, it provides application developers with the power to configure as broad or fine granularity as they desire. In the above example, a role has been defined called `kafka-connect` and it has been given `SELECT` permission on a single table named `outbox` in the `financial_reporting` schema. This role will not be able to access any other database objects or modify the data in the one table it can access.

Not only does providing this level of granularity protect from unexpected actions by the user of the role, either intentional or not, it also provides for clear auditing (in both git and the K8s cluster) of what access has been extended to other workloads. In the above example we can see the role `kafka-connect` has been shared with the workload named `my-kafka-connector` (workloads are one-to-one with namespaces in our clusters and are therefore unique).

### Two problems to overcome
Having such a flexible schema for expressing permissions brings two main challenges that need to be overcome

1. If a role is described that grants to 'all' objects within a schema, how do we ensure the role accrues permissions to new objects created after the granting code has been run?
2. If a role is described that grants to a specific object, how do we account for the fact that it may not yet exist?

Let's explore these two issues...

#### Perpetual permissions
When a developer defines their role and deploys it via their CI/CD pipeline as part of their application release, it is fairly trivial for our code to apply the grants to 'every object' that exists in the specified schema, assuming they have defined a role that should do this. The harder part is keeping this statement true as new objects are created after the fact.

Postgres has a system called [default privileges](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html) which essentially solves the issue above, it allows for describing the permissions that should be granted when new objects are created at either a database or schema level. In terms of this requirement, default privilege is a valid option.

#### An ordering problem
Described in the previous section is a mechanism for defining and sharing custom roles with other workloads, you will note that the example role gave specific access to a single object (table) in a single schema. This is all well and good, assuming that the subject of the grant already exists, if not we would not be able to set up our permissions role.

This posed more of an issue for us than might be immediately obvious, as it seems only logical that users would create tables etc before adding them to a custom role. Ultimately, yes it is logical for this to happen and as a series of events, very may well happen, but one needs to remember the way we are managing the datastore, using a K8s CRD ultimately deployed via helm. This means that as soon as an application's CI/CD pipeline runs it (helm) will create both the applications deployment and the resource representing the database, these will and must be able to handle being applied in any order.

If a developer has a bunch of commits stacked up such as (ordered as a git log, top = latest):
* `da06bf8` Grant access to the orders table to kafka-connect
* `c7662cd` Implement API for handling orders and persisting to the database
* `0f9c839` Add SQL migration script to create new orders table

<br />It's possible and most likely that the database resource will be applied and handled before the application rolls out and creates the table, meaning that when the code creating the role tried to run `GRANT SELECT ON orders TO some_role;` it would have received an error.

There are a few ways to potentially tackle this, some of which might be:
- Document it as a 'known gotcha' and hope that developers will learn to roll out changes in isolation, e.g. add the script to create the table, roll it to prod, then add the grant.
- Make the controller essentially swallow the error and ignore it if the object doesn't exist.
- Teach Postgres how to dynamically assign the permissions.

<br />Spoiler alert, it's the third one that we went with and to which this article pertains! But let's explore those other two.

> Document it as a 'known gotcha' and hope that developers will learn to roll out changes in isolation, e.g. add the script to create the table, roll it to prod, and then add the grant.

Adding documentation for quirks and calling it a day is a last resort option really, at best it's annoying for users to have to remember this gotcha and realistically people will understandably forget.

> Make the controller essentially swallow the error and ignore it if the object doesn't exist.

There are a few issues with this one, but the main one is that unless the spec of the resource changes the controller will not run. Therefore, if the above scenario plays out as described, the grant will not be applied and then will also not try again until another unrelated change to the resource spec is made.

### Event Triggers to the rescue
So how can you grant permissions on an object that doesn't (yet) exist? Well, as far as I know, you cannot. But all hope is not lost, because what if we can somehow hook into the lifecycle (create, update, delete) of objects in the database and run our grants at this point? Luckily Postgres has a mechanism for this, [Event Triggers](https://www.postgresql.org/docs/current/event-trigger-definition.html).

<div class="md:ml-6 bg-base-300 md:bg-transparent">

#### What is an event trigger?
Triggers have long existed on relational databases as a way to hook into DML (Data Manipulation Language) actions such as `INSERT` and `DELETE` on rows in tables for example, however, standard triggers are not able to observe DDL (Data Definition Language) events such as `CREATE` and `DROP`. Postgres' Event Trigger mechanism though is built to facilitate this and allows for the execution of code at either the beginning or end of one of these commands. A function that hooks into these events can observe and even reject the action, making them a powerful tool for restricting actions.

The most common use case for event triggers seems to be for centralised auditing of DDL tracking when, and by whom was a table, view, sequence, etc) created, dropped or modified. Another use case discussed online in various places is around restricting the types of objects that can be created, for example blocking the creation of functions, materialised views etc.

The event trigger function, whether it is invoked at the start or end of the DDL command, is fully involved in the transaction. This means that if an exception is raised at any point, the whole transaction will be aborted and rolled back if required.
</div>

Hopefully, it's becoming clear how we can leverage this to achieve the functionality we desire, granting permissions across the board not only on objects that currently exist but also on ones that do not yet. To quote a popular maxim, it allows us to "kill two birds with one stone" (only metaphorical birds were harmed, don't worry!).

#### Defining the event trigger and function
<custom-element>
    <banner type="warning">
        The functions and procedures that are described in this section will be generated and applied on the fly when the k8s resource is observed. For a single database or manual management, this may be quite hard to maintain and simply be overkill.
  </banner>
</custom-element>

Without further ado, let's have a look at an event trigger based, on the configuration example above:

First, we will define a procedure (a function that doesn't return a value) that will contain all our granting logic, it will take the following arguments:
- `object_id`: The oid of the object that is currently being handled.
- `object_identity`: The identity (schema-qualified name) of the object.
- `object_type`: An enumerable mapping for the type of the object is `RELATION` (Table, View), `SEQUENCE` etc.
- `schema_name`: The name of the schema to which the object belongs.

We will then template our function with the logic that checks if the current object is one we are interested in and if so, applies the grants.
```sql
-- Function to inspect the current object and apply grants upon it if desired.
CREATE OR REPLACE PROCEDURE admin_schema.handle_grants(object_id oid, object_identity text, object_type text, schema_name text)
 LANGUAGE plpgsql
 SET search_path TO 'admin_schema', 'pg_temp'
AS $procedure$
    BEGIN
      IF object_type = 'SCHEMA'
      AND EXISTS (SELECT nspname
                  FROM pg_catalog.pg_namespace
                  WHERE nspname = object_identity
                  AND nspowner::regrole::text = 'owner_role')
      THEN
        EXECUTE format('GRANT USAGE ON SCHEMA %s TO "kafka-connect";', object_identity);
      END IF;
      
      
      IF object_type = 'TABLE' object_identity = 'financial_reporting.outbox' THEN
        EXECUTE format('GRANT SELECT ON %s TO "connect";', object_identity);
      END IF;
    END;
    $procedure$
```

The next thing we need is a function that the event trigger will invoke directly, the shape of this function is rigid in that it must return an `event_trigger` type and also has access to retrieve data about the current invocation of the trigger. The above function could be folded into this, however, to foreshadow slightly, it will be useful to have it separate later...

There are a few interesting things about this function:
- It uses `SECURITY DEFINER` - When a function is invoked in SQL, usually it will be done so acting as the `CURRENT_USER` i.e. the current role that is set for the session. However, it's often necessary to use a function to allow a user to perform elevated actions they could not otherwise perform, without giving them too much power. By creating a function as `SECURITY DEFINER` it means that the function should be executed as the role that owns it, rather than the invoker's role.
- It calls a mystery `pg_event_trigger_ddl_commands()` function and loops through the returned rows. This function returns the 'DDL commands' that caused the event trigger to fire, usually, this will only contain a single row, but certain statements can result in multiple.

<br/> Hopefully the rest is fairly self-explanatory, we loop through all the DDL commands that have happened in the current invocation and call our grant procedure after grouping the DDL commands by their target. I.e. tables, views and materialized views should all be treated as `RELATION`s.

```sql
-- Function to be invoked directly by the event trigger
CREATE OR REPLACE FUNCTION admin_schema.handle_role_grants_event_trigger()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'admin_schema', 'pg_temp'
AS $function$
    DECLARE
        obj RECORD;
    BEGIN
        FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
            LOOP
                IF obj.command_tag IN ('CREATE TABLE', 'CREATE VIEW', 'CREATE MATERIALIZED VIEW', 'CREATE TABLE AS') THEN
                    CALL "admin_schema".handle_grants(obj.objid, obj.object_identity, 'RELATION', obj.schema_name);
                end if;

                IF obj.command_tag = 'CREATE SEQUENCE' THEN
                    CALL "admin_schema".handle_grants(obj.objid, obj.object_identity, 'SEQUENCE', obj.schema_name);
                END IF;

                IF obj.command_tag = 'CREATE SCHEMA' THEN
                    CALL "admin_schema".handle_grants(obj.objid, obj.object_identity, 'SCHEMA', obj.object_identity);
                END IF;
            END LOOP;
    END;
    $function$
```

And finally for all of this to work, we need to define the event trigger and bind it to our function, which thankfully is simple!

Notice in the following snippet that we specify `ddl_command_end`, there are two main points one can hook into:
- `ddl_command_start` - Execute (and wait for) the function **BEFORE** running the DDL itself, inspecting catalogues at this point **will not** show the change as being reflected. This is a good point to perform validation/security checks.
- `ddl_command_end` - Execute (and wait for before committing) **AFTER** running the DDL itself, inspecting catalogues at this point **will** show the change. This is what we want as we need the object to exist to apply grants upon it.

As mentioned earlier, both of these happen within the transactional boundary of the DDL event, so if the function throws (raises an exception) then the whole transaction will be rolled back.

```sql
CREATE EVENT TRIGGER role_grants_event_trigger ON ddl_command_end
    EXECUTE FUNCTION "admin_schema".handle_role_grants_event_trigger();
```

#### Reconciliation
The above section describes how we can set up an event trigger to respond to new objects being created on the database and dynamically grant the appropriate permissions to roles that should have access, however, it's important to also be able to 'reconcile' existing objects on the database and have permissions applied retrospectively.

A few use cases where this is needed:
- The first time the event trigger is added to an existing database.
- If a new object is defined as requiring roles to have access that previously did not.
- Each time the access list is altered either allowing more roles access to an object or changing the permissions an existing one has.
- In the event that something unexpected happened and the grants were not applied.

<br />Essentially, it's going to be important to run a full reconcile each time the spec for the Kubernetes resource changes, this catches all of the above and also will allow for applying changes to the granting logic and having it retrospectively applied.

Rather than maintaining two completely disparate procedures, one for responding to DDL events and one for reconciling existing objects, we can utilise the slightly abstracted procedure (`admin_schema.handle_grants`) that we created above. This ensures that the granting logic is the same no matter which code path triggers it.

This is the final function/procedure, I promise! Here's what it's doing:

**Applying grants**
1. Finding all objects by querying `pg_class`
2. For each object, invoke (call) the `handle_grants` procedure, exactly the same as the event trigger does

**Revoking old grants**
1. Finding all privileges on objects that are in schemas that are owned by the `owner_role` (described in a section above).
2. Loop over each of these privileges (grants)
3. If the grant is still valid, move on, and leave it alone.
4. If the grant is no longer valid, run a `REVOKE`.
```sql
CREATE OR REPLACE PROCEDURE admin_schema.reconcile_role_grants()
 LANGUAGE plpgsql
 SET search_path TO 'admin_schema', 'pg_temp'
AS $procedure$
    DECLARE
        row RECORD;
    BEGIN
        -- Logic for reconciling role grants
        FOR row IN
            SELECT oid,
                   concat(quote_ident(relnamespace::regnamespace::text),
                          '.',
                          quote_ident(relname)
                   ) AS object_identifier,
                   relnamespace::regnamespace::text AS schema,
                   relkind
            FROM pg_catalog.pg_class
        LOOP
            -- relkind - r: Table (Relation), v: View, m: Materialized View
            IF row.relkind IN ('r', 'v', 'm') THEN
              CALL "admin_schema".handle_grants(row.oid, row.object_identifier, 'TABLE', row.schema);
            END IF;

            -- relkind - S: Sequence
            IF row.relkind = 'S' THEN
              CALL "admin_schema".handle_grants(row.oid, row.object_identifier, 'SEQUENCE', row.schema);
            END IF;
        END LOOP;

        FOR row in (SELECT nspname AS schema FROM pg_catalog.pg_namespace)
        LOOP
            CALL "admin_schema".handle_grants(NULL, row.schema, 'SCHEMA', row.schema);
        END LOOP;

        -- Revoke grants that are no longer valid
        FOR row IN
          SELECT *
          FROM (
            SELECT relnamespace::regnamespace::text AS schema,
                   relname AS object_name,
                   (CASE
                      WHEN relkind = 'r' THEN 'TABLE'
                      WHEN relkind = 'v' THEN 'TABLE'
                      WHEN relkind = 'm' THEN 'TABLE'
                      WHEN relkind = 'S' THEN 'SEQUENCE'
                    END) AS object_type,
                   (aclexplode(relacl)).grantee::regrole::text AS grantee,
                   (aclexplode(relacl)).privilege_type::text AS privilege
            FROM pg_class
            WHERE relacl is NOT NULL AND relkind IN ('r', 'v', 'm', 'S')
          ) privileges
          WHERE EXISTS (SELECT nspname
                        FROM pg_catalog.pg_namespace
                        WHERE nspname = schema
                        AND nspowner::regrole::text = 'owner_role')
        LOOP

          IF row.object_type = 'TABLE' AND row.schema = 'financial_reporting' AND row.object_name = 'outbox' AND row.grantee = 'kafka_connect' AND row.privilege = 'SELECT' THEN
            CONTINUE;
          END IF;

          EXECUTE format('REVOKE %s ON %s FROM %s;',
                          row.privilege,
                          concat(quote_ident(row.schema), '.', quote_ident(row.object_name)),
                          quote_ident(row.grantee));
        END LOOP;
    END;
    $procedure$
```

### Conclusion
The functions and procedures that have been shown in this post are very much an MVP of what gets applied to the databases that are being managed by this mechanism, but hopefully, this has shown how it all fits together and provided a base for anyone wishing to do similar.

As mentioned earlier in the post, we have an opinionated way that our databases should broadly look and therefore can do things like scope to things owned by the 'owner role', not everyone will be in this position.

It'd be interesting to hear any thoughts on what we are doing here and how others have solved similar issues, especially when trying to fully automate database provisioning and management.

Further reading:
- The [official Postgres documentation on event triggers](https://www.postgresql.org/docs/current/functions-event-triggers.html), is both useful and also infuriatingly vague in parts.
- An [interesting and informative post](https://www.cybertec-postgresql.com/en/abusing-security-definer-functions/) by Laurenz Albe on how `SECURITY DEFINER` functions can be abused and the steps to take to secure them. Some of which you will see reflected in the above examples (e.g. setting the `search_path`).
