plugins {
    java
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
    id("org.openapi.generator") version "7.23.0"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.1")

    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

openApiValidate {
    inputSpec.set("$projectDir/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml")
}

openApiGenerate {
    generatorName.set("spring")
    library.set("spring-boot")
    inputSpec.set("$projectDir/src/main/resources/openapi/GiftMate_API_Contract_v1.yaml")
    outputDir.set("$projectDir/build/generated")
    apiPackage.set("com.example.backend.api")
    modelPackage.set("com.example.backend.api.model")
    invokerPackage.set("com.example.backend.api")
    configOptions.set(mapOf(
        "interfaceOnly" to "true",
        "useSpringBoot4" to "true",
        "useJackson3" to "true",
        "useTags" to "true",
        "useBeanValidation" to "true",
        "dateLibrary" to "java8",
        "serializationLibrary" to "jackson",
        "hideGenerationTimestamp" to "true",
        "openApiNullable" to "false"
    ))
}

sourceSets {
    main {
        java {
            srcDir("$projectDir/build/generated/src/main/java")
        }
    }
}

tasks.withType<JavaCompile> {
    dependsOn("openApiGenerate")
}


tasks.register<org.openapitools.generator.gradle.plugin.tasks.GenerateTask>("generateMobileApi") {
    generatorName.set("typescript-fetch")
    inputSpec.set(openApiGenerate.inputSpec)
    outputDir.set(layout.buildDirectory.dir("generated-mobile-api").get().asFile.absolutePath)
    additionalProperties.set(mapOf("modelPropertyNaming" to "original"))
}
