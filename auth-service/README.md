# Authentication-Service

## Introduction

Welcome to the authentication service. The project was bootstrapped using **Node.js** and **Typescript**. This is where all the code related to authentication service is housed. <br />

## Prerequisites

Make sure you have the following software installed on your development machine:<br />

- **Git (latest version)**
- **Node (atleast version 16)**
- **npm (latest version)**

## Get Started

- [Define Environment Variables](#Define-Environment-Variables)
- [Install Dependencies](#Install-Dependencies)
- [Make edits/changes and have your code update on save](#Make-edits/changes-and-have-your-code-update-on-save)
- [OpenApi Documentation](#OpenApi-Documentation)
- [Branching Strategy](#Branching-strategy)

### Define Environment Variables

This service uses **MongoDB** as its database. Hence we need to provide some **environment variables** for our service to properly connect to the database. <br />

- Fork the monorepo. Learn how to do it [here](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
- In the project directory **(task-application/auth-service)**, Create an .env file with the following environment variable names:

  - **DATABASE:** (Provide a mongodb connection string atlasConnectionString) -> Register for free sunscription here: [https://www.mongodb.com/cloud](https://www.mongodb.com/cloud)
  - **JWT:** (provide any string value for example: "asdf")
  - **NODE_ENV:**development (**NOTE:** Keep this value as `development` as production values are defined in kubernetes cluster)

### Install Dependencies

In the project directory run the following command:<br />

`npm install`

### Make edits/changes and have your code update on save

In the project directory run the following command:<br />

`npm start`

Your application is listening for traffic on [http://localhost:5000](http://localhost:5000).<br />
Your application will automatically restart when you save your changes/edits.<br />

### OpenApi Documentation

To run OpenApi documentation for the authentication microservice: <br />

- go to the url: `localhost/api/users/auth-docs`

I recommned you play around with the application by creating or deleteing users to get an idea of what kind of data we are dealing with.<br />

## Branching Strategy

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
