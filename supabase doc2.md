Import data into Supabase

You can import data into Supabase in multiple ways. The best method depends on your data size and app requirements.

If you're working with small datasets in development, you can experiment quickly using CSV import in the Supabase dashboard. If you're working with a large dataset in production, you should plan your data import to minimize app latency and ensure data integrity.

How to import data into Supabase#
You have multiple options for importing your data into Supabase:

CSV import via the Supabase dashboard
Bulk import using pgloader
Using the Postgres COPY command
Using the Supabase API
If you're importing a large dataset or importing data into production, plan ahead and prepare your database.

Option 1: CSV import via Supabase dashboard#
Supabase dashboard provides a user-friendly way to import data. However, for very large datasets, this method may not be the most efficient choice, given the size limit is 100MB. It's generally better suited for smaller datasets and quick data imports. Consider using alternative methods like pgloader for large-scale data imports.

Navigate to the relevant table in the Table Editor.
Click on “Insert” then choose "Import Data from CSV" and follow the on-screen instructions to upload your CSV file.
Option 2: Bulk import using pgloader#
pgloader is a powerful tool for efficiently importing data into a Postgres database that supports a wide range of source database engines, including MySQL and MS SQL.

You can use it in conjunction with Supabase by following these steps:

Install pgloader on your local machine or a server. For more info, you can refer to the official pgloader installation page.

$ apt-get install pgloader

Create a configuration file that specifies the source data and the target Supabase database (e.g., config.load).
Here's an example configuration file:

LOAD DATABASE
FROM sourcedb://USER:PASSWORD@HOST/SOURCE_DB
INTO postgres://postgres.xxxx:password@xxxx.pooler.supabase.com:6543/postgres
ALTER SCHEMA 'public' OWNER TO 'postgres';
set wal_buffers = '64MB', max_wal_senders = 0, statement_timeout = 0, work_mem to '2GB';

Customize the source and Supabase database URL and options to fit your specific use case:

wal_buffers: This parameter is set to '64MB' to allocate 64 megabytes of memory for write-ahead logging buffers. A larger value can help improve write performance by caching more data in memory before writing it to disk. This can be useful during data import operations to speed up the writing of transaction logs.
max_wal_senders: It is set to 0, to disable replication connections. This is done during the data import process to prevent replication-related conflicts and issues.
statement_timeout: The value is set to 0, which means it's disabled, allowing SQL statements to run without a time limit.
work_mem: It is set to '2GB', allocating 2 GB of memory for query operations. This enhances the performance of complex queries by allowing larger in-memory datasets.
Run pgloader with the configuration file.

pgloader config.load

For databases using the Postgres engine, we recommend using the pg_dump and psql command line tools.

Option 3: Using Postgres copy command#
Read more about Bulk data loading.

Option 4: Using the Supabase API#
The Supabase API allows you to programmatically import data into your tables. You can use various client libraries to interact with the API and perform data import operations. This approach is useful when you need to automate data imports, and it gives you fine-grained control over the process. Refer to our API guide for more details.

When importing data via the Supabase API, it's advisable to refrain from bulk imports. This helps ensure a smooth data transfer process and prevents any potential disruptions.

Read more about Rate Limiting, Resource Allocation, & Abuse Prevention.

Preparing to import data#
Large data imports can affect your database performance. Failed imports can also cause data corruption. Importing data is a safe and common operation, but you should plan ahead if you're importing a lot of data, or if you're working in a production environment.

1. Back up your data#
Backups help you restore your data if something goes wrong. Databases on Pro, Team and Enterprise Plans are automatically backed up on schedule, but you can also take your own backup. See Database Backups for more information.

2. Increase statement timeouts#
By default, Supabase enforces query statement timeouts to ensure fair resource allocation and prevent long-running queries from affecting the overall system. When importing large datasets, you may encounter timeouts. To address this:

Increase the Statement Timeout: You can adjust the statement timeout for your session or connection to accommodate longer-running queries. Be cautious when doing this, as excessively long queries can negatively impact system performance. Read more about Statement Timeouts.
3. Estimate your required disk size#
Large datasets consume disk space. Ensure your Supabase project has sufficient disk capacity to accommodate the imported data. If you know how big your database is going to be, you can manually increase the size in your projects database settings.

Read more about disk management.

4. Disable triggers#
When importing large datasets, it's often beneficial to disable triggers temporarily. Triggers can significantly slow down the import process, especially if they involve complex logic or referential integrity checks. After the import, you can re-enable the triggers.

To disable triggers, use the following SQL commands:

-- Disable triggers on a specific table
ALTER TABLE table_name DISABLE TRIGGER ALL;

-- To re-enable triggers
ALTER TABLE table_name ENABLE TRIGGER ALL;

5. Rebuild indices after data import is complete#
Indexing is crucial for query performance, but building indices while importing a large dataset can be time-consuming. Consider building or rebuilding indices after the data import is complete. This approach can significantly speed up the import process and reduce the overall time required.

To build an index after the data import:

-- Create an index on a table
create index index_name on table_name (column_name);

Read more about Managing Indexes in Postgres.Tables and Data

Tables are where you store your data.

Tables are similar to excel spreadsheets. They contain columns and rows.
For example, this table has 3 "columns" (id, name, description) and 4 "rows" of data:

id name description
1 The Phantom Menace Two Jedi escape a hostile blockade to find allies and come across a young boy who may bring balance to the Force.
2 Attack of the Clones Ten years after the invasion of Naboo, the Galactic Republic is facing a Separatist movement.
3 Revenge of the Sith As Obi-Wan pursues a new threat, Anakin acts as a double agent between the Jedi Council and Palpatine and is lured into a sinister plan to rule the galaxy.
4 Star Wars Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire's world-destroying battle station.
There are a few important differences from a spreadsheet, but it's a good starting point if you're new to Relational databases.

Creating tables#
When creating a table, it's best practice to add columns at the same time.

Tables and columns

You must define the "data type" of each column when it is created. You can add and remove columns at any time after creating a table.

Supabase provides several options for creating tables. You can use the Dashboard or create them directly using SQL.
We provide a SQL editor within the Dashboard, or you can connect to your database
and run the SQL queries yourself.


Dashboard

SQL
Go to the Table Editor page in the Dashboard.
Click New Table and create a table with the name todos.
Click Save.
Click New Column and create a column with the name task and type text.
Click Save.
When naming tables, use lowercase and underscores instead of spaces (e.g., table_name, not Table Name).

Columns#
You must define the "data type" when you create a column.

Data types#
Every column is a predefined type. Postgres provides many default types, and you can even design your own (or use extensions) if the default types don't fit your needs. You can use any data type that Postgres supports via the SQL editor. We only support a subset of these in the Table Editor in an effort to keep the experience simple for people with less experience with databases.

Show/Hide default data types

You can "cast" columns from one type to another, however there can be some incompatibilities between types.
For example, if you cast a timestamp to a date, you will lose all the time information that was previously saved.

Primary keys#
A table can have a "primary key" - a unique identifier for every row of data. A few tips for Primary Keys:

It's recommended to create a Primary Key for every table in your database.
You can use any column as a primary key, as long as it is unique for every row.
It's common to use a uuid type or a numbered identity column as your primary key.
create table movies (
id bigint generated always as identity primary key
);

In the example above, we have:

created a column called id
assigned the data type bigint
instructed the database that this should be generated always as identity, which means that Postgres will automatically assign a unique number to this column.
Because it's unique, we can also use it as our primary key.
We could also use generated by default as identity, which would allow us to insert our own unique values.

create table movies (
id bigint generated by default as identity primary key
);

Loading data#
There are several ways to load data in Supabase. You can load data directly into the database or using the APIs.
Use the "Bulk Loading" instructions if you are loading large data sets.

Basic data loading#

SQL

JavaScript

Dart

Swift

Python

Kotlin
insert into movies
(name, description)
values
(
'The Empire Strikes Back',
'After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda.'
),
(
'Return of the Jedi',
'After a daring mission to rescue Han Solo from Jabba the Hutt, the Rebels dispatch to Endor to destroy the second Death Star.'
);

Bulk data loading#
When inserting large data sets it's best to use PostgreSQL's COPY command.
This loads data directly from a file into a table. There are several file formats available for copying data: text, CSV, binary, JSON, etc.

For example, if you wanted to load a CSV file into your movies table:

./movies.csv

"The Empire Strikes Back", "After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda."
"Return of the Jedi", "After a daring mission to rescue Han Solo from Jabba the Hutt, the Rebels dispatch to Endor to destroy the second Death Star."
You would connect to your database directly and load the file with the COPY command:

psql -h DATABASE_URL -p 5432 -d postgres -U postgres \
-c "\COPY movies FROM './movies.csv';"

Additionally use the DELIMITER, HEADER and FORMAT options as defined in the Postgres COPY docs.

psql -h DATABASE_URL -p 5432 -d postgres -U postgres \
-c "\COPY movies FROM './movies.csv' WITH DELIMITER ',' CSV HEADER"

If you receive an error FATAL: password authentication failed for user "postgres", reset your database password in the Database Settings and try again.

Joining tables with foreign keys#
Tables can be "joined" together using Foreign Keys.

Foreign Keys

This is where the "Relational" naming comes from, as data typically forms some sort of relationship.

In our "movies" example above, we might want to add a "category" for each movie (for example, "Action", or "Documentary").
Let's create a new table called categories and "link" our movies table.

create table categories (
id bigint generated always as identity primary key,
name text -- category name
);

alter table movies
add column category_id bigint references categories;

You can also create "many-to-many" relationships by creating a "join" table.
For example if you had the following situations:

You have a list of movies.
A movie can have several actors.
An actor can perform in several movies.

Dashboard

SQL

Schemas#
Tables belong to schemas. Schemas are a way of organizing your tables, often for security reasons.

Schemas and tables

If you don't explicitly pass a schema when creating a table, Postgres will assume that you want to create the table in the public schema.

We can create schemas for organizing tables. For example, we might want a private schema which is hidden from our API:

create schema private;

Now we can create tables inside the private schema:

create table private.salaries (
id bigint generated by default as identity primary key,
salary bigint not null,
actor_id bigint not null references public.actors
);

Views#
A View is a convenient shortcut to a query. Creating a view does not involve new tables or data. When run, an underlying query is executed, returning its results to the user.

Say we have the following tables from a database of a university:

students

id name type
1 Princess Leia undergraduate
2 Yoda graduate
3 Anakin Skywalker graduate
courses

id title code
1 Introduction to Postgres PG101
2 Authentication Theories AUTH205
3 Fundamentals of Supabase SUP412
grades

id student_id course_id result
1 1 1 B+
2 1 3 A+
3 2 2 A
4 3 1 A-
5 3 2 A
6 3 3 B-
Creating a view consisting of all the three tables will look like this:

create view transcripts as
select
students.name,
students.type,
courses.title,
courses.code,
grades.result
from grades
left join students on grades.student_id = students.id
left join courses on grades.course_id = courses.id;

grant all on table transcripts to authenticated;

Once done, we can now access the underlying query with:

select * from transcripts;

View security#
By default, views are accessed with their creator's permission ("security definer"). If a privileged role creates a view, others accessing it will use that role's elevated permissions. To enforce row level security policies, define the view with the "security invoker" modifier.

-- alter a security_definer view to be security_invoker
alter view <view name>
set (security_invoker = true);

-- create a view with the security_invoker modifier
create view <view name> with(security_invoker=true) as (
select * from <some table>
);

When to use views#
Views provide the several benefits:

Simplicity
Consistency
Logical Organization
Security
Simplicity#
As a query becomes more complex, it can be a hassle to call it over and over - especially when we run it regularly. In the example above, instead of repeatedly running:

select
students.name,
students.type,
courses.title,
courses.code,
grades.result
from
grades
left join students on grades.student_id = students.id
left join courses on grades.course_id = courses.id;

We can run this instead:

select * from transcripts;

Additionally, a view behaves like a typical table. We can safely use it in table JOINs or even create new views using existing views.

Consistency#
Views ensure that the likelihood of mistakes decreases when repeatedly executing a query. In our example above, we may decide that we want to exclude the course Introduction to Postgres. The query would become:

select
students.name,
students.type,
courses.title,
courses.code,
grades.result
from
grades
left join students on grades.student_id = students.id
left join courses on grades.course_id = courses.id
where courses.code != 'PG101';

Without a view, we would need to go into every dependent query to add the new rule. This would increase in the likelihood of errors and inconsistencies, as well as introducing a lot of effort for a developer. With views, we can alter just the underlying query in the view transcripts. The change will be applied to all applications using this view.

Logical organization#
With views, we can give our query a name. This is extremely useful for teams working with the same database. Instead of guessing what a query is supposed to do, a well-named view can explain it. For example, by looking at the name of the view transcripts, we can infer that the underlying query might involve the students, courses, and grades tables.

Security#
Views can restrict the amount and type of data presented to a user. Instead of allowing a user direct access to a set of tables, we provide them a view instead. We can prevent them from reading sensitive columns by excluding them from the underlying query.

Materialized views#
A materialized view is a form of view but it also stores the results to disk. In subsequent reads of a materialized view, the time taken to return its results would be much faster than a conventional view. This is because the data is readily available for a materialized view while the conventional view executes the underlying query each time it is called.

Using our example above, a materialized view can be created like this:

create materialized view transcripts as
select
students.name,
students.type,
courses.title,
courses.code,
grades.result
from
grades
left join students on grades.student_id = students.id
left join courses on grades.course_id = courses.id;

Reading from the materialized view is the same as a conventional view:

select * from transcripts;

Refreshing materialized views#
Unfortunately, there is a trade-off - data in materialized views are not always up to date. We need to refresh it regularly to prevent the data from becoming too stale. To do so:

refresh materialized view transcripts;

It's up to you how regularly refresh your materialized views, and it's probably different for each view depending on its use-case.

Materialized views vs conventional views#
Materialized views are useful when execution times for queries or views are too slow. These could likely occur in views or queries involving multiple tables and billions of rows. When using such a view, however, there should be tolerance towards data being outdated. Some use-cases for materialized views are internal dashboards and analytics.

Creating a materialized view is not a solution to inefficient queries. You should always seek to optimize a slow running query even if you are implementing a materialized view.

Resources#
Official Docs: Create table
Official Docs: Create view
Postgres Tutorial: Create tables
Postgres Tutorial: Add column
Postgres Tutorial: ViewsDatabase
Working with your database (basics)
Working with arrays
Working With Arrays

Postgres supports flexible array types. These arrays are also supported in the Supabase Dashboard and in the JavaScript API.

Create a table with an array column#
Create a test table with a text array (an array of strings):


Dashboard

SQL
Go to the Table editor page in the Dashboard.
Click New Table and create a table with the name arraytest.
Click Save.
Click New Column and create a column with the name textarray, type text, and select Define as array.
Click Save.
Insert a record with an array value#

Dashboard

SQL

JavaScript

Swift

Python
Go to the Table editor page in the Dashboard.
Select the arraytest table.
Click Insert row and add ["Harry", "Larry", "Moe"].
Click Save.
View the results#

Dashboard

SQL
Go to the Table editor page in the Dashboard.
Select the arraytest table.
You should see:

| id | textarray |
| --- | ----------------------- |
| 1 | ["Harry","Larry","Moe"] |

Query array data#
Postgres uses 1-based indexing (e.g., textarray[1] is the first item in the array).


SQL

JavaScript

Swift
To select the first item from the array and get the total length of the array:

SELECT textarray[1], array_length(textarray, 1) FROM arraytest;

returns:

| textarray | array_length |
| --------- | ------------ |
| Harry | 3 |

Resources#
Supabase JS Client
Database
Working with your database (basics)
Managing indexes
Managing Indexes in PostgreSQL

An index makes your Postgres queries faster. The index is like a "table of contents" for your data - a reference list which allows queries to quickly locate a row in a given table without needing to scan the entire table (which in large tables can take a long time).

Indexes can be structured in a few different ways. The type of index chosen depends on the values you are indexing. By far the most common index type, and the default in Postgres, is the B-Tree. A B-Tree is the generalized form of a binary search tree, where nodes can have more than two children.

Even though indexes improve query performance, the Postgres query planner may not always make use of a given index when choosing which optimizations to make. Additionally indexes come with some overhead - additional writes and increased storage - so it's useful to understand how and when to use indexes, if at all.

Create an index#
Let's take an example table:

create table persons (
id bigint generated by default as identity primary key,
age int,
height int,
weight int,
name text,
deceased boolean
);

All the queries in this guide can be run using the SQL Editor in the Supabase Dashboard, or via psql if you're connecting directly to the database.

We might want to frequently query users based on their age:

select name from persons where age = 32;

Without an index, Postgres will scan every row in the table to find equality matches on age.

You can verify this by doing an explain on the query:

explain select name from persons where age = 32;

Outputs:

Seq Scan on persons (cost=0.00..22.75 rows=x width=y)
Filter: (age = 32)

To add a simple B-Tree index you can run:

create index idx_persons_age on persons (age);

It can take a long time to build indexes on large datasets and the default behaviour of create index is to lock the table from writes.

Luckily Postgres provides us with create index concurrently which prevents blocking writes on the table, but does take a bit longer to build.

Here is a simplified diagram of the index we just created (note that in practice, nodes actually have more than two children).

B-Tree index example in Postgres

You can see that in any large data set, traversing the index to locate a given value can be done in much less operations (O(log n)) than compared to scanning the table one value at a time from top to bottom (O(n)).

Partial indexes#
If you are frequently querying a subset of rows then it may be more efficient to build a partial index. In our example, perhaps we only want to match on age where deceased is false. We could build a partial index:

create index idx_living_persons_age on persons (age)
where deceased is false;

Ordering indexes#
By default B-Tree indexes are sorted in ascending order, but sometimes you may want to provide a different ordering. Perhaps our application has a page featuring the top 10 oldest people. Here we would want to sort in descending order, and include NULL values last. For this we can use:

create index idx_persons_age_desc on persons (age desc nulls last);

Reindexing#
After a while indexes can become stale and may need rebuilding. Postgres provides a reindex command for this, but due to Postgres locks being placed on the index during this process, you may want to make use of the concurrent keyword.

reindex index concurrently idx_persons_age;

Alternatively you can reindex all indexes on a particular table:

reindex table concurrently persons;

Take note that reindex can be used inside a transaction, but reindex [index/table] concurrently cannot.

Index Advisor#
Indexes can improve query performance of your tables as they grow. The Supabase Dashboard offers an Index Advisor, which suggests potential indexes to add to your tables.

For more information on the Index Advisor and its suggestions, see the index_advisor extension.

To use the Dashboard Index Advisor:

Go to the Query Performance page.
Click on a query to bring up the Details side panel.
Select the Indexes tab.
Enable Index Advisor if prompted.
Understanding Index Advisor results#
The Indexes tab shows the existing indexes used in the selected query. Note that indexes suggested in the "New Index Recommendations" section may not be used when you create them. Postgres' query planner may intentionally ignore an available index if it determines that the query will be faster without. For example, on a small table, a sequential scan might be faster than an index scan. In that case, the planner will switch to using the index as the table size grows, helping to future proof the query.

If additional indexes might improve your query, the Index Advisor shows the suggested indexes with the estimated improvement in startup and total costs:

Startup cost is the cost to fetch the first row
Total cost is the cost to fetch all the rows
Costs are in arbitrary units, where a single sequential page read costs 1.0 units.

Managing JSON and unstructured data

Using the JSON data type in Postgres.

Postgres supports storing and querying unstructured data.

JSON vs JSONB#
Postgres supports two types of JSON columns: json (stored as a string) and jsonb (stored as a binary). The recommended type is jsonb for almost all cases.

json stores an exact copy of the input text. Database functions must reparse the content on each execution.
jsonb stores database in a decomposed binary format. While this makes it slightly slower to input due to added conversion overhead, it is significantly faster to process, since no reparsing is needed.
When to use JSON/JSONB#
Generally you should use a jsonb column when you have data that is unstructured or has a variable schema. For example, if you wanted to store responses for various webhooks, you might not know the format of the response when creating the table. Instead, you could store the payload as a jsonb object in a single column.

Don't go overboard with json/jsonb columns. They are a useful tool, but most of the benefits of a relational database come from the ability to query and join structured data, and the referential integrity that brings.

Create JSONB columns#
json/jsonb is just another "data type" for Postgres columns. You can create a jsonb column in the same way you would create a text or int column:


SQL

Dashboard
Go to the Table Editor page in the Dashboard.
Click New Table and create a table called books.
Include a primary key with the following properties and click save:
Name: id
Type: int8
Default value: Automatically generate as indentity
title column
Name: title
Type: text
author column
Name: author
Type: text
metadata column
Name: metadata
Type: jsonb
Inserting JSON data#
You can insert JSON data in the same way that you insert any other data. The data must be valid JSON.


SQL

Dashboard

JavaScript

Dart

Swift

Kotlin

Python
Go to the Table Editor page in the Dashboard.
Select the books table in the sidebar.
Click + Insert row and add 5 rows with the following properties:
id title author metadata
1 The Poky Little Puppy Janette Sebring Lowrey json {"ages":[3,6],"price":5.95,"description":"Puppy is slower than other, bigger animals."}
2 The Tale of Peter Rabbit Beatrix Potter json {"ages":[2,5],"price":4.49,"description":"Rabbit eats some vegetables."}
3 Tootle Gertrude Crampton json {"ages":[2,5],"price":3.99,"description":"Little toy train has big dreams."}
4 Green Eggs and Ham Dr. Seuss json {"ages":[4,8],"price":7.49,"description":"Sam has changing food preferences and eats unusually colored food."}
5 Harry Potter and the Goblet of Fire J.K. Rowling json {"ages":[10,99],"price":24.95,"description":"Fourth year of school starts, big drama ensues."}
Query JSON data#
Querying JSON data is similar to querying other data, with a few other features to access nested values.

Postgres support a range of JSON functions and operators. For example, the -> operator returns values as jsonb data. If you want the data returned as text, use the ->> operator.


SQL

JavaScript

Swift

Kotlin

Python

Result
select
title,
metadata ->> 'description' as description, -- returned as text
metadata -> 'price' as price,
metadata -> 'ages' -> 0 as low_age,
metadata -> 'ages' -> 1 as high_age
from books;

Validating JSON data#
Supabase provides the pg_jsonschema extension that adds the ability to validate json and jsonb data types against JSON Schema documents.

Once you have enabled the extension, you can add a "check constraint" to your table to validate the JSON data:

create table customers (
id serial primary key,
metadata json
);

alter table customers
add constraint check_metadata check (
json_matches_schema(
'{
"type": "object",
"properties": {
"tags": {
"type": "array",
"items": {
"type": "string",
"maxLength": 16
}
}
}
}',
metadata
)
);

Resources#
Postgres: JSON Functions and Operators
Database Functions

Postgres has built-in support for SQL functions.
These functions live inside your database, and they can be used with the API.

Quick demo#

Getting started#
Supabase provides several options for creating database functions. You can use the Dashboard or create them directly using SQL.
We provide a SQL editor within the Dashboard, or you can connect to your database
and run the SQL queries yourself.

Go to the "SQL editor" section.
Click "New Query".
Enter the SQL to create or replace your Database function.
Click "Run" or cmd+enter (ctrl+enter).
Simple functions#
Let's create a basic Database Function which returns a string "hello world".

create or replace function hello_world() -- 1
returns text -- 2
language sql -- 3
as $$ -- 4
select 'hello world'; -- 5
$$; --6

Show/Hide Details

After the Function is created, we have several ways of "executing" the function - either directly inside the database using SQL, or with one of the client libraries.


SQL

JavaScript

Dart

Swift

Kotlin

Python
select hello_world();

Returning data sets#
Database Functions can also return data sets from Tables or Views.

For example, if we had a database with some Star Wars data inside:


Data

SQL
Planets
| id | name |
| --- | -------- |
| 1 | Tatooine |
| 2 | Alderaan |
| 3 | Kashyyyk |

People
| id | name | planet_id |
| --- | ---------------- | --------- |
| 1 | Anakin Skywalker | 1 |
| 2 | Luke Skywalker | 1 |
| 3 | Princess Leia | 2 |
| 4 | Chewbacca | 3 |

We could create a function which returns all the planets:

create or replace function get_planets()
returns setof planets
language sql
as $$
select * from planets;
$$;

Because this function returns a table set, we can also apply filters and selectors. For example, if we only wanted the first planet:


SQL

JavaScript

Dart

Swift

Kotlin

Python
select *
from get_planets()
where id = 1;

Passing parameters#
Let's create a Function to insert a new planet into the planets table and return the new ID. Note that this time we're using the plpgsql language.

create or replace function add_planet(name text)
returns bigint
language plpgsql
as $$
declare
new_row bigint;
begin
insert into planets(name)
values (add_planet.name)
returning id into new_row;

return new_row;
end;
$$;

Once again, you can execute this function either inside your database using a select query, or with the client libraries:


SQL

JavaScript

Dart

Swift

Kotlin

Python
select * from add_planet('Jakku');

Suggestions#
Database Functions vs Edge Functions#
For data-intensive operations, use Database Functions, which are executed within your database
and can be called remotely using the REST and GraphQL API.

For use-cases which require low-latency, use Edge Functions, which are globally-distributed and can be written in Typescript.

Security definer vs invoker#
Postgres allows you to specify whether you want the function to be executed as the user calling the function (invoker), or as the creator of the function (definer). For example:

create function hello_world()
returns text
language plpgsql
security definer set search_path = ''
as $$
begin
select 'hello world';
end;
$$;

It is best practice to use security invoker (which is also the default). If you ever use security definer, you must set the search_path.
This limits the potential damage if you allow access to schemas which the user executing the function should not have.

Function privileges#
By default, database functions can be executed by any role. There are two main ways to restrict this:

On a case-by-case basis. Specifically revoke permissions for functions you want to protect. Execution needs to be revoked for both public and the role you're restricting:

revoke execute on function public.hello_world from public;
revoke execute on function public.hello_world from anon;

Restrict function execution by default. Specifically grant access when you want a function to be executable by a specific role.

To restrict all existing functions, revoke execution permissions from both public and the role you want to restrict:

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon, authenticated;

To restrict all new functions, change the default privileges for both public and the role you want to restrict:

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

You can then regrant permissions for a specific function to a specific role:

grant execute on function public.hello_world to authenticated;

Debugging functions#
You can add logs to help you debug functions. This is especially recommended for complex functions.

Good targets to log include:

Values of (non-sensitive) variables
Returned results from queries
General logging#
To create custom logs in the Dashboard's Postgres Logs, you can use the raise keyword. By default, there are 3 observed severity levels:

log
warning
exception (error level)
create function logging_example(
log_message text,
warning_message text,
error_message text
)
returns void
language plpgsql
as $$
begin
raise log 'logging message: %', log_message;
raise warning 'logging warning: %', warning_message;

-- immediately ends function and reverts transaction
raise exception 'logging error: %', error_message;
end;
$$;

select logging_example('LOGGED MESSAGE', 'WARNING MESSAGE', 'ERROR MESSAGE');

Error handling#
You can create custom errors with the raise exception keywords.

A common pattern is to throw an error when a variable doesn't meet a condition:

create or replace function error_if_null(some_val text)
returns text
language plpgsql
as $$
begin
-- error if some_val is null
if some_val is null then
raise exception 'some_val should not be NULL';
end if;
-- return some_val if it is not null
return some_val;
end;
$$;

select error_if_null(null);

Value checking is common, so Postgres provides a shorthand: the assert keyword. It uses the following format:

-- throw error when condition is false
assert <some condition>, 'message';

Below is an example

create function assert_example(name text)
returns uuid
language plpgsql
as $$
declare
student_id uuid;
begin
-- save a user's id into the user_id variable
select
id into student_id
from attendance_table
where student = name;

-- throw an error if the student_id is null
assert student_id is not null, 'assert_example() ERROR: student not found';

-- otherwise, return the user's id
return student_id;
end;
$$;

select assert_example('Harry Potter');

Error messages can also be captured and modified with the exception keyword:

create function error_example()
returns void
language plpgsql
as $$
begin
-- fails: cannot read from nonexistent table
select * from table_that_does_not_exist;

exception
when others then
raise exception 'An error occurred in function <function name>: %', sqlerrm;
end;
$$;

Advanced logging#
For more complex functions or complicated debugging, try logging:

Formatted variables
Individual rows
Start and end of function calls
create or replace function advanced_example(num int default 10)
returns text
language plpgsql
as $$
declare
var1 int := 20;
var2 text;
begin
-- Logging start of function
raise log 'logging start of function call: (%)', (select now());

-- Logging a variable from a SELECT query
select
col_1 into var1
from some_table
limit 1;
raise log 'logging a variable (%)', var1;

-- It is also possible to avoid using variables, by returning the values of your query to the log
raise log 'logging a query with a single return value(%)', (select col_1 from some_table limit 1);

-- If necessary, you can even log an entire row as JSON
raise log 'logging an entire row as JSON (%)', (select to_jsonb(some_table.*) from some_table limit 1);

-- When using INSERT or UPDATE, the new value(s) can be returned
-- into a variable.
-- When using DELETE, the deleted value(s) can be returned.
-- All three operations use "RETURNING value(s) INTO variable(s)" syntax
insert into some_table (col_2)
values ('new val')
returning col_2 into var2;

raise log 'logging a value from an INSERT (%)', var2;

return var1 || ',' || var2;
exception
-- Handle exceptions here if needed
when others then
raise exception 'An error occurred in function <advanced_example>: %', sqlerrm;
end;
$$;

select advanced_example();

Resources#
Official Client libraries: JavaScript and Flutter
Community client libraries: github.com/supabase-community
Postgres Official Docs: Chapter 9. Functions and Operators
Postgres Triggers

Automatically execute SQL on table events.

In Postgres, a trigger executes a set of actions automatically on table events such as INSERTs, UPDATEs, DELETEs, or TRUNCATE operations.

Creating a trigger#
Creating triggers involve 2 parts:

A Function which will be executed (called the Trigger Function)
The actual Trigger object, with parameters around when the trigger should be run.
An example of a trigger is:

create trigger "trigger_name"
after insert on "table_name"
for each row
execute function trigger_function();

Trigger functions#
A trigger function is a user-defined Function that Postgres executes when the trigger is fired.

Example trigger function#
Here is an example that updates salary_log whenever an employee's salary is updated:

-- Example: Update salary_log when salary is updated
create function update_salary_log()
returns trigger
language plpgsql
as $$
begin
insert into salary_log(employee_id, old_salary, new_salary)
values (new.id, old.salary, new.salary);
return new;
end;
$$;

create trigger salary_update_trigger
after update on employees
for each row
execute function update_salary_log();

Trigger variables#
Trigger functions have access to several special variables that provide information about the context of the trigger event and the data being modified. In the example above you can see the values inserted into the salary log are old.salary and new.salary - in this case old specifies the previous values and new specifies the updated values.

Here are some of the key variables and options available within trigger functions:

TG_NAME: The name of the trigger being fired.
TG_WHEN: The timing of the trigger event (BEFORE or AFTER).
TG_OP: The operation that triggered the event (INSERT, UPDATE, DELETE, or TRUNCATE).
OLD: A record variable holding the old row's data in UPDATE and DELETE triggers.
NEW: A record variable holding the new row's data in UPDATE and INSERT triggers.
TG_LEVEL: The trigger level (ROW or STATEMENT), indicating whether the trigger is row-level or statement-level.
TG_RELID: The object ID of the table on which the trigger is being fired.
TG_TABLE_NAME: The name of the table on which the trigger is being fired.
TG_TABLE_SCHEMA: The schema of the table on which the trigger is being fired.
TG_ARGV: An array of string arguments provided when creating the trigger.
TG_NARGS: The number of arguments in the TG_ARGV array.
Types of triggers#
There are two types of trigger, BEFORE and AFTER:

Trigger before changes are made#
Executes before the triggering event.

create trigger before_insert_trigger
before insert on orders
for each row
execute function before_insert_function();

Trigger after changes are made#
Executes after the triggering event.

create trigger after_delete_trigger
after delete on customers
for each row
execute function after_delete_function();

Execution frequency#
There are two options available for executing triggers:

for each row: specifies that the trigger function should be executed once for each affected row.
for each statement: the trigger is executed once for the entire operation (for example, once on insert). This can be more efficient than for each row when dealing with multiple rows affected by a single SQL statement, as they allow you to perform calculations or updates on groups of rows at once.
Dropping a trigger#
You can delete a trigger using the drop trigger command:

drop trigger "trigger_name" on "table_name";

Resources#
Official Postgres Docs: Triggers
Official Postgres Docs: Overview of Trigger Behavior
nnection management

Using your connections resourcefully

Connections#
Every Compute Add-On has a pre-configured direct connection count and Supavisor pool size. This guide discusses ways to observe and manage them resourcefully.

Configuring Supavisor's pool size#
You can change how many database connections Supavisor can manage by altering the pool size in the "Connection pooling configuration" section of the Database Settings:

Connection Info and Certificate.

The general rule is that if you are heavily using the PostgREST database API, you should be conscientious about raising your pool size past 40%. Otherwise, you can commit 80% to the pool. This leaves adequate room for the Authentication server and other utilities.

These numbers are generalizations and depends on other Supabase products that you use and the extent of their usage. The actual values depend on your concurrent peak connection usage. For instance, if you were only using 80 connections in a week period and your database max connections is set to 500, then realistically you could allocate the difference of 420 (minus a reasonable buffer) to service more demand.

Monitoring connections#
Capturing historical usage#
Supabase offers a Grafana Dashboard that records and visualizes over 200 project metrics, including connections. For setup instructions, check the metrics docs.

Its "Client Connections" graph displays connections for both Supavisor and Postgres
client connection graph

Observing live connections#
pg_stat_activity is a special view that keeps track of processes being run by your database, including live connections. It's particularly useful for determining if idle clients are hogging connection slots.

Query to get all live connections:

SELECT
pg_stat_activity.pid as connection_id,
ssl,
datname as database,
usename as connected_role,
application_name,
client_addr as IP,
query,
query_start,
state,
backend_start
FROM pg_stat_ssl
JOIN pg_stat_activity
ON pg_stat_ssl.pid = pg_stat_activity.pid;

Interpreting the query:

Column Description
connection_id connection id
ssl Indicates if SSL is in use
database Name of the connected database (usually postgres)
usename Role of the connected user
application_name Name of the connecting application
client_addr IP address of the connecting server
query Last query executed by the connection
query_start Time when the last query was executed
state Querying state: active or idle
backend_start Timestamp of the connection's establishment
The username can be used to identify the source:

Role API/Tool
supabase_admin Used by Supabase for monitoring and by Realtime
authenticator Data API (PostgREST)
supabase_auth_admin Auth
supabase_storage_admin Storage
supabase_replication_admin Synchronizes Read Replicas
postgres Supabase Dashboard and External Tools (e.g., Prisma, SQLAlchemy, PSQL...)
Custom roles defined by user External Tools (e.g., Prisma, SQLAlchemy, PSQL...)ostgres Roles

Managing access to your Postgres database and configuring permissions.

Postgres manages database access permissions using the concept of roles. Generally you wouldn't use these roles for your own application - they are mostly for configuring system access to your database. If you want to configure application access, then you should use Row Level Security (RLS). You can also implement Role-based Access Control on top of RLS.

Users vs roles#
In Postgres, roles can function as users or groups of users. Users are roles with login privileges, while groups (also known as role groups) are roles that don't have login privileges but can be used to manage permissions for multiple users.

Creating roles#
You can create a role using the create role command:

create role "role_name";

Creating users#
Roles and users are essentially the same in Postgres, however if you want to use password-logins for a specific role, then you can use WITH LOGIN PASSWORD:

create role "role_name" with login password 'extremely_secure_password';

Passwords#
Your Postgres database is the core of your Supabase project, so it's important that every role has a strong, secure password at all times. Here are some tips for creating a secure password:

Use a password manager to generate it.
Make a long password (12 characters at least).
Don't use any common dictionary words.
Use both upper and lower case characters, numbers, and special symbols.
Special symbols in passwords#
If you use special symbols in your Postgres password, you must remember to percent-encode your password later if using the Postgres connection string, for example, postgresql://postgres.projectref:p%3Dword@aws-0-us-east-1.pooler.supabase.com:6543/postgres

Changing your project password#
When you created your project you were also asked to enter a password. This is actually the password for the postgres role in your database. You can update this from the Dashboard under the database settings page. You should never give this to third-party service unless you absolutely trust them. Instead, we recommend that you create a new user for every service that you want to give access too. This will also help you with debugging - you can see every query that each role is executing in your database within pg_stat_statements.

Changing the password does not result in any downtime. All connected services, such as PostgREST, PgBouncer, and other Supabase managed services, are automatically updated to use the latest password to ensure availability. However, if you have any external services connecting to the Supabase database using hardcoded username/password credentials, a manual update will be required.

Granting permissions#
Roles can be granted various permissions on database objects using the GRANT command. Permissions include SELECT, INSERT, UPDATE, and DELETE. You can configure access to almost any object inside your database - including tables, views, functions, and triggers.

Revoking permissions#
Permissions can be revoked using the REVOKE command:

REVOKE permission_type ON object_name FROM role_name;

Role hierarchy#
Roles can be organized in a hierarchy, where one role can inherit permissions from another. This simplifies permission management, as you can define permissions at a higher level and have them automatically apply to all child roles.

Role inheritance#
To create a role hierarchy, you first need to create the parent and child roles. The child role will inherit permissions from its parent. Child roles can be added using the INHERIT option when creating the role:

create role "child_role_name" inherit "parent_role_name";

Preventing inheritance#
In some cases, you might want to prevent a role from having a child relationship (typically superuser roles). You can prevent inheritance relations using NOINHERIT:

alter role "child_role_name" noinherit;

Supabase roles#
Postgres comes with a set of predefined roles. Supabase extends this with a default set of roles which are configured on your database when you start a new project:

postgres#
The default Postgres role. This has admin privileges.

anon#
For unauthenticated, public access. This is the role which the API (PostgREST) will use when a user is not logged in.

authenticator#
A special role for the API (PostgREST). It has very limited access, and is used to validate a JWT and then
"change into" another role determined by the JWT verification.

authenticated#
For "authenticated access." This is the role which the API (PostgREST) will use when a user is logged in.

service_role#
For elevated access. This role is used by the API (PostgREST) to bypass Row Level Security.

supabase_auth_admin#
Used by the Auth middleware to connect to the database and run migration. Access is scoped to the auth schema.

supabase_storage_admin#
Used by the Auth middleware to connect to the database and run migration. Access is scoped to the storage schema.

dashboard_user#
For running commands via the Supabase UI.

supabase_admin#
An internal role Supabase uses for administrative tasks, such as running upgrades and automations.

Resources#
Official Postgres docs: Database Roles
Official Postgres docs: Role Membership
Official Postgres docs: Function Permissions
Local Development & CLI

Learn how to develop locally and use the Supabase CLI

Develop locally while running the Supabase stack on your machine.

Quickstart#
Install the Supabase CLI:


npm

yarn

pnpm

brew
npm install supabase --save-dev

In your repo, initialize the Supabase project:


npm

yarn

pnpm

brew
npx supabase init

Start the Supabase stack:


npm

yarn

pnpm

brew
npx supabase start

View your local Supabase instance at http://localhost:54323.

Local development#
Local development with Supabase allows you to work on your projects in a self-contained environment on your local machine. Working locally has several advantages:

Faster development: You can make changes and see results instantly without waiting for remote deployments.
Offline work: You can continue development even without an internet connection.
Cost-effective: Local development is free and doesn't consume your project's quota.
Enhanced privacy: Sensitive data remains on your local machine during development.
Easy testing: You can experiment with different configurations and features without affecting your production environment.
To get started with local development, you'll need to install the Supabase CLI and Docker. The Supabase CLI allows you to start and manage your local Supabase stack, while Docker is used to run the necessary services.

Once set up, you can initialize a new Supabase project, start the local stack, and begin developing your application using local Supabase services. This includes access to a local Postgres database, Auth, Storage, and other Supabase features.

CLI#
The Supabase CLI is a powerful tool that enables developers to manage their Supabase projects directly from the terminal. It provides a suite of commands for various tasks, including:

Setting up and managing local development environments
Generating TypeScript types for your database schema
Handling database migrations
Managing environment variables and secrets
Deploying your project to the Supabase platform
With the CLI, you can streamline your development workflow, automate repetitive tasks, and maintain consistency across different environments. It's an essential tool for both local development and CI/CD pipelines.

See the CLI Getting Started guide for more information.