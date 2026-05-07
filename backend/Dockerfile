# ── Stage 1: Build ──
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src

# Install Maven
RUN apk add --no-cache maven

# Build the JAR (skip tests for faster deploy)
RUN mvn clean package -DskipTests

# ── Stage 2: Run ──
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/wealthwise-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
