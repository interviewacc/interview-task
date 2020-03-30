# Interview task

## Build project
To build the project you need to execute `npm run build`. This command compile all typescript sources and store js files into `dist` folder.
Also it runs eslint to check code quality

## MongoDB
To run mongoDB locally you need to have [docker & docker-compose.](https://www.docker.com)
Run `docker-compose up` to start mongodb process.

## Upload data
To upload data to database you need to run `npm run upload`.
Source is store in upload.ts file

## Test data
To test data and generate report you need to run `npm run report`.
It generates test-result.csv in the root of the project