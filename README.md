Mobile Application

A mobile application project built with React Native and Expo, consisting of three independent modules for data generation, UI development, and mobile application implementation.
Project Overview

This repository contains three main subprojects:
Directory	Description
api/	Generates static JSON files used as the application's data source.
app/	Main mobile application built with React Native and Expo.
ui/	Develops UI components and exports them as a combined HTML file for React Native integration.
Project Structure
text

project-root/
│
├── api/
│   └── README.md
│
├── app/
│   └── README.md
│
├── ui/
│   └── README.md
│
├── .gitignore
└── README.md

Architecture & Workflow

The project consists of three interconnected modules:
1. API (/api)

Responsible for preparing and generating static JSON files.

    Generates structured JSON data.
    Organizes application data.
    Provides the data required by the mobile application.

2. UI (/ui)

Responsible for developing and generating the application's HTML-based user interface.

    Develops UI components using TypeScript and JavaScript.
    Exports individual components into HTML files.
    Combines generated HTML files into a single HTML file.
    Prepares the final HTML output for React Native integration.

3. App (/app)

The main mobile application built using React Native and Expo.

    Implements the mobile application.
    Integrates the generated JSON data.
    Integrates the generated HTML-based UI.
    Handles application functionality and navigation.

Technologies Used

    React Native – Mobile application development.
    Expo – React Native development framework.
    TypeScript – Type-safe development.
    JavaScript – Application logic and scripting.
    Node.js – Development tools and data generation.
    HTML – UI component output.
    JSON – Structured application data.

Getting Started

Each subproject has its own dependencies, configuration, and execution instructions.

Refer to the corresponding documentation before working with a specific module:

    API Documentation
    App Documentation
    UI Documentation

Development Workflow

The general development workflow is:

    Prepare or update application data using the api module.
    Develop and modify UI components using the ui module.
    Generate the combined HTML output.
    Integrate the generated data and UI into the app module.
    Run and test the mobile application using Expo.

Documentation

For detailed setup instructions, dependencies, commands, and implementation details, refer to the README file inside each subproject.
License

This project is licensed under the MIT License unless otherwise specified.