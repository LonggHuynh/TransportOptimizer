# Stage 1: Build
FROM golang:1.16-buster AS builder

WORKDIR /app

COPY . .

RUN go build -o main .



# Stage 2: Deploy
FROM debian:buster-slim

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
