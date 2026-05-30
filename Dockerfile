# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /workspace
COPY pom.xml mvnw ./
COPY .mvn .mvn
COPY src ./src
RUN chmod +x mvnw
RUN ./mvnw -B -Dmaven.test.skip=true package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl tzdata
COPY --from=builder /workspace/target/commentbox-api-0.0.1-SNAPSHOT.jar app.jar
ENV JAVA_OPTS="-Xms64m -Xmx256m -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8085/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dspring.profiles.active=prod -jar /app/app.jar"]
