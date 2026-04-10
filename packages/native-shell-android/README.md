# SelfSDK — Android Native Shell

## Installation

Add the GitHub Packages repository and dependency to your project:

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://maven.pkg.github.com/selfxyz/self")
            credentials {
                username = providers.gradleProperty("gpr.user").orNull
                password = providers.gradleProperty("gpr.token").orNull
            }
        }
    }
}

// app/build.gradle.kts
dependencies {
    implementation("xyz.self.sdk:native-shell-android:0.1.0")
}
```

Add your GitHub credentials to `~/.gradle/gradle.properties`:

```properties
gpr.user=YOUR_GITHUB_USERNAME
gpr.token=YOUR_GITHUB_TOKEN
```

The token needs `read:packages` scope. Generate one at https://github.com/settings/tokens.

## Requirements

- Android API 24+ (minSdk)
- Java 17
- Kotlin 1.9+
