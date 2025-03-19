supabase test
Subcommands
supabase test db
supabase test new
supabase test db
Executes pgTAP tests against the local database.

Requires the local development stack to be started by running supabase start.

Runs pg_prove in a container with unit test files volume mounted from supabase/tests directory. The test file can be suffixed by either .sql or .pg extension.

Since each test is wrapped in its own transaction, it will be individually rolled back regardless of success or failure.

Flags
--db-url <string>
Optional
Tests the database specified by the connection string (must be percent-encoded).

--linked
Optional
Runs pgTAP tests on the linked project.

--local
Optional
Runs pgTAP tests on the local database.

Basic usage
supabase test db

Response
/tmp/supabase/tests/nested/order_test.pg .. ok
/tmp/supabase/tests/pet_test.sql .......... ok
All tests successful.
Files=2, Tests=2,  6 wallclock secs ( 0.03 usr  0.01 sys +  0.05 cusr  0.02 csys =  0.11 CPU)
Result: PASS

supabase test new
Flags
-t, --template <[ pgtap ]>
Optional
Template framework to generate.

supabase gen
Subcommands
supabase gen keys
supabase gen types
supabase gen keys
Flags
--override-name <strings>
Optional
Override specific variable names.

--project-ref <string>
Optional
Project ref of the Supabase project.

--experimental
Required
enable experimental features

supabase gen types
Flags
--db-url <string>
Optional
Generate types from a database url.

--lang <[ typescript | go | swift ]>
Optional
Output language of the generated types.

--linked
Optional
Generate types from the linked project.

--local
Optional
Generate types from the local dev database.

--postgrest-v9-compat
Optional
Generate types compatible with PostgREST v9 and below. Only use together with --db-url.

--project-id <string>
Optional
Generate types from a project ID.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

--swift-access-control <[ internal | public ]>
Optional
Access control for Swift generated types.

supabase db
Subcommands
supabase db diff
supabase db dump
supabase db lint
supabase db pull
supabase db push
supabase db reset
supabase db start
supabase db pull
Pulls schema changes from a remote database. A new migration file will be created under supabase/migrations directory.

Requires your local project to be linked to a remote database by running supabase link. For self-hosted databases, you can pass in the connection parameters using --db-url flag.

Optionally, a new row can be inserted into the migration history table to reflect the current state of the remote database.

If no entries exist in the migration history table, pg_dump will be used to capture all contents of the remote schemas you have created. Otherwise, this command will only diff schema changes against the remote database, similar to running db diff --linked.

Flags
--db-url <string>
Optional
Pulls from the database specified by the connection string (must be percent-encoded).

--linked
Optional
Pulls from the linked project.

--local
Optional
Pulls from the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

Basic usage
Local studio
Custom schemas
supabase db pull

Response
Connecting to remote database...
Schema written to supabase/migrations/20240414044403_remote_schema.sql
Update remote migration history table? [Y/n]
Repaired migration history: [20240414044403] => applied
Finished supabase db pull.
The auth and storage schemas are excluded. Run supabase db pull --schema auth,storage again to diff them.

supabase db push
Pushes all local migrations to a remote database.

Requires your local project to be linked to a remote database by running supabase link. For self-hosted databases, you can pass in the connection parameters using --db-url flag.

The first time this command is run, a migration history table will be created under supabase_migrations.schema_migrations. After successfully applying a migration, a new row will be inserted into the migration history table with timestamp as its unique id. Subsequent pushes will skip migrations that have already been applied.

If you need to mutate the migration history table, such as deleting existing entries or inserting new entries without actually running the migration, use the migration repair command.

Use the --dry-run flag to view the list of changes before applying.

Flags
--db-url <string>
Optional
Pushes to the database specified by the connection string (must be percent-encoded).

--dry-run
Optional
Print the migrations that would be applied, but don't actually apply them.

--include-all
Optional
Include all migrations not found on remote history table.

--include-roles
Optional
Include custom roles from supabase/roles.sql.

--include-seed
Optional
Include seed data from your config.

--linked
Optional
Pushes to the linked project.

--local
Optional
Pushes to the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

Basic usage
Self hosted
Dry run
supabase db push

Response
Linked project is up to date.

supabase db reset
Resets the local database to a clean state.

Requires the local development stack to be started by running supabase start.

Recreates the local Postgres container and applies all local migrations found in supabase/migrations directory. If test data is defined in supabase/seed.sql, it will be seeded after the migrations are run. Any other data or schema changes made during local development will be discarded.

When running db reset with --linked or --db-url flag, a SQL script is executed to identify and drop all user created entities in the remote database. Since Postgres roles are cluster level entities, any custom roles created through the dashboard or supabase/roles.sql will not be deleted by remote reset.

Flags
--db-url <string>
Optional
Resets the database specified by the connection string (must be percent-encoded).

--linked
Optional
Resets the linked project with local migrations.

--local
Optional
Resets the local database with local migrations.

--no-seed
Optional
Skip running the seed script after reset.

--version <string>
Optional
Reset up to the specified version.

Basic usage
supabase db reset

Response
Resetting database...
Initializing schema...
Applying migration 20220810154537_create_employees_table.sql...
Seeding data supabase/seed.sql...
Finished supabase db reset on branch main.

supabase db dump
Dumps contents from a remote database.

Requires your local project to be linked to a remote database by running supabase link. For self-hosted databases, you can pass in the connection parameters using --db-url flag.

Runs pg_dump in a container with additional flags to exclude Supabase managed schemas. The ignored schemas include auth, storage, and those created by extensions.

The default dump does not contain any data or custom roles. To dump those contents explicitly, specify either the --data-only and --role-only flag.

Flags
--data-only
Optional
Dumps only data records.

--db-url <string>
Optional
Dumps from the database specified by the connection string (must be percent-encoded).

--dry-run
Optional
Prints the pg_dump script that would be executed.

-x, --exclude <strings>
Optional
List of schema.tables to exclude from data-only dump.

-f, --file <string>
Optional
File path to save the dumped contents.

--keep-comments
Optional
Keeps commented lines from pg_dump output.

--linked
Optional
Dumps from the linked project.

--local
Optional
Dumps from the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

--role-only
Optional
Dumps only cluster roles.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

--use-copy
Optional
Uses copy statements in place of inserts.

Basic usage
Role only
Data only
supabase db dump -f supabase/schema.sql

Response
Dumping schemas from remote database...
Dumped schema to supabase/schema.sql.

supabase db diff
Diffs schema changes made to the local or remote database.

Requires the local development stack to be running when diffing against the local database. To diff against a remote or self-hosted database, specify the --linked or --db-url flag respectively.

Runs djrobstep/migra in a container to compare schema differences between the target database and a shadow database. The shadow database is created by applying migrations in local supabase/migrations directory in a separate container. Output is written to stdout by default. For convenience, you can also save the schema diff as a new migration file by passing in -f flag.

By default, all schemas in the target database are diffed. Use the --schema public,extensions flag to restrict diffing to a subset of schemas.

While the diff command is able to capture most schema changes, there are cases where it is known to fail. Currently, this could happen if you schema contains:

Changes to publication
Changes to storage buckets
Views with security_invoker attributes
Flags
--db-url <string>
Optional
Diffs against the database specified by the connection string (must be percent-encoded).

-f, --file <string>
Optional
Saves schema diff to a new migration file.

--linked
Optional
Diffs local migration files against the linked project.

--local
Optional
Diffs local migration files against the local database.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

--use-migra
Optional
Use migra to generate schema diff.

--use-pg-schema
Optional
Use pg-schema-diff to generate schema diff.

--use-pgadmin
Optional
Use pgAdmin to generate schema diff.

Basic usage
Against linked project
For a specific schema
supabase db diff -f my_table

Response
Connecting to local database...
Creating shadow database...
Applying migration 20230425064254_remote_commit.sql...
Diffing schemas: auth,extensions,public,storage
Finished supabase db diff on branch main.

No schema changes found

supabase db lint
Lints local database for schema errors.

Requires the local development stack to be running when linting against the local database. To lint against a remote or self-hosted database, specify the --linked or --db-url flag respectively.

Runs plpgsql_check extension in the local Postgres container to check for errors in all schemas. The default lint level is warning and can be raised to error via the --level flag.

To lint against specific schemas only, pass in the --schema flag.

The --fail-on flag can be used to control when the command should exit with a non-zero status code. The possible values are:

none (default): Always exit with a zero status code, regardless of lint results.
warning: Exit with a non-zero status code if any warnings or errors are found.
error: Exit with a non-zero status code only if errors are found.
This flag is particularly useful in CI/CD pipelines where you want to fail the build based on certain lint conditions.

Flags
--db-url <string>
Optional
Lints the database specified by the connection string (must be percent-encoded).

--fail-on <[ none | warning | error ]>
Optional
Error level to exit with non-zero status.

--level <[ warning | error ]>
Optional
Error level to emit.

--linked
Optional
Lints the linked project for schema errors.

--local
Optional
Lints the local database for schema errors.

-s, --schema <strings>
Optional
Comma separated list of schema to include.

Basic usage
Warnings for a specific schema
supabase db lint

Response
Linting schema: public

No schema errors found

supabase db start
Flags
--from-backup <string>
Optional
Path to a logical backup file.

supabase migration
Subcommands
supabase migration fetch
supabase migration list
supabase migration new
supabase migration repair
supabase migration squash
supabase migration up
supabase migration new
Creates a new migration file locally.

A supabase/migrations directory will be created if it does not already exists in your current workdir. All schema migration files must be created in this directory following the pattern <timestamp>_<name>.sql.

Outputs from other commands like db diff may be piped to migration new <name> via stdin.

Basic usage
With statements piped from stdin
supabase migration new schema_test

Response
Created new migration at supabase/migrations/20230306095710_schema_test.sql.

supabase migration list
Lists migration history in both local and remote databases.

Requires your local project to be linked to a remote database by running supabase link. For self-hosted databases, you can pass in the connection parameters using --db-url flag.

Note that URL strings must be escaped according to RFC 3986.

Local migrations are stored in supabase/migrations directory while remote migrations are tracked in supabase_migrations.schema_migrations table. Only the timestamps are compared to identify any differences.

In case of discrepancies between the local and remote migration history, you can resolve them using the migration repair command.

Flags
--db-url <string>
Optional
Lists migrations of the database specified by the connection string (must be percent-encoded).

--linked
Optional
Lists migrations applied to the linked project.

--local
Optional
Lists migrations applied to the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

Basic usage
Connect to self-hosted database
supabase migration list

Response
      LOCAL      │     REMOTE     │     TIME (UTC)
─────────────────┼────────────────┼──────────────────────
                 │ 20230103054303 │ 2023-01-03 05:43:03
                 │ 20230103093141 │ 2023-01-03 09:31:41
  20230222032233 │                │ 2023-02-22 03:22:33

supabase migration fetch
Flags
--db-url <string>
Optional
Fetches migrations from the database specified by the connection string (must be percent-encoded).

--linked
Optional
Fetches migration history from the linked project.

--local
Optional
Fetches migration history from the local database.

supabase migration repair
Repairs the remote migration history table.

Requires your local project to be linked to a remote database by running supabase link.

If your local and remote migration history goes out of sync, you can repair the remote history by marking specific migrations as --status applied or --status reverted. Marking as reverted will delete an existing record from the migration history table while marking as applied will insert a new record.

For example, your migration history may look like the table below, with missing entries in either local or remote.

$ supabase migration list
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
                   │ 20230103054303 │ 2023-01-03 05:43:03
   20230103054315  │                │ 2023-01-03 05:43:15
To reset your migration history to a clean state, first delete your local migration file.

$ rm supabase/migrations/20230103054315_remote_commit.sql

$ supabase migration list
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
                   │ 20230103054303 │ 2023-01-03 05:43:03
Then mark the remote migration 20230103054303 as reverted.

$ supabase migration repair 20230103054303 --status reverted
Connecting to remote database...
Repaired migration history: [20220810154537] => reverted
Finished supabase migration repair.

$ supabase migration list
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
Now you can run db pull again to dump the remote schema as a local migration file.

$ supabase db pull
Connecting to remote database...
Schema written to supabase/migrations/20240414044403_remote_schema.sql
Update remote migration history table? [Y/n]
Repaired migration history: [20240414044403] => applied
Finished supabase db pull.

$ supabase migration list
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼──────────────────────
    20240414044403 │ 20240414044403 │ 2024-04-14 04:44:03
Flags
--db-url <string>
Optional
Repairs migrations of the database specified by the connection string (must be percent-encoded).

--linked
Optional
Repairs the migration history of the linked project.

--local
Optional
Repairs the migration history of the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

--status <[ applied | reverted ]>
Required
Version status to update.

Mark a migration as reverted
Mark a migration as applied
supabase migration repair 20230103054303 --status reverted

Response
Repaired migration history: 20230103054303 => reverted

supabase migration squash
Squashes local schema migrations to a single migration file.

The squashed migration is equivalent to a schema only dump of the local database after applying existing migration files. This is especially useful when you want to remove repeated modifications of the same schema from your migration history.

However, one limitation is that data manipulation statements, such as insert, update, or delete, are omitted from the squashed migration. You will have to add them back manually in a new migration file. This includes cron jobs, storage buckets, and any encrypted secrets in vault.

By default, the latest <timestamp>_<name>.sql file will be updated to contain the squashed migration. You can override the target version using the --version <timestamp> flag.

If your supabase/migrations directory is empty, running supabase squash will do nothing.

Flags
--db-url <string>
Optional
Squashes migrations of the database specified by the connection string (must be percent-encoded).

--linked
Optional
Squashes the migration history of the linked project.

--local
Optional
Squashes the migration history of the local database.

-p, --password <string>
Optional
Password to your remote Postgres database.

--version <string>
Optional
Squash up to the specified version.

supabase migration up
Flags
--db-url <string>
Optional
Applies migrations to the database specified by the connection string (must be percent-encoded).

--include-all
Optional
Include all migrations not found on remote history table.

--linked
Optional
Applies pending migrations to the linked project.

--local
Optional
Applies pending migrations to the local database.

supabase seed
Subcommands
supabase seed buckets
supabase seed buckets
Flags
--linked
Optional
Seeds the linked project.

--local
Optional
Seeds the local database.

supabase inspect db
Subcommands
supabase inspect db bloat
supabase inspect db blocking
supabase inspect db cache-hit
supabase inspect db calls
supabase inspect db index-sizes
supabase inspect db index-usage
supabase inspect db locks
supabase inspect db long-running-queries
supabase inspect db outliers
supabase inspect db replication-slots
supabase inspect db role-configs
supabase inspect db role-connections
supabase inspect db seq-scans
supabase inspect db table-index-sizes
supabase inspect db table-record-counts
supabase inspect db table-sizes
supabase inspect db total-index-size
supabase inspect db total-table-sizes
supabase inspect db unused-indexes
supabase inspect db vacuum-stats
supabase inspect db calls
This command is much like the supabase inspect db outliers command, but ordered by the number of times a statement has been called.

You can use this information to see which queries are called most often, which can potentially be good candidates for optimisation.


                        QUERY                      │ TOTAL EXECUTION TIME │ PROPORTION OF TOTAL EXEC TIME │ NUMBER CALLS │  SYNC IO TIME
  ─────────────────────────────────────────────────┼──────────────────────┼───────────────────────────────┼──────────────┼──────────────────
    SELECT * FROM users WHERE id = $1              │ 14:50:11.828939      │ 89.8%                         │  183,389,757 │ 00:00:00.002018
    SELECT * FROM user_events                      │ 01:20:23.466633      │ 1.4%                          │       78,325 │ 00:00:00
    INSERT INTO users (email, name) VALUES ($1, $2)│ 00:40:11.616882      │ 0.8%                          │       54,003 │ 00:00:00.000322

Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db long-running-queries
This command displays currently running queries, that have been running for longer than 5 minutes, descending by duration. Very long running queries can be a source of multiple issues, such as preventing DDL statements completing or vacuum being unable to update relfrozenxid.

  PID  │     DURATION    │                                         QUERY
───────┼─────────────────┼───────────────────────────────────────────────────────────────────────────────────────
 19578 | 02:29:11.200129 | EXPLAIN SELECT  "students".* FROM "students"  WHERE "students"."id" = 1450645 LIMIT 1
 19465 | 02:26:05.542653 | EXPLAIN SELECT  "students".* FROM "students"  WHERE "students"."id" = 1889881 LIMIT 1
 19632 | 02:24:46.962818 | EXPLAIN SELECT  "students".* FROM "students"  WHERE "students"."id" = 1581884 LIMIT 1
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db outliers
This command displays statements, obtained from pg_stat_statements, ordered by the amount of time to execute in aggregate. This includes the statement itself, the total execution time for that statement, the proportion of total execution time for all statements that statement has taken up, the number of times that statement has been called, and the amount of time that statement spent on synchronous I/O (reading/writing from the file system).

Typically, an efficient query will have an appropriate ratio of calls to total execution time, with as little time spent on I/O as possible. Queries that have a high total execution time but low call count should be investigated to improve their performance. Queries that have a high proportion of execution time being spent on synchronous I/O should also be investigated.


                 QUERY                   │ EXECUTION TIME   │ PROPORTION OF EXEC TIME │ NUMBER CALLS │ SYNC IO TIME
─────────────────────────────────────────┼──────────────────┼─────────────────────────┼──────────────┼───────────────
 SELECT * FROM archivable_usage_events.. │ 154:39:26.431466 │ 72.2%                   │ 34,211,877   │ 00:00:00
 COPY public.archivable_usage_events (.. │ 50:38:33.198418  │ 23.6%                   │ 13           │ 13:34:21.00108
 COPY public.usage_events (id, reporte.. │ 02:32:16.335233  │ 1.2%                    │ 13           │ 00:34:19.784318
 INSERT INTO usage_events (id, retaine.. │ 01:42:59.436532  │ 0.8%                    │ 12,328,187   │ 00:00:00
 SELECT * FROM usage_events WHERE (alp.. │ 01:18:10.754354  │ 0.6%                    │ 102,114,301  │ 00:00:00
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db blocking
This command shows you statements that are currently holding locks and blocking, as well as the statement that is being blocked. This can be used in conjunction with inspect db locks to determine which statements need to be terminated in order to resolve lock contention.

    BLOCKED PID │ BLOCKING STATEMENT           │ BLOCKING DURATION │ BLOCKING PID │ BLOCKED STATEMENT                                                                      │ BLOCKED DURATION
  ──────────────┼──────────────────────────────┼───────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────┼───────────────────
    253         │ select count(*) from mytable │ 00:00:03.838314   │        13495 │ UPDATE "mytable" SET "updated_at" = '2023─08─03 14:07:04.746688' WHERE "id" = 83719341 │ 00:00:03.821826
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db locks
This command displays queries that have taken out an exclusive lock on a relation. Exclusive locks typically prevent other operations on that relation from taking place, and can be a cause of "hung" queries that are waiting for a lock to be granted.

If you see a query that is hanging for a very long time or causing blocking issues you may consider killing the query by connecting to the database and running SELECT pg_cancel_backend(PID); to cancel the query. If the query still does not stop you can force a hard stop by running SELECT pg_terminate_backend(PID);

     PID   │ RELNAME │ TRANSACTION ID │ GRANTED │                  QUERY                  │   AGE
  ─────────┼─────────┼────────────────┼─────────┼─────────────────────────────────────────┼───────────
    328112 │ null    │              0 │ t       │ SELECT * FROM logs;                     │ 00:04:20
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db total-index-size
This command displays the total size of all indexes on the database. It is calculated by taking the number of pages (reported in relpages) and multiplying it by the page size (8192 bytes).

    SIZE
  ─────────
    12 MB
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db index-sizes
This command displays the size of each each index in the database. It is calculated by taking the number of pages (reported in relpages) and multiplying it by the page size (8192 bytes).

              NAME              │    SIZE
  ──────────────────────────────┼─────────────
    user_events_index           │ 2082 MB
    job_run_details_pkey        │ 3856 kB
    schema_migrations_pkey      │ 16 kB
    refresh_tokens_token_unique │ 8192 bytes
    users_instance_id_idx       │ 0 bytes
    buckets_pkey                │ 0 bytes
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db index-usage
This command provides information on the efficiency of indexes, represented as what percentage of total scans were index scans. A low percentage can indicate under indexing, or wrong data being indexed.

       TABLE NAME     │ PERCENTAGE OF TIMES INDEX USED │ ROWS IN TABLE
  ────────────────────┼────────────────────────────────┼────────────────
    user_events       │                             99 │       4225318 
    user_feed         │                             99 │       3581573
    unindexed_table   │                              0 │        322911
    job               │                            100 │         33242
    schema_migrations │                             97 │             0
    migrations        │ Insufficient data              │             0
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db unused-indexes
This command displays indexes that have < 50 scans recorded against them, and are greater than 5 pages in size, ordered by size relative to the number of index scans. This command is generally useful for discovering indexes that are unused. Indexes can impact write performance, as well as read performance should they occupy space in memory, its a good idea to remove indexes that are not needed or being used.

        TABLE        │                   INDEX                    │ INDEX SIZE │ INDEX SCANS
─────────────────────┼────────────────────────────────────────────┼────────────┼──────────────
 public.users        │ user_id_created_at_idx                     │ 97 MB      │           0
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db total-table-sizes
This command displays the total size of each table in the database. It is the sum of the values that pg_table_size() and pg_indexes_size() gives for each table. System tables inside pg_catalog and information_schema are not included.

                NAME               │    SIZE
───────────────────────────────────┼─────────────
  job_run_details                  │ 395 MB
  slack_msgs                       │ 648 kB
  emails                           │ 640 kB
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db table-sizes
This command displays the size of each table in the database. It is calculated by using the system administration function pg_table_size(), which includes the size of the main data fork, free space map, visibility map and TOAST data. It does not include the size of the table's indexes.

                  NAME               │    SIZE
  ───────────────────────────────────┼─────────────
    job_run_details                  │ 385 MB
    emails                           │ 584 kB
    job                              │ 40 kB
    sessions                         │ 0 bytes
    prod_resource_notifications_meta │ 0 bytes
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db table-index-sizes
This command displays the total size of indexes for each table. It is calculated by using the system administration function pg_indexes_size().

                 TABLE               │ INDEX SIZE
  ───────────────────────────────────┼─────────────
    job_run_details                  │ 10104 kB
    users                            │ 128 kB
    job                              │ 32 kB
    instances                        │ 8192 bytes
    http_request_queue               │ 0 bytes
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db cache-hit
This command provides information on the efficiency of the buffer cache and how often your queries have to go hit the disk rather than reading from memory. Information on both index reads (index hit rate) as well as table reads (table hit rate) are shown. In general, databases with low cache hit rates perform worse as it is slower to go to disk than retrieve data from memory. If your table hit rate is low, this can indicate that you do not have enough RAM and you may benefit from upgrading to a larger compute addon with more memory. If your index hit rate is low, this may indicate that there is scope to add more appropriate indexes.

The hit rates are calculated as a ratio of number of table or index blocks fetched from the postgres buffer cache against the sum of cached blocks and uncached blocks read from disk.

On smaller compute plans (free, small, medium), a ratio of below 99% can indicate a problem. On larger plans the hit rates may be lower but performance will remain constant as the data may use the OS cache rather than Postgres buffer cache.

         NAME      │  RATIO
  ─────────────────┼───────────
    index hit rate │ 0.996621
    table hit rate │ 0.999341
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db table-record-counts
This command displays an estimated count of rows per table, descending by estimated count. The estimated count is derived from n_live_tup, which is updated by vacuum operations. Due to the way n_live_tup is populated, sparse vs. dense pages can result in estimations that are significantly out from the real count of rows.

       NAME    │ ESTIMATED COUNT
  ─────────────┼──────────────────
    logs       │          322943
    emails     │            1103
    job        │               1
    migrations │               0
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db seq-scans
This command displays the number of sequential scans recorded against all tables, descending by count of sequential scans. Tables that have very high numbers of sequential scans may be underindexed, and it may be worth investigating queries that read from these tables.

                  NAME               │ COUNT
  ───────────────────────────────────┼─────────
    emails                           │ 182435
    users                            │  25063
    job_run_details                  │     60
    schema_migrations                │      0
    migrations                       │      0
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db replication-slots
This command shows information about logical replication slots that are setup on the database. It shows if the slot is active, the state of the WAL sender process ('startup', 'catchup', 'streaming', 'backup', 'stopping') the replication client address and the replication lag in GB.

This command is useful to check that the amount of replication lag is as low as possible, replication lag can occur due to network latency issues, slow disk I/O, long running transactions or lack of ability for the subscriber to consume WAL fast enough.

                       NAME                    │ ACTIVE │ STATE   │ REPLICATION CLIENT ADDRESS │ REPLICATION LAG GB
  ─────────────────────────────────────────────┼────────┼─────────┼────────────────────────────┼─────────────────────
    supabase_realtime_replication_slot         │ t      │ N/A     │ N/A                        │                  0
    datastream                                 │ t      │ catchup │ 24.201.24.106              │                 45
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db role-connections
This command shows the number of active connections for each database roles to see which specific role might be consuming more connections than expected.

This is a Supabase specific command. You can see this breakdown on the dashboard as well:
https://app.supabase.com/project/_/database/roles

The maximum number of active connections depends on your instance size. You can manually overwrite the allowed number of connection but it is not advised.



            ROLE NAME         │ ACTIVE CONNCTION
  ────────────────────────────┼───────────────────
    authenticator             │                5
    postgres                  │                5
    supabase_admin            │                1
    pgbouncer                 │                1
    anon                      │                0
    authenticated             │                0
    service_role              │                0
    dashboard_user            │                0
    supabase_auth_admin       │                0
    supabase_storage_admin    │                0
    supabase_functions_admin  │                0
    pgsodium_keyholder        │                0
    pg_read_all_data          │                0
    pg_write_all_data         │                0
    pg_monitor                │                0

Active connections 12/90

Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db bloat
This command displays an estimation of table "bloat" - Due to Postgres' MVCC when data is updated or deleted new rows are created and old rows are made invisible and marked as "dead tuples". Usually the autovaccum process will asynchronously clean the dead tuples. Sometimes the autovaccum is unable to work fast enough to reduce or prevent tables from becoming bloated. High bloat can slow down queries, cause excessive IOPS and waste space in your database.

Tables with a high bloat ratio should be investigated to see if there are vacuuming is not quick enough or there are other issues.

    TYPE  │ SCHEMA NAME │        OBJECT NAME         │ BLOAT │ WASTE
  ────────┼─────────────┼────────────────────────────┼───────┼─────────────
    table │ public      │ very_bloated_table         │  41.0 │ 700 MB
    table │ public      │ my_table                   │   4.0 │ 76 MB
    table │ public      │ happy_table                │   1.0 │ 1472 kB
    index │ public      │ happy_table::my_nice_index │   0.7 │ 880 kB
Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect db vacuum-stats
This shows you stats about the vacuum activities for each table. Due to Postgres' MVCC when data is updated or deleted new rows are created and old rows are made invisible and marked as "dead tuples". Usually the autovaccum process will aysnchronously clean the dead tuples.

The command lists when the last vacuum and last auto vacuum took place, the row count on the table as well as the count of dead rows and whether autovacuum is expected to run or not. If the number of dead rows is much higher than the row count, or if an autovacuum is expected but has not been performed for some time, this can indicate that autovacuum is not able to keep up and that your vacuum settings need to be tweaked or that you require more compute or disk IOPS to allow autovaccum to complete.

        SCHEMA        │              TABLE               │ LAST VACUUM │ LAST AUTO VACUUM │      ROW COUNT       │ DEAD ROW COUNT │ EXPECT AUTOVACUUM?
──────────────────────┼──────────────────────────────────┼─────────────┼──────────────────┼──────────────────────┼────────────────┼─────────────────────
 auth                 │ users                            │             │ 2023-06-26 12:34 │               18,030 │              0 │ no
 public               │ profiles                         │             │ 2023-06-26 23:45 │               13,420 │             28 │ no
 public               │ logs                             │             │ 2023-06-26 01:23 │            1,313,033 │      3,318,228 │ yes
 storage              │ objects                          │             │                  │             No stats │              0 │ no
 storage              │ buckets                          │             │                  │             No stats │              0 │ no
 supabase_migrations  │ schema_migrations                │             │                  │             No stats │              0 │ no

Flags
--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase inspect report
Flags
--output-dir <string>
Optional
Path to save CSV files in

--db-url <string>
Optional
Inspect the database specified by the connection string (must be percent-encoded).

--linked
Optional
Inspect the linked project.

--local
Optional
Inspect the local database.

supabase orgs
Subcommands
supabase orgs create
supabase orgs list
supabase orgs create
Create an organization for the logged-in user.

supabase orgs list
List all organizations the logged-in user belongs.

supabase projects
Subcommands
supabase projects api-keys
supabase projects create
supabase projects delete
supabase projects list
supabase projects create
Flags
--db-password <string>
Optional
Database password of the project.

--org-id <string>
Optional
Organization ID to create the project in.

--region <string>
Optional
Select a region close to you for the best performance.

--size <string>
Optional
Select a desired instance size for your project.

supabase projects list
List all Supabase projects the logged-in user can access.

supabase projects api-keys
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase projects delete
supabase config
Subcommands
supabase config push
supabase config push
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches
Subcommands
supabase branches create
supabase branches delete
supabase branches disable
supabase branches get
supabase branches list
supabase branches update
supabase branches create
Create a preview branch for the linked project.

Flags
--persistent
Optional
Whether to create a persistent branch.

--region <string>
Optional
Select a region to deploy the branch database.

--size <string>
Optional
Select a desired instance size for the branch database.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches list
List all preview branches of the linked project.

Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches get
Retrieve details of the specified preview branch.

Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches update
Update a preview branch by its name or ID.

Flags
--git-branch <string>
Optional
Change the associated git branch.

--name <string>
Optional
Rename the preview branch.

--persistent
Optional
Switch between ephemeral and persistent branch.

--status <string>
Optional
Override the current branch status.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches delete
Delete a preview branch by its name or ID.

Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase branches disable
Disable preview branching for the linked project.

Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase functions
Subcommands
supabase functions delete
supabase functions deploy
supabase functions download
supabase functions list
supabase functions new
supabase functions serve
supabase functions new
supabase functions list
List all Functions in the linked Supabase project.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase functions download
Download the source code for a Function from the linked Supabase project.

Flags
--legacy-bundle
Optional
Use legacy bundling mechanism.

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase functions serve
Serve all Functions locally.

supabase functions serve command includes additional flags to assist developers in debugging Edge Functions via the v8 inspector protocol, allowing for debugging via Chrome DevTools, VS Code, and IntelliJ IDEA for example. Refer to the docs guide for setup instructions.

--inspect

Alias of --inspect-mode brk.
--inspect-mode [ run | brk | wait ]

Activates the inspector capability.
run mode simply allows a connection without additional behavior. It is not ideal for short scripts, but it can be useful for long-running scripts where you might occasionally want to set breakpoints.
brk mode same as run mode, but additionally sets a breakpoint at the first line to pause script execution before any code runs.
wait mode similar to brk mode, but instead of setting a breakpoint at the first line, it pauses script execution until an inspector session is connected.
--inspect-main

Can only be used when one of the above two flags is enabled.
By default, creating an inspector session for the main worker is not allowed, but this flag allows it.
Other behaviors follow the inspect-mode flag mentioned above.
Additionally, the following properties can be customized via supabase/config.toml under edge_runtime section.

inspector_port
The port used to listen to the Inspector session, defaults to 8083.
policy
A value that indicates how the edge-runtime should forward incoming HTTP requests to the worker.
per_worker allows multiple HTTP requests to be forwarded to a worker that has already been created.
oneshot will force the worker to process a single HTTP request and then exit. (Debugging purpose, This is especially useful if you want to reflect changes you've made immediately.)
Flags
--env-file <string>
Optional
Path to an env file to be populated to the Function environment.

--import-map <string>
Optional
Path to import map file.

--inspect
Optional
Alias of --inspect-mode brk.

--inspect-main
Optional
Allow inspecting the main worker.

--inspect-mode <[ run | brk | wait ]>
Optional
Activate inspector capability for debugging.

--no-verify-jwt
Optional
Disable JWT verification for the Function.

supabase functions deploy
Deploy a Function to the linked Supabase project.

Flags
--import-map <string>
Optional
Path to import map file.

-j, --jobs <uint>
Optional
Maximum number of parallel jobs.

--no-verify-jwt
Optional
Disable JWT verification for the Function.

--project-ref <string>
Optional
Project ref of the Supabase project.

--use-api
Optional
Use Management API to bundle functions.

--use-docker
Optional
Use Docker to bundle functions.

supabase functions delete
Delete a Function from the linked Supabase project. This does NOT remove the Function locally.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase secrets
Subcommands
supabase secrets list
supabase secrets set
supabase secrets unset
supabase secrets set
Set a secret(s) to the linked Supabase project.

Flags
--env-file <string>
Optional
Read secrets from a .env file.

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase secrets list
List all secrets in the linked project.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase secrets unset
Unset a secret(s) from the linked Supabase project.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase storage
Subcommands
supabase storage cp
supabase storage ls
supabase storage mv
supabase storage rm
supabase storage ls
Flags
-r, --recursive
Optional
Recursively list a directory.

--experimental
Required
enable experimental features

--linked
Optional
Connects to Storage API of the linked project.

--local
Optional
Connects to Storage API of the local database.

supabase storage cp
Flags
--cache-control <string>
Optional
Custom Cache-Control header for HTTP upload.

--content-type <string>
Optional
Custom Content-Type header for HTTP upload.

-j, --jobs <uint>
Optional
Maximum number of parallel jobs.

-r, --recursive
Optional
Recursively copy a directory.

--experimental
Required
enable experimental features

--linked
Optional
Connects to Storage API of the linked project.

--local
Optional
Connects to Storage API of the local database.

supabase storage mv
Flags
-r, --recursive
Optional
Recursively move a directory.

--experimental
Required
enable experimental features

--linked
Optional
Connects to Storage API of the linked project.

--local
Optional
Connects to Storage API of the local database.

supabase storage rm
Flags
-r, --recursive
Optional
Recursively remove a directory.

--experimental
Required
enable experimental features

--linked
Optional
Connects to Storage API of the linked project.

--local
Optional
Connects to Storage API of the local database.

supabase encryption
Subcommands
supabase encryption get-root-key
supabase encryption update-root-key
supabase encryption get-root-key
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase encryption update-root-key
Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase sso
Subcommands
supabase sso add
supabase sso info
supabase sso list
supabase sso remove
supabase sso show
supabase sso update
supabase sso add
Add and configure a new connection to a SSO identity provider to your Supabase project.

Flags
--attribute-mapping-file <string>
Optional
File containing a JSON mapping between SAML attributes to custom JWT claims.

--domains <strings>
Optional
Comma separated list of email domains to associate with the added identity provider.

--metadata-file <string>
Optional
File containing a SAML 2.0 Metadata XML document describing the identity provider.

--metadata-url <string>
Optional
URL pointing to a SAML 2.0 Metadata XML document describing the identity provider.

--skip-url-validation
Optional
Whether local validation of the SAML 2.0 Metadata URL should not be performed.

-t, --type <[ saml ]>
Required
Type of identity provider (according to supported protocol).

--project-ref <string>
Optional
Project ref of the Supabase project.

Add with Metadata URL
Add with Metadata File
supabase sso add \
  --project-ref abcdefgijklmnopqrst \
  --type saml \
  --metadata-url 'https://...' \
  --domains company.com

Response
Information about the added identity provider. You can use
company.com as the domain name on the frontend side to initiate a SSO
request to the identity provider.

supabase sso list
List all connections to a SSO identity provider to your Supabase project.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase sso show
Provides the information about an established connection to an identity provider. You can use --metadata to obtain the raw SAML 2.0 Metadata XML document stored in your project's configuration.

Flags
--metadata
Optional
Show SAML 2.0 XML Metadata only

--project-ref <string>
Optional
Project ref of the Supabase project.

Show information
Get raw SAML 2.0 Metadata XML
supabase sso show 6df4d73f-bf21-405f-a084-b11adf19fea5 \
  --project-ref abcdefghijklmnopqrst

Response
Information about the identity provider in pretty output.

supabase sso info
Returns all of the important SSO information necessary for your project to be registered with a SAML 2.0 compatible identity provider.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

Show project information
supabase sso info --project-ref abcdefghijklmnopqrst

Response
Information about your project's SAML 2.0 configuration.

supabase sso update
Update the configuration settings of a already added SSO identity provider.

Flags
--add-domains <strings>
Optional
Add this comma separated list of email domains to the identity provider.

--attribute-mapping-file <string>
Optional
File containing a JSON mapping between SAML attributes to custom JWT claims.

--domains <strings>
Optional
Replace domains with this comma separated list of email domains.

--metadata-file <string>
Optional
File containing a SAML 2.0 Metadata XML document describing the identity provider.

--metadata-url <string>
Optional
URL pointing to a SAML 2.0 Metadata XML document describing the identity provider.

--remove-domains <strings>
Optional
Remove this comma separated list of email domains from the identity provider.

--skip-url-validation
Optional
Whether local validation of the SAML 2.0 Metadata URL should not be performed.

--project-ref <string>
Optional
Project ref of the Supabase project.

Replace domains
Add an additional domain
Remove a domain
supabase sso update 6df4d73f-bf21-405f-a084-b11adf19fea5 \
  --project-ref abcdefghijklmnopqrst \
  --domains new-company.com,new-company.net

Response
Information about the updated provider.

supabase sso remove
Remove a connection to an already added SSO identity provider. Removing the provider will prevent existing users from logging in. Please treat this command with care.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

Remove a provider
supabase sso remove 6df4d73f-bf21-405f-a084-b11adf19fea5 \
  --project-ref abcdefghijklmnopqrst

Response
Information about the removed identity provider. It's a good idea to
save this in case you need it later on.

supabase domains
Manage custom domain names for Supabase projects.

Use of custom domains and vanity subdomains is mutually exclusive.

Subcommands
supabase domains activate
supabase domains create
supabase domains delete
supabase domains get
supabase domains reverify
supabase domains activate
Activates the custom hostname configuration for a project.

This reconfigures your Supabase project to respond to requests on your custom hostname.

After the custom hostname is activated, your project's third-party auth providers will no longer function on the Supabase-provisioned subdomain. Please refer to Prepare to activate your domain section in our documentation to learn more about the steps you need to follow.

Flags
--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase domains create
Create a custom hostname for your Supabase project.

Expects your custom hostname to have a CNAME record to your Supabase project's subdomain.

Flags
--custom-hostname <string>
Optional
The custom hostname to use for your Supabase project.

--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase domains get
Retrieve the custom hostname config for your project, as stored in the Supabase platform.

Flags
--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase domains reverify
Flags
--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase domains delete
Flags
--include-raw-output
Optional
Include raw output (useful for debugging).

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase vanity-subdomains
Manage vanity subdomains for Supabase projects.

Usage of vanity subdomains and custom domains is mutually exclusive.

Subcommands
supabase vanity-subdomains activate
supabase vanity-subdomains check-availability
supabase vanity-subdomains delete
supabase vanity-subdomains get
supabase vanity-subdomains activate
Activate a vanity subdomain for your Supabase project.

This reconfigures your Supabase project to respond to requests on your vanity subdomain.
After the vanity subdomain is activated, your project's auth services will no longer function on the {project-ref}.{supabase-domain} hostname.

Flags
--desired-subdomain <string>
Optional
The desired vanity subdomain to use for your Supabase project.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase vanity-subdomains get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase vanity-subdomains check-availability
Flags
--desired-subdomain <string>
Optional
The desired vanity subdomain to use for your Supabase project.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase vanity-subdomains delete
Deletes the vanity subdomain for a project, and reverts to using the project ref for routing.

Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase network-bans
Network bans are IPs that get temporarily blocked if their traffic pattern looks abusive (e.g. multiple failed auth attempts).

The subcommands help you view the current bans, and unblock IPs if desired.

Subcommands
supabase network-bans get
supabase network-bans remove
supabase network-bans get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase network-bans remove
Flags
--db-unban-ip <strings>
Optional
IP to allow DB connections from.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase network-restrictions
Subcommands
supabase network-restrictions get
supabase network-restrictions update
supabase network-restrictions get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase network-restrictions update
Flags
--bypass-cidr-checks
Optional
Bypass some of the CIDR validation checks.

--db-allow-cidr <strings>
Optional
CIDR to allow DB connections from.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase ssl-enforcement
Subcommands
supabase ssl-enforcement get
supabase ssl-enforcement update
supabase ssl-enforcement get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase ssl-enforcement update
Flags
--disable-db-ssl-enforcement
Optional
Whether the DB should disable SSL enforcement for all external connections.

--enable-db-ssl-enforcement
Optional
Whether the DB should enable SSL enforcement for all external connections.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase postgres-config
Subcommands
supabase postgres-config delete
supabase postgres-config get
supabase postgres-config update
supabase postgres-config get
Flags
--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase postgres-config update
Overriding the default Postgres config could result in unstable database behavior.
Custom configuration also overrides the optimizations generated based on the compute add-ons in use.

Flags
--config <strings>
Optional
Config overrides specified as a 'key=value' pair

--no-restart
Optional
Do not restart the database after updating config.

--replace-existing-overrides
Optional
If true, replaces all existing overrides with the ones provided. If false (default), merges existing overrides with the ones provided.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase postgres-config delete
Delete specific config overrides, reverting them to their default values.

Flags
--config <strings>
Optional
Config keys to delete (comma-separated)

--no-restart
Optional
Do not restart the database after deleting config.

--experimental
Required
enable experimental features

--project-ref <string>
Optional
Project ref of the Supabase project.

supabase snippets
Subcommands
supabase snippets download
supabase snippets list
supabase snippets list
List all SQL snippets of the linked project.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase snippets download
Download contents of the specified SQL snippet.

Flags
--project-ref <string>
Optional
Project ref of the Supabase project.

supabase services
supabase completion
Generate the autocompletion script for supabase for the specified shell.
See each sub-command's help for details on how to use the generated script.

Subcommands
supabase completion bash
supabase completion fish
supabase completion powershell
supabase completion zsh
supabase completion zsh
Generate the autocompletion script for the zsh shell.

If shell completion is not already enabled in your environment you will need
to enable it. You can execute the following once:

echo "autoload -U compinit; compinit" >> ~/.zshrc
To load completions in your current shell session:

source <(supabase completion zsh)
To load completions for every new session, execute once:

Linux:
supabase completion zsh > "${fpath[1]}/_supabase"
macOS:
supabase completion zsh > $(brew --prefix)/share/zsh/site-functions/_supabase
You will need to start a new shell for this setup to take effect.

Flags
--no-descriptions
Optional
disable completion descriptions

supabase completion powershell
Generate the autocompletion script for powershell.

To load completions in your current shell session:

supabase completion powershell | Out-String | Invoke-Expression
To load completions for every new session, add the output of the above command
to your powershell profile.

Flags
--no-descriptions
Optional
disable completion descriptions

supabase completion fish
Generate the autocompletion script for the fish shell.

To load completions in your current shell session:

supabase completion fish | source
To load completions for every new session, execute once:

supabase completion fish > ~/.config/fish/completions/supabase.fish
You will need to start a new shell for this setup to take effect.

Flags
--no-descriptions
Optional
disable completion descriptions

supabase completion bash
Generate the autocompletion script for the bash shell.

This script depends on the 'bash-completion' package.
If it is not installed already, you can install it via your OS's package manager.

To load completions in your current shell session:

source <(supabase completion bash)
To load completions for every new session, execute once:

Linux:
supabase completion bash > /etc/bash_completion.d/supabase
macOS:
supabase completion bash > $(brew --prefix)/etc/bash_completion.d/supabase
You will need to start a new shell for this setup to take effect.