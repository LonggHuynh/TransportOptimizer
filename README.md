# Description

The app helps users plan the most efficient order for visiting all desired destinations using the modified TSP algorithm. Optional constraints, such as a location must be visited before another location can be added. The shortest path between pairs is computed using the Google Maps API.## Tech stack

- Go
- Docker
- K8s/Terraform/EKS (to be done)
- ReactJS (Hooks, Routers, Redux)





# Run locally
## Front end 
```
cd frontend
npm install
npm start
```
### Environment variables

| Variable Name           | Description                                                                                                 |
|-------------------------|-------------------------------------------------------------------------------------------------------------|
| REACT_APP_SERVER_URL            | URL of the backend |
| REACT_APP_GOOGLE_MAPS_API_KEY            | Google Maps API |



## Back end 
Running go server with

```
cd backend
go build -o main
./main
```
The server starts at port 8080.

# Deploy in production mode
Under construction



