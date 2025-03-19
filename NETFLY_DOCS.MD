with Git

Continuous deployment works by connecting a Git repository to a Netlify site and keeping the two in sync. This is done using the Git provider’s OAuth2 authentication or the Netlify GitHub App.

After you set up Git provider permissions and link a repository, Netlify will run your build command and deploy the result whenever you push to your Git repo. The benefits of Netlify’s continuous deployment include:

No deploying without committing and pushing first
Easy collaboration through pull/merge requests
Fix a typo through your Git provider’s web UI from your mobile
Edit content without code by using a CMS
#Netlify CLI
You can use the CLI to set up continuous deployment for a Git repository. Once continuous deployment is configured, you can update your Production site, staging site, or Deploy Preview with git push.

You can also use the CLI to create manual deploys without continuous deployment. For example, you can deploy directly to your production site from the command line with netlify deploy --prod.



#Drag and drop

You can create a new site by dragging a project folder to the deploy dropzone in Netlify Drop or at the bottom of your team’s Sites page.

If you need to update a site that you created using drag and drop, update and rebuild your project locally. Then, drag the project’s updated output folder to the deploy dropzone at the bottom of the site’s Deploys page. This will start a new site deploy with the updated files. You can also use this functionality to manually update any site that is not connected to a Git repository.

#API endpoints
You can use the API to create deploys manually using a file digest or a ZIP file.

#Deploy to Netlify button
The Deploy to Netlify button helps users deploy new sites from templates with one single click. Web developers can use the button to give their users a one-click way to deploy those applications on Netlify.

It’s designed to be used in README files, documentation sites, and probably anything that renders as an HTML file.

A README.md file that includes the Deploy to Netlify button that readers can use to deploy the examples contained in the repository.

You can find examples of the button in use in the READMEs on our templates.

The template code must be available in a public repository stored on GitHub.com or GitLab.com.

#Markup
You can use any markup language that renders as HTML to display the button. There are two very important URLs that you’ll need:

The SVG URL for the button: https://www.netlify.com/img/deploy/button.svg.

The URL the button takes users to: https://app.netlify.com/start/deploy. This link requires the public Git repository as a parameter, for example:

https://app.netlify.com/start/deploy?repository=https://github.com/netlify/netlify-statuskit

You can make the button clone a whole repository or just a portion of a repository. Both are good options for monorepos but you may need to set a base directory if the button clones the whole repository.

Here is an example of the full Markdown or HTML code for a Deploy to Netlify button that deploys the Netlify StatusKit template:

Markdown
HTML
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify/netlify-statuskit)

If your repository uses extensions built with Netlify's SDK, you can add the URL parameter fullConfiguration=true to make users go through an extra step where they'll be able to install required extensions, choose a site name, and configure their new repository before deploying the site.

#File-based template configuration
You can control some aspects of template configuration directly in the template’s Git repository.

Create a netlify.toml file in the root of the repository, if you don’t have it already. Netlify will read the information from there. If your Deploy to Netlify button clones just a subdirectory of the repository, create the netlify.toml file in that subdirectory so that the file ends up in the root of the cloned repository. This file can also be used to set options for continuous deployment, you can read more about it in the file-based configuration documentation.

Within the [template] section of the netlify.toml, you can set three directives:

A list of incoming hooks for the users site. This is very useful if you want to allow a third party service to control when to deploy the site. This is what headless CMS services like Contentful and DatoCMS do. Users can give those providers the address Netlify generates for their specific incoming requests.

[template]
  incoming-hooks = ["Contentful"]

A list of required environment variables. This is one way to let users set specific configuration options upon deployment. It also enables customization without having to change the code of the base template. If you don’t want to use a netlify.toml file, you can instead use the URL hash to require or even pre-fill environment variables.

[template.environment]
  SECRET_TOKEN = "change me for your secret token"
  CUSTOM_LOGO = "set the url to your custom logo here"

The placeholder strings you set in netlify.toml are used as labels in the UI to provide guidance to users deploying your template.



A list of required extension slugs. Extensions expand the capabilities of a site deployed on Netlify. This is useful if you wish to specify your template depends on specific Netlify extensions to work as expected. If you define required-extensions, users will be prompted to install the extensions, to allow them to get up and running faster. This can be combined with the optional parameter fullConfiguration=true if you wish to force users to install the extension(s) prior to the first deploy of their site.



 [template]
   required-extensions = ["supabase"]

Note that you can’t do the following in this [template] section:

Set values for environment variables. To pre-fill environment variable values, use URL-based template configuration.
Set a base directory for the Deploy to Netlify button. To set a base directory for sites deployed with the button, use the base query parameter instead.
#URL-based template configuration
You can control the following aspects of how the template repo is cloned and how the resulting site is configured by passing values in the Deploy to Netlify URL:

require or set environment variables
set a base directory
clone a subdirectory
deploy a specific branch
#Require or set environment variables
You can require or set environment variables for the site template in the hash of the template’s Deploy to Netlify URL with key/value pairs. Values can be null.

https://app.netlify.com/start/deploy?repository=https://github.com/myworkspace/sweetkittentemplate#SECRET_TOKEN=specialuniquevalue&CUSTOM_LOGO=

Passing environment variable values in the hash ensures that they’re processed on the client side only. You can create custom Deploy to Netlify buttons for your users with tokens and other secure data, and they won’t appear in Netlify logs.

#Set a base directory for monorepos
If your Deploy to Netlify button clones a whole monorepo rather than a single subdirectory, you can use the base query parameter to set an alternate directory as the base directory for deployments. The format is &base=your-base-directory. Note that while Netlify uses the specified base directory for the build and deploy, the entire repo is still cloned to the user’s Git provider account.

For example, here’s a URL with a base directory of blog:

https://app.netlify.com/start/deploy?repository=https://github.com/myworkspace/sweetkittentemplate&base=blog

When someone uses this Deploy to Netlify button, Netlify clones the whole sweetkittentemplate repository to the user’s Git provider account and then builds and deploys from the blog subdirectory.

Note the following limitations:

Template configuration to set incoming hooks and environment variables can only be used at root level and can’t be used for sites with a different base directory. When you set an alternate base directory, the netlify.toml in the base directory will take precedence over the root level configuration for that site’s builds.
#Clone a subdirectory of a repo
To make a Deploy to Netlify button clone just a part of a repo, use the create_from_path query parameter to specify a subdirectory to clone. The format is &create_from_path=your-subdirectory.

For example, here’s a URL with a creation path of examples/hello:

https://app.netlify.com/start/deploy?repository=https://github.com/myworkspace/demos&create_from_path=examples/hello

When someone uses this Deploy to Netlify button, Netlify clones just the subdirectory examples/hello from the demos repo to the user’s Git provider account and then builds and deploys from the root of the cloned repository.

#Deploy a specific branch
To make a Deploy to Netlify button deploy a branch other than the default branch, use the branch query parameter. The format is &branch=your-branch.

For example, here’s a URL that will deploy the beta-feature branch:

https://app.netlify.com/start/deploy?repository=https://github.com/myworkspace/app&branch=beta-feature

When someone uses this Deploy to Netlify button, Netlify sets the new site’s production branch to beta-feature and then builds and deploys from that branch of the cloned repository.

#Define additional instructions
You can define additional configuration instructions in the USAGE.md file, which should be saved in the root of your repository. This can be useful to include guidance on setting up any required third-party service accounts (such as databases, content sources, analytics platforms, or APIs) and provisioning those services. Be sure to mention any necessary extensions or tools that need to be pre-installed to ensure a smooth setup.

When a USAGE.md file is included in the root of the repository, Netlify's app will prompt users to read the additional instructions included in it during the fullConfiguration flow and, after the site has been deployed, in the site overview.

#Build hooks
Build hooks give you unique URLs you can use to trigger new builds and deploys.

#Zapier integrations
Netlify is available on Zapier, where you can connect Netlify with over 1,000 other applications. You can use Zapier “Zaps” to start a new deploy of your site in response to a trigger from another service. You can find out more on our blog, or use one of the templates below to get started:

Start deploys of Netlify sites daily
Netlify + Schedule by Zapier
Use this Zap
Start Netlify deploys when you send new Tweets
Netlify + Twitter
Use this Zap
Start Netlify site deploys with the push of a Flic button
Flic + Netlify
Use this Zap
#n8n integrations
Netlify is available on n8n, an open source tool that allows you to connect Netlify with other applications. By using one of n8n’s Netlify nodes, you can create your own automated workflow. To get started, you can use the Netlify node, Netlify Trigger node, or you can use the existing workflow below:

Deploy site when new content gets added
Netlify node
Use workflow
Last updated: December 16, 2024

Get started with Netlify CLI
Netlify’s command line interface (CLI) lets you configure continuous deployment straight from the command line. You can use Netlify CLI to run a local development server that you can share with others, run a local build and plugins, and deploy your site.

The sections below describe how to perform common tasks with Netlify CLI. You can also access a full command reference online, or get help within Netlify CLI.

#Installation
To install Netlify CLI, make sure you have Node.js version 18.14.0 or later.

Then, run this command from any directory in your terminal:

npm install netlify-cli -g

This installs Netlify CLI globally, so you can run netlify commands from any directory. You can check the version and find out some basic information about the tool with the following command:

netlify

Global versus local

Installing Netlify CLI globally means that your system always has the latest version, including any breaking changes. While global installation is appropriate for initial development and experimentation, for managing builds in a continuous integration (CI) environment, use local CLI installation instead.

#Installation in a CI environment
When using Netlify CLI in a continuous integration (CI) environment such as GitHub Actions, CircleCI, or Travis CI, we recommend installing it locally as a development dependency instead of globally. This binds a specific CLI version to your project repository. To install Netlify CLI locally, run the following command from the root directory of your project:

npm install netlify-cli --save-dev

For CI environments, we also recommend using a lock file to guarantee reproducible builds and relying on an automated tool like renovate or dependabot to manage Netlify CLI version updates.

#Authentication
Netlify CLI uses an access token to authenticate with Netlify. You can obtain this token using the command line or in the Netlify UI.

SAML SSO

If your team requires you to log in with single sign-on (SSO), your tokens will be denied access to the team by default. You can choose to grant access to the team when you obtain a new token. You must be logged in to the team with SSO to grant access to it.

#Obtain a token with the command line
To authenticate and obtain an access token using the command line, enter the following command from any directory:

netlify login

This will open a browser window, asking you to log in with Netlify and grant access to Netlify CLI.



Once authorized, Netlify CLI stores your access token in a config.json global configuration file. The Netlify CLI uses the token in this file automatically for all future commands.

#config.json location
You can find the Netlify CLI global configuration file, config.json, under your user in these OS-specific locations:

macOS: Library/Preferences/netlify/config.json
Linux: .config/netlify/config.json
Windows: AppData\Roaming\netlify\Config\config.json
#Obtain a token in the Netlify UI
You can generate a personal access token (PAT) manually in your Netlify user settings:

Go to Applications > Personal access tokens.
Select New access token.
Enter a descriptive name to help you remember what the token will be used for.
Select Allow access to my SAML-based Netlify team to authorize access to your SAML-based team data through the API.
Select an Expiration date for your token to help keep your information secure.
Select Generate token.
Copy the token to your clipboard and store it in a safe location. Once you navigate away from this page, you won’t be able to access the value again.
Select Done.
Save the token as a NETLIFY_AUTH_TOKEN environment variable in your terminal settings or in the UI of a Continuous Integration (CI) tool.
#Cancel access tokens
To revoke your user access token for Netlify CLI, go to your Netlify user Applications settings. The procedure for revoking access depends on how access was granted.

For access granted using the netlify login command, scroll to the Authorized applications section, and find Netlify CLI. Select Options > Revoke access.
If you manually created a personal access token, you can find it in the Personal access tokens section. Select Options > Delete personal token.
#Usage data collection
By default, Netlify collects data on usage of Netlify CLI commands. We do this to improve the reliability and performance of Netlify CLI, and to help drive new features and improvements.

If you’d like to opt out of sending usage data, you can do so by editing the telemetryDisabled property in the Netlify CLI config.json. You can also do this with the command line:

# opt out of sharing usage data
netlify --telemetry-disable

# allow your usage to help shape development
netlify --telemetry-enable

#Continuous deployment
With continuous deployment, Netlify will automatically deploy new versions of your site when you push commits to your connected Git repository. This also facilitates features like Deploy Previews, branch deploys, and split testing. (Some of these features must be enabled in the Netlify UI.)

To connect your local project to an existing Netlify site, use link

If your site already has continuous deployment set up and you just want to associate a project on your local machine to an existing site on Netlify, use netlify link instead of netlify init or netlify init --manual.

#Automated setup
For repositories stored on GitHub.com, you can use Netlify CLI to connect your repository by running the following command from your local repository:

netlify init

In order to connect your repository for continuous deployment, Netlify CLI will need access to create a deploy key and a webhook on the repository. When you run the command above, you’ll be prompted to log in to your GitHub account, which will create an account-level access token.

The access token will be stored in the Netlify CLI config.json. Your login password will never be stored. You can revoke the access token at any time from your GitHub account settings; however, this will disable continuous deployment on all sites that were configured with that access token.

#Manual setup
For repositories stored on GitLab, Bitbucket, or Azure DevOps, you can connect your repository manually with the --manual flag.

For repositories on GitHub, you can also connect your repository manually, if you prefer to give more limited, repository-only access for your repositories on GitHub.

From your local repository, run the following command:

netlify init --manual

The Netlify CLI will prompt you to set your deploy settings and then provide you with a deploy/access key and a webhook URL. You’ll need to manually add the key and webhook URL to your Git provider.

#Add your deploy or access key
Netlify uses a deploy or access key to fetch your repository using ssh for building and deploying. The deploy key does not require write access.

Sample terminal output reads: 'Give this Netlify SSH public key access to your repository,' and displays a key code.

Copy the key printed in the command line, then add it to your Git provider.

GitHub, GitLab, or Bitbucket. Add the deploy key to your repository’s settings. If you have more than one site connected to a repository, you will need a unique key for each repository.
Azure DevOps. Add the Netlify SSH public key to your Azure DevOps user settings under SSH Public Keys.
#Add your webhook URL
Your Git provider will send a message to this webhook when you push changes to your repository, triggering a new deploy on Netlify.

Sample terminal output reads: 'Configure the following webhook for your repository,' and displays a URL.

Copy the webhook address printed in the command line, then add the URL and webhook details to your Git provider. If available, the Content type should be set to application/json.

GitHub, GitLab, or Bitbucket. Add the webhook address as the Payload URL for a new webhook in your repository’s settings. When selecting events to trigger the webhook, Push events will trigger production and branch deploys on watched branches, and Pull/Merge request events will trigger deploy previews.

Azure DevOps. In your project’s settings under Service hooks, add webhooks for these Azure DevOps events using the Netlify webhook address as the Payload URL:

Code pushed
Pull request created
Pull request merge attempted
Pull request updated
Ensure that you set webhooks for your repository with the default [Any] branch setting. Once configured, these webhook events can trigger production and branch deploys on your watched branches.

#Run a local development environment
Netlify Dev brings the functionality of your Netlify production environment directly to your local machine.

For more information on how to configure and use Netlify Dev, refer to our local development with Netlify Dev doc.

#Run builds locally
You can run builds in Netlify CLI to mimic the behavior of running a build on Netlify — including Build Plugins. To execute a build locally, run the following command from the root of your linked repository:

netlify build

The command will build your project using environment variables set in netlify.toml and those set using the Netlify UI, CLI, or API. Note that environment variables apply to all scopes when running netlify build locally.

Make sure your Node.js versions match

If you are using the Netlify CLI to run a build locally, make sure the Node.js version installed in your local environment matches the version set for your build on Netlify. If the versions don’t match, you may encounter errors.

If you’d like to get a summary of what a build will do without taking the time to do a full build, you can use the --dry flag:

netlify build --dry

This command will output a list of all the stages of the build and the behaviors that are configured to run during each stage.

The default deploy context is production but you can also use the --context flag to run a build for a different deploy context.

netlify build --context deploy-preview

This command will run the build as if it is a Deploy Preview, applying any settings and environment variable values specific to that context.

#Manual deploys
It’s also possible to deploy a site manually, without continuous deployment. This method uploads files directly from your local project directory to your site on Netlify. If builds are stopped, manual deploys are the only way you can update your site.

A common use case for this command is when you’re using a separate Continuous Integration (CI) tool, deploying prebuilt files to Netlify at the end of the CI tool tasks.

To get started with manual deploys, run the following command from your project directory:

netlify deploy

The first time you run the command, Netlify CLI will prompt you to select an existing site or create a new one, linking the site for all future deploys.

The following sections describe the requirements and options for manual deploys.

#Deploy directories
The deploy command needs to know which folder to publish. If your project includes serverless functions, it needs to know the location of the functions folder as well. Netlify CLI will look for this information in three places, in the following order:

in flags specified in the command itself.
in a netlify.toml file stored at the root of your project directory.
in your site configuration in the Netlify UI, if continuous deployment is set up for the site.
Here is an example using command flags to set the publish folder and functions folder:

netlify deploy --dir=_site --functions=functions

In both cases, folder paths are relative to the current directory. Note that paths starting with / will begin at the computer’s root directory — not the base of your project directory.

#Draft deploys
By default, the deploy command deploys to a unique draft URL for previewing and testing.



The default draft URL uses random alphanumeric characters for the subdomain. To customize the subdomain of your draft URL with a unique string, use the --alias flag with the deploy command.

netlify deploy --alias=YOUR_ALIAS



Avoid using --alias with any of your branch names

Ensure the string you use after --alias= doesn’t match any existing branch names from your site’s repository. The --alias flag is designed to support draft deploy URLs only and doesn’t create a branch deploy or support our branch subdomains feature. Learn more about this flag in the CLI reference docs. To create a branch deploy, use continuous deployment.

#Production deploys
To do a production deploy to your main site URL, use the --prod flag (or -p for short):

netlify deploy --prod

#Node.js function dependencies
Before manually deploying TypeScript or JavaScript functions with Netlify CLI, populate node_modules folders with your dependencies by running the following command in any folder containing package.json.

npm command
yarn command
npm install

When you deploy TypeScript or JavaScript functions using the netlify deploy command, Netlify CLI parses each function file to note its dependencies. For each function, the CLI then pulls the required dependencies from the associated node_modules folder and zips them with the function file for deployment.

#Link and unlink sites
If your site isn’t already on Netlify, use init or deploy instead

If your site is not already on Netlify, you need to either set up continuous deployment or manually deploy the site before you can link your local project to it. If you use the Netlify CLI to deploy your site, the CLI will automatically link the project on your local machine to the site on Netlify.

If you want to connect your local project or repository to a site already on Netlify, you can skip the initial setup steps above and run the following command from the root of the local directory:

netlify link

This will add a siteId field to a new file inside your project folder, at .netlify/state.json. To unlink your folder from the site, you can remove this field, or you can run the following command from inside the project folder:

netlify unlink

#Link with an environment variable
Alternatively, you can link to a site by finding the site ID in the Netlify UI, then adding it to your local terminal environment:

Go to Site configuration > General > Site details > Site information, and copy the value for Site ID.
Assign the ID to a NETLIFY_SITE_ID environment variable, in your terminal settings or in the UI of a Continuous Integration (CI) tool.
#Manage environment variables
You can create and update site environment variables stored on Netlify with the CLI’s env command. Any changes made using the CLI will be reflected in the Netlify UI. Environment variable changes require a build and deploy to take effect.

By default, the Netlify CLI deploy context is the local development context (dev). Unless a different deploy context is specified, CLI commands will get and use variables that have values set specifically for use with the dev deploy context and variables that have a single value for use across all deploy contexts.

Use the --context and --scope flags with your CLI commands to set contextual or scope values, or to filter results. You can use both flags in the same command, for example:

netlify env:set API_KEY someValue --scope functions --context production branch-deploy
netlify env:list --scope builds --context deploy-preview

#Create or update environment variables
To create or update a site environment variable on Netlify, use env:set with the key followed by a space and then the value. You can only set one value at a time, but you can specify multiple deploy contexts and scopes in a space-separated list (no commas) using the --context and --scope flags.

netlify env:set API_KEY someValue
netlify env:set ANOTHER_API_KEY someValue --scope builds --context dev

If you omit the --scope or --context flags when running the env:set command, the variable is set to all scopes and with the same value for all deploy contexts.

To set one value for production and deploy-preview and another value for a branch named staging, run the command twice:

netlify env:set API_KEY someValue --context production deploy-preview
netlify env:set API_KEY someOtherValue --context branch:staging

You can also import environment variables from a .env file into Netlify using env:import followed by the filename. The imported variables are set to all scopes and with the same value for all deploy contexts.

netlify env:import .env

To copy environment variables from one site to another, use env:clone.

netlify env:clone --to destinationSiteId --from sourceSiteID

If you are using environment variable secrets with Netlify’s Secrets Controller, you can flag that an environment variable value is secret using the --secret flag when creating or modifying a value.

netlify env:set API_KEY someValue --context production --secret

#Get environment variables
To retrieve a list of site environment variables stored on Netlify, use env:list. The CLI gets all variables that have values set for local development with the Netlify CLI (deploy contexts dev or all) and outputs a list of keys with an option to display their values.

You can request other contextual values using the --context flag and filter the list using the --scope flag. You can also use the --json and --plain flags to retrieve the list in JSON or plain text format, which can be helpful if you want to copy the values into a .env file locally.

The list will only include shared environment variables if the command is run by a Team Owner.

This list will not include raw, unmasked values of any environment variables marked as secret unless the --context is dev. Review the environment variable secrets policy for more details on the access restrictions.

netlify env:list
netlify env:list --context branch:staging
netlify env:list --scope functions
netlify env:list --plain

To retrieve an individual environment variable’s value, use env:get. The CLI gets the values set for local development with the Netlify CLI (deploy contexts dev or all). You can use the --context flag to retrieve a value from another context or the --scope flag to retrieve a value only if the variable is available to a specific scope.

netlify env:get API_KEY
netlify env:get API_KEY --context production

#Delete environment variables
To delete environment variables from Netlify, use env:unset. This command deletes the specified variable and its values from all deploy contexts. Once unset, these variables will no longer be stored on Netlify or appear in the UI. You can use the --context flag to delete one value from a specific deploy context instead.

netlify env:unset API_KEY
netlify env:unset API_KEY --context dev

#Work with monorepos
Commands execute from the workspace root

Starting with Netlify CLI version 16, all commands execute from the workspace root to mimic the build system behavior on Netlify. The workspace root is the directory that contains the highest-level package.json in your monorepo. Make sure any paths declared in netlify.toml are absolute paths relative to the base directory.

A monorepo is a repository that contains multiple sites or apps, each in its own subdirectory.

When you use the Netlify CLI, Netlify automatically scans the repository to detect if you are using a monorepo. If you are, the Netlify CLI will ask you to specify the site to run a command on and you can choose from the list of detected sites.



You also have the option to manually set the following flag:

--filter: to specify which site in your monorepo to use for a command. You can use the package name or the path to the package. This way you can run commands directly from the repository root for all projects in your monorepo.

netlify dev --filter website
netlify dev --filter packages/website

Note that selecting a site with the Netlify CLI only applies to the command you are running and doesn’t influence the build settings in the Netlify UI. Learn more about how to set up a site from a monorepo.

#Print debugging output
To print the full debugging output for a command to the terminal, set the DEBUG variable before running the command.

On Mac OS, Linux, and some common Windows terminals, add DEBUG=* to the beginning of the command:

DEBUG=* netlify deploy

If you are using the Windows command prompt (cmd.exe), use set to set the variable:

set DEBUG=* & netlify deploy

In Windows PowerShell, use $env: to set the variable:

$env:DEBUG='*';netlify deploy

#Get help
To get usage tips and learn more about available commands from within Netlify CLI, run the following:

netlify help

For more information about a specific command, run help with the name of the command.

netlify help deploy

This also works for sub-commands.

netlify help sites:create

If you have additional questions or ideas for new features, you can start an issue on Netlify CLI’s open source repository. You can also visit our Support Forums to start or join a conversation. We’d love to hear from you!

Last updated: February 28, 2025

Local development with Netlify CLI
The Netlify CLI brings the functionality of your Netlify production environment directly to your local machine through the dev command. This CLI functionality is also referred to as Netlify Dev.

When you use Netlify Dev, the CLI provides a proxy server that includes edge logic for custom headers and redirects, environment variables, and Netlify Functions. It automatically detects tools and frameworks like Gatsby, Hugo, Eleventy, Next.js, and more to configure a local development server that mimics the Netlify production environment.

The sections below describe how to get started with Netlify Dev, how to start and share a live development server, how project detection and ports work, and how to customize the configuration.

You can also access the command reference for dev for more information.

#Get started with Netlify Dev
Before you begin, make sure you complete the following if you haven’t already:

Install the Netlify CLI.
Authenticate with an access token.
Link your local project to a Netlify siteID. To do this, set up continuous deployment with netlify init or link an existing Netlify site with netlify link.
To start a local development server for the build tool you’re using, run the following command from the root of your linked repository:

netlify dev

By default, Netlify Dev runs your project using the configuration and environment variables set for local development with the Netlify CLI. For environment variables, that means those with values set for dev or all deploy contexts. You can use the --context flag to run your project with a different deploy context’s settings and variables.

netlify dev --context production

Note that environment variables apply to all scopes when running netlify dev.

To run a shell command within the Netlify Dev environment, use exec:

netlify dev:exec YOUR_SHELL_COMMAND

#Share a live development server
You can run the following command to share your live development server over HTTPS. This creates a tunnel from your local development server over the internet and allows you to share the resulting URL with anyone anywhere in the world.

netlify dev --live

Anyone can access the resulting URL as long as the session is open.

#Project detection
Netlify Dev attempts to detect the site generator or build command that your project uses and run these on your behalf, while adding other development utilities. If you have a JavaScript project, it uses simple heuristics to search for the best package.json script to run for you, so you can use the full flexibility of npm scripts.

You also have the option to override framework detection, if needed.

Override framework detection
#Project ports
When you use Netlify Dev, you may encounter a few different ports — especially if your project uses a static site generator that has its own dev server, like Gatsby. Keep the following in mind when working with Netlify Dev:

If your project uses a framework that we can detect, Netlify Dev will use the framework’s conventional ports, so you don’t have to supply them yourself. If multiple detectors match your project, we’ll ask you to choose.
If your site generator runs on a specific port, such as port 8000, you need to specify the port when you run netlify dev. Netlify Dev will connect to that port and route requests successfully to the site generator along with the rest of the local Netlify environment.
If you use an unrecognized site generator or framework, or have a server you want Netlify Dev to connect to, you need to specify the port when you run netlify dev.
To confirm which port to use for local development with Netlify Dev, search for this box in your console output:

   ┌──────────────────────────────────────────────────────────────┐
   │                                                              │
   │   [Netlify Dev] Server now ready on http://localhost:8888    │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘

#Configuration
Netlify Dev works without configuration for the majority of users, but you can customize Netlify Dev settings in the [dev] section of the Netlify configuration file. The following sections outline some common configuration options.

For a full list of the available properties, refer to the Netlify Dev section of our file-based configuration doc.

#Run an https server for local development
By default, netlify dev starts an HTTP server. If you require HTTPS, you can configure a certificate and key file for use by netlify dev in your netlify.toml:

[dev]
  [dev.https]
    certFile = "cert.pem"
    keyFile = "key.pem"

Self-signed certificates require extra configuration

If you’re using a self-signed certificate, you might need to configure your browser to accept it when running on localhost. To enable this setting for Chrome, visit chrome://flags/#allow-insecure-localhost in your browser.

#Specify custom ports for Netlify Dev
Netlify Dev allows you to specify custom ports using the following parameters as flags or in a Netlify configuration file (netlify.toml):

targetPort: the port for your application server, framework, or site generator
port: the port for the Netlify Dev server that you will open in the browser
Netlify Dev tries to acquire these ports but if they are already in use by another application, it will throw an error and let you know.

[dev]
  targetPort = 3000
  port = 8888

#More Netlify Dev resources
Command reference for dev
Configuration properties for Netlify Dev in netlify.toml
Use Netlify CLI with monorepos
Manage Functions with Netlify CLI
Last updated: March 27, 2024

Manage functions with Netlify CLI
The Netlify CLI offers the ability to create, serve, and test Netlify Functions locally. Once you create a serverless function, you have the option to invoke the function in a local development environment using Netlify Dev, or to invoke the functions with a local standalone server.

To learn about all of the options available, review the command reference for functions.

#Create serverless functions with Netlify Dev
Netlify can create serverless functions for you locally as part of Netlify Functions with the functions:create command:

netlify functions:create

Follow the CLI prompts to select from a number of function templates that are available to get you started. You can also add your own utility functions to suit your project development needs.

# Create a new function from one of the available templates offered
# when prompted
$ netlify functions:create

# Create a new function with a given name using either of the
# following options
$ netlify functions:create hello-world
$ netlify functions:create --name hello-world

# Create a new function by cloning a template from a remote url
# organised with dependencies installed into a subdirectory
$ netlify functions:create hello-world --url https://my-remote-template-URL

Git ignore the node_modules folder

If your functions have node_modules in each function folder, make sure to add them to your .gitignore file. Don’t forget to add bash scripts to install the dependencies for production.

#Deploy unbundled function folders
When a function has node_modules in its own folder, these packages need to be installed during deployment. The Netlify build system does not recursively install dependencies for your function folders but you can write prebuild or postinstall bash scripts to install them for production.

#Invoke functions while running Netlify Dev
Use netlify dev to start a local development environment and Netlify Dev will run the functions as they would run in the Netlify production environment.

To get started, configure the functions directory in your netlify.toml and then run netlify dev.

The functions will be accessible at http://localhost:8888/.netlify/functions/function-name in the browser. Accessing the function through the browser simulates a GET request but you can also use netlify functions:invoke to test other requests. For example, the CLI also models POST requests.

You can use netlify functions: list to get a list of all detected functions.

If you run functions in your local environment with Netlify Dev, you can then test sending payloads of data or authentication payloads:

netlify functions:invoke # we will prompt you at each step
netlify functions:invoke myfunction # invoke a specific function
netlify functions:invoke --name myfunction # invoke a specific function

# sending payloads
netlify functions:invoke myfunction --payload '{"count": 1}'
netlify functions:invoke myfunction --querystring "count=1"
netlify functions:invoke myfunction --payload "./pathTo.json"

There are special cases for event-triggered functions that will also provide mock data for testing. This makes it possible to manually test event-triggered functions locally and improves the development experience.

#Serve functions with a standalone server locally
While Netlify Dev will simulate the Netlify production environment, it can be useful to simulate Netlify Functions in a standalone server instead. If you serve functions with a standalone server, you can debug functions without the overhead of starting a framework server.

To start a functions server locally, run netlify functions:serve. Your function will be available at http://localhost:9999/.netlify/functions/<function-name>

If you configure a functions directory, the server will serve functions from that directory. If not, the server will serve functions from netlify/functions. The default port for the functions server is 9999.

To override these settings, use the --functions and --port flags:

netlify functions:serve --functions <path-to-dir> --port <port>

You can also configure the settings in a netlify.toml, under the dev block:

[dev]
  functions = "netlify-functions"
  functionsPort = 7000

#Debug functions locally
Netlify CLI uses Lambda-local to simulate serverless functions. Since the CLI invokes functions in the same process as the functions server, you can debug functions by inspecting the functions server process.

To debug, set the --inspect Node.js option when starting the functions server:

On Windows, run cmd /V /C "set NODE_OPTIONS=--inspect && netlify functions:serve"
On Mac/Linux, run NODE_OPTIONS=--inspect netlify functions:serve
Then, attach any Node.js debugger to the CLI process to debug your functions. To learn how to debug with Visual Studio Code while running the Netlify CLI, review Debug with VS Code.


Debug with VS Code and Netlify CLI
You can use the VS Code debugger while you run your project with the Netlify CLI. This document outlines how to configure VS Code and how to launch the debugger.

#Create a configuration file
Create a launch.json file under a .vscode directory in your project with the following content.

{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "netlify dev",
      "type": "node",
      "request": "launch",
      "skipFiles": ["<node_internals>/**"],
      "outFiles": ["${workspaceFolder}/.netlify/functions-serve/**/*.js"],
      "program": "${workspaceFolder}/node_modules/.bin/netlify",
      "args": ["dev"],
      "console": "integratedTerminal",
      "env": { "BROWSER": "none" },
      "serverReadyAction": {
        "pattern": "Server now ready on (https?://[\\w:.-]+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    },
    {
      "name": "netlify functions:serve",
      "type": "node",
      "request": "launch",
      "skipFiles": ["<node_internals>/**"],
      "outFiles": ["${workspaceFolder}/.netlify/functions-serve/**/*.js"],
      "program": "${workspaceFolder}/node_modules/.bin/netlify",
      "args": ["functions:serve"],
      "console": "integratedTerminal"
    }
  ]
}

#Launch the debugger
After you create the configuration file, launch the debugger:

Select Run and Debug from the VS Code sidebar. To reduce noise, we recommend that you deactivate Caught Exceptions.
In the top menu, select the command to run — either netlify dev or netlify functions:serve
Run the debugger.
If you select netlify dev, the CLI will start a local development environment and open a browser with the site URL. If you select netlify functions:serve, the CLI will start a standalone Netlify Functions server.

#Debug functions
Use the --inspect Node.js option to debug functions. Visit managing functions for more information.

