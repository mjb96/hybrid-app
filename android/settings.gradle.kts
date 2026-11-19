pluginManagement {
    repositories {
        google()
        // Maven Central's CDN rate-limits shared GitHub-hosted runner IPs (429).
        // Google's read-only mirror fronts the same artifacts; mavenCentral()
        // stays as the fallback for anything the mirror has not picked up.
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
    }
}

rootProject.name = "OpenHybrid"
include(":app")
