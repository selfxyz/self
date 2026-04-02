import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.androidLibrary)
    `maven-publish`
}

group = "xyz.self.sdk"
version = "0.1.0"

kotlin {
    jvm() // For unit tests on host

    androidTarget {
        publishLibraryVariants("release")
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }

    iosArm64()
    iosSimulatorArm64()

    // Configure iOS framework for SPM distribution
    listOf(iosArm64(), iosSimulatorArm64()).forEach { target ->
        target.apply {
            binaries.framework {
                baseName = "SelfSdk"
                isStatic = true
            }

            // NOTE: cinterop configuration is disabled due to Xcode SDK compatibility issues
            // iOS handlers currently have stub implementations that throw NotImplementedError
            // To enable full iOS functionality:
            // 1. Fix cinterop compilation issues (may require Xcode/Kotlin version updates)
            // 2. Implement native iOS handlers using platform APIs
            // 3. Consider creating Objective-C/Swift wrappers for complex operations (NFC, Crypto)
            //
            // Uncomment below to enable cinterop (once SDK issues are resolved):

            /*
            compilations.getByName("main") {
                cinterops {
                    create("CoreNFC") {
                        defFile(project.file("src/nativeInterop/cinterop/CoreNFC.def"))
                    }
                    create("LocalAuthentication") {
                        defFile(project.file("src/nativeInterop/cinterop/LocalAuthentication.def"))
                    }
                    create("Security") {
                        defFile(project.file("src/nativeInterop/cinterop/Security.def"))
                    }
                    create("Vision") {
                        defFile(project.file("src/nativeInterop/cinterop/Vision.def"))
                    }
                    create("UIKit") {
                        defFile(project.file("src/nativeInterop/cinterop/UIKit.def"))
                    }
                }
            }
             */
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.serialization.json)
        }
        commonTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.kotlinx.coroutines.test)
        }
        androidMain.dependencies {
            // WebView
            implementation("androidx.webkit:webkit:1.12.1")
            // Encrypted storage (default SecureStorageProvider)
            implementation("androidx.security:security-crypto:1.1.0-alpha06")
            // Activity / Lifecycle
            implementation("androidx.appcompat:appcompat:1.7.0")
            implementation("androidx.activity:activity-ktx:1.9.3")
            implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
            // Retained handler dependencies (not registered in 3-domain scope, but kept for future use)
            implementation("org.jmrtd:jmrtd:0.8.1")
            implementation("net.sf.scuba:scuba-sc-android:0.0.18")
            implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
            implementation("commons-io:commons-io:2.14.0")
            implementation("androidx.biometric:biometric:1.2.0-alpha05")
            implementation("com.google.mlkit:text-recognition:16.0.1")
            implementation("androidx.camera:camera-core:1.4.1")
            implementation("androidx.camera:camera-camera2:1.4.1")
            implementation("androidx.camera:camera-lifecycle:1.4.1")
            implementation("androidx.camera:camera-view:1.4.1")
        }
    }
}

android {
    namespace = "xyz.self.sdk"
    compileSdk =
        libs.versions.android.compileSdk
            .get()
            .toInt()
    defaultConfig {
        minSdk =
            libs.versions.android.minSdk
                .get()
                .toInt()
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // Configure assets directory
    sourceSets["main"].assets.srcDirs("src/main/assets")
}

// Task to copy WebView app bundle into SDK assets
tasks.register<Copy>("copyWebViewAssets") {
    description = "Copies WebView app bundle from packages/webview-app/dist to SDK assets"
    group = "build"

    // Source: Person 1's Vite build output
    from("../../webview-app/dist") {
        include("**/*")
    }

    // Destination: Android assets directory
    into("src/main/assets/self-wallet")

    // Only copy if source exists (development mode might not have built assets yet)
    onlyIf {
        file("../../webview-app/dist").exists()
    }
}

// Make preBuild depend on copying assets (so assets are always up-to-date)
tasks.named("preBuild") {
    dependsOn("copyWebViewAssets")
}

// iOS XCFramework task
tasks.register("createXCFramework") {
    group = "build"
    description = "Creates XCFramework for iOS distribution"

    dependsOn(
        ":shared:linkDebugFrameworkIosArm64",
        ":shared:linkDebugFrameworkIosSimulatorArm64",
    )

    doLast {
        val buildDir = layout.buildDirectory.get().asFile
        val frameworkPath = "$buildDir/bin/iosArm64/debugFramework/SelfSdk.framework"
        val simulatorFrameworkPath = "$buildDir/bin/iosSimulatorArm64/debugFramework/SelfSdk.framework"
        val xcframeworkPath = "$buildDir/xcframework/SelfSdk.xcframework"

        project.exec {
            commandLine(
                "xcodebuild",
                "-create-xcframework",
                "-framework",
                frameworkPath,
                "-framework",
                simulatorFrameworkPath,
                "-output",
                xcframeworkPath,
            )
        }

        println("✅ XCFramework created at: $xcframeworkPath")
    }
}
