# study-plan-visualize

Hey! Welcome, this is a microservices app for creating a customised study plan and tracking your learning progress.

# Getting Started with Study-Plan-Visualize

## Requirements

- **NGINX Ingress Controller** [https://kubernetes.github.io/ingress-nginx/]
- **Skaffold** [https://skaffold.dev/docs/install/#standalone-binary](https://skaffold.dev/docs/install/#standalone-binary)
- **Docker** [https://www.docker.com/get-started](http://www.docker.com/get-started)
- Have **Kubernetes** enabled inside **Docker**

## First Time Setup

Make sure to run the following command for NGINX Ingress Preflight checks:

`kubectl get pods --namespace=ingress-nginx`

### Define Environment Variables

- Fork the monorepo. Learn how to do it [here](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
- Open your terminal/command line of choice and navigate to the root of the project.
- Run the following commands in the CLI (This will create environment variables inside kubernetes):
  - `kubectl create secret generic jwtkey --from-literal JWTKEY=PLACE_ANY_STRING_HERE_EXAMPLE=QWERTY`
  - `kubectl create secret generic skill-mongodb-uri --from-literal URI=YOUR_MONGODB_CONNECTION_STRING`
  - `kubectl create secret generic resource-mongodb-uri --from-literal URI=YOUR_MONGODB_CONNECTION_STRING`
  - `kubectl create secret generic auth-mongodb-uri --from-literal URI=YOUR_MONGODB_CONNECTION_STRING`

Provide a mongodb connection string (atlasConnectionString): Register for free subscription here: [https://www.mongodb.com/cloud](https://www.mongodb.com/cloud)

## Running Development ENV

In the root of your project run `skaffold dev` to run Development Environment.

The client should be running on localhost, and your backend services should be running in kubernetes

## Open Api Documentation

In order to check the Docs for Each API, please go into the src/index.ts to get the relative url to the root and append it after localhost

**_Example:_**

- `/api/skills/skill-docs` will become `localhost/api/skills/skill-docs`

### Branching Strategy

Our base branch that everything comes from is called `main`. All branches originate from the `main` branch. <br />

### Workflow for new feature branch

- Fork the repo on github
- Create new branch (`git checkout -b feature/[feature-name]`)
- Add changes (`git status` to see changes, `git add .` to add all changes)
- Commit changes (`git commit -m 'commit message'`)
- Push to Github (`git push origin feature/[feature-name]`)

### Workflow for hotfix/bugs

- Fork the repo on github
- Create new hotfix/bug branch (`git checkout -b hotfix/[hotfix-name]`)
- Add changes (`git status` to see changes, `git add .` to add all changes)
- Commit changes (`git commit -m 'commit message'`)
- Push to Github (`git push origin hotfix/[hotfix-name]`)

**HAPPY CODING!!!**
