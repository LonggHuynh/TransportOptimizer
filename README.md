## Description

The app helps users plan the most efficient order for visiting all desired destinations using the modified [TSP](https://developers.google.com/maps/documentation/javascript/get-api-key) algorithm. Optional constraints, such as a location must be visited before another location can be added, can also be included. The shortest path between pairs is computed using the Google Maps API.

## Installation

```bash
$ npm ci
```

## Running the app
### Enviroment variables.

| Variable Name           | Description                                                                                                 |
|-------------------------|-------------------------------------------------------------------------------------------------------------|
| REACT_APP_GOOGLE_MAPS_API_KEY            | The API of Google Maps API. [See.](https://developers.google.com/maps/documentation/javascript/get-api-key) |

### Run
```bash
$ npm start
```
