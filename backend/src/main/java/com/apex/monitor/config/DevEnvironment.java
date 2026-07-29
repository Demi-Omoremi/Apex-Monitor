package com.apex.monitor.config;

import java.nio.file.Path;

/**
 * Dev-only helpers invoked from {@link com.apex.monitor.MonitorApplication#main}
 * before Spring Boot starts.
 */
public final class DevEnvironment {

    private DevEnvironment() {
    }

    public static void resetDockerIfRequested() {
        if (!isResetEnabled()) {
            return;
        }

        Path composeDir = resolveComposeDirectory();
        if (!composeDir.resolve("docker-compose.yml").toFile().exists()) {
            System.err.println("Skipping Docker reset — docker-compose.yml not found at " + composeDir);
            return;
        }

        try {
            System.out.println("Resetting Docker (down -v, up -d)...");
            runCommand(composeDir, "docker", "compose", "down", "-v");
            runCommand(composeDir, "docker", "compose", "up", "-d");
            System.out.println("Waiting for Postgres and Kafka to start...");
            Thread.sleep(8_000);
            System.out.println("Docker reset complete.");
        } catch (Exception e) {
            System.err.println("Docker reset failed: " + e.getMessage());
            System.err.println("Start containers manually: docker compose up -d");
        }
    }

    private static boolean isResetEnabled() {
        String env = System.getenv("APEX_RESET_DOCKER");
        if ("true".equalsIgnoreCase(env)) {
            return true;
        }
        return "true".equalsIgnoreCase(System.getProperty("apex.reset-docker"));
    }

    private static Path resolveComposeDirectory() {
        Path cwd = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        if ("backend".equalsIgnoreCase(String.valueOf(cwd.getFileName()))) {
            return cwd.getParent();
        }
        return cwd;
    }

    private static void runCommand(Path directory, String... command) throws Exception {
        Process process = new ProcessBuilder(command)
                .directory(directory.toFile())
                .inheritIO()
                .start();
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new IllegalStateException("Command failed (" + exitCode + "): " + String.join(" ", command));
        }
    }
}
