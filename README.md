# Description

The app helps users plan the most efficient order for visiting all desired destinations using the modified TSP algorithm. Optional constraints, such as a location must be visited before another location can be added. The shortest path between pairs is computed using the Google Maps API.


# Architecture
Our application is a microservice application runs on Amazon EKS, which offers a managed Kubernetes service. 

Scaling a Kubernetes control plane in conjunction with EKS. The number of EC2 instances (nodes) in the cluster automatically scales based on the demand  (CPU or memory utilization). 

The architecture is also managed by Terraform (to be done.)

## Tech stack
- Go
- Docker
- K8s/EKS (to be done)
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

## With Docker Compose
You need to first set the environment variable REACT_APP_GOOGLE_MAPS_API_KEY
```
export REACT_APP_GOOGLE_MAPS_API_KEY='something_here'
```
Then run docker compose to start
```
docker compose up
```





